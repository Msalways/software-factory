const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process');
const S = require('./slice-receipt.cjs');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice-receipt-'));
const legacy = () => {
  const file = path.join(dir, Math.random() + '.json');
  fs.writeFileSync(file, JSON.stringify({slice: 'synthetic', decidedAt: new Date().toISOString(),
    choice: {engine: 'planned-engine', model: 'planned-model', effort: {requested: 'requested-effort'}}}));
  return file;
};
test('legacy receipts load without mutation, keeping planned separate from actual and unknown usage null', () => {
  const file = legacy(), before = fs.readFileSync(file, 'utf8'), r = S.load(file);
  assert.equal(r.planned.model, 'planned-model');
  assert.deepEqual(r.actual, {engine: null, model: null, effort: null, confirmedBy: 'unconfirmed'});
  assert.deepEqual(r.usage, {inputTokens: null, outputTokens: null, promptBytes: null, source: 'unreported'});
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});
test('reported execution and partial usage require provenance and never inherit planned values', () => {
  const file = legacy();
  assert.throws(() => S.update(file, 'report', {source: 'planned', reference: 'intent', actual: {engine: 'x', model: 'y'}}), /source/);
  const r = S.update(file, 'report', {source: 'engine', reference: 'captured/session/event',
    actual: {engine: 'executed-engine', model: 'executed-model'}, usage: {inputTokens: 17}});
  assert.equal(r.actual.engine, 'executed-engine'); assert.equal(r.actual.effort, null);
  assert.equal(r.planned.model, 'planned-model'); assert.equal(r.actual.confirmedBy, 'engine:captured/session/event');
  assert.equal(r.usage.inputTokens, 17); assert.equal(r.usage.outputTokens, null);
  assert.equal(r.usage.sources.outputTokens, 'unreported');
  assert.throws(() => S.update(file, 'report', {source: 'hattera', reference: 'usage/row', usage: {inputTokens: 0}}), /positive/);
  assert.equal(S.load(file).usage.inputTokens, 17, 'invalid report did not overwrite confirmed usage');
});
test('counters increment and escalations require a classified reason and note', () => {
  const file = legacy();
  S.update(file, 'handoff'); S.update(file, 'handoff'); S.update(file, 'mentor');
  for (const p of [{fromTier:'a',toTier:'b'}, {fromTier:'a',toTier:'b',reason:'guess',note:'why'}, {fromTier:'a',toTier:'b',reason:'other'}])
    assert.throws(() => S.update(file, 'escalate', p), /escalation requires/);
  const r = S.update(file, 'escalate', {fromTier: 'worker', toTier: 'premium', reason: 'check-failed-twice', note: 'Two failing acceptance logs linked in brief.'});
  assert.equal(r.handoffs, 2); assert.equal(r.mentorQuestions, 1);
  assert.equal(r.escalations.length, 1); assert.ok(r.escalations[0].at);
});
test('close is terminal and concurrent mutation locks cannot lose updates', () => {
  const file = legacy(); fs.writeFileSync(file + '.lock', '');
  assert.throws(() => S.update(file, 'handoff'), /EEXIST/);
  fs.unlinkSync(file + '.lock');
  assert.throws(() => S.update(file, 'close', 'unknown'), /invalid receipt outcome/);
  const r = S.update(file, 'close', 'passed'); assert.equal(r.outcome, 'passed'); assert.ok(r.timestamps.closedAt);
  assert.throws(() => S.update(file, 'close', 'failed'), /already closed/);
  assert.throws(() => S.update(file, 'mentor'), /already closed/);
  assert.equal(S.load(file).outcome, 'passed');
});
test('real CLI loads legacy receipt, increments counters and closes exactly once', () => {
  const file = legacy();
  const run = (...args) => cp.spawnSync(process.execPath, [path.join(__dirname,'factory-route.cjs'), 'receipt', file, ...args], {encoding:'utf8'});
  assert.equal(JSON.parse(run('show').stdout).actual.confirmedBy, 'unconfirmed');
  assert.equal(JSON.parse(run('handoff').stdout).handoffs, 1);
  assert.equal(run('close', 'split').status, 0);
  assert.equal(run('close', 'passed').status, 2);
});
test('new route receipts persist full intent schema while execution remains unconfirmed', () => {
  process.env.FACTORY_STATE_DIR = path.join(dir,'state'); process.env.FACTORY_HATTERA_HOME = path.join(dir,'home');
  const R = require('./factory-route.cjs');
  const r = R.route({slice: 'new-slice',workKind:'arbitrary-kind'}, {snapshot:{engines:[]}});
  const saved = S.load(r.file);
  assert.equal(saved.planned.workKind, 'arbitrary-kind'); assert.equal(saved.planned.engine, null);
  assert.equal(saved.actual.confirmedBy, 'unconfirmed'); assert.equal(saved.usage.inputTokens, null);
  assert.equal(saved.timestamps.createdAt, saved.decidedAt);
  const now = Date.now;
  try {
    Date.now = () => 1;
    const a = R.route({slice:'same'}, {snapshot:{engines:[]}});
    const b = R.route({slice:'same'}, {snapshot:{engines:[]}});
    assert.notEqual(a.file,b.file,'simultaneous attempts cannot overwrite a receipt');
    assert.ok(fs.existsSync(a.file) && fs.existsSync(b.file));
  } finally { Date.now = now; }
});
