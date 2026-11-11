const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');

// isolated fake Hattera home + state dir; the module reads env at load time
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hh-')), state = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
process.env.FACTORY_HATTERA_HOME = home; process.env.FACTORY_STATE_DIR = state;
fs.mkdirSync(path.join(home, 'providers/engine-models'), {recursive: true}); fs.mkdirSync(path.join(home, 'usage'));
fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify({instances: {alpha: {driverKind: 'a'}, beta: {driverKind: 'b'}}}));
fs.writeFileSync(path.join(home, 'providers/engine-models/alpha.json'), JSON.stringify({default: 'a-pro', options: [{id: 'a-pro', label: 'A Pro'}, {id: 'a-mini', label: 'A Mini'}]}));
fs.writeFileSync(path.join(home, 'providers/engine-models/beta.json'), JSON.stringify({default: 'b-zen-free', options: [{id: 'b-zen-free', label: 'Zen Free', contextWindow: 32000}, {id: 'b-other', label: 'Other'}]}));
const at = new Date().toISOString();
fs.writeFileSync(path.join(home, 'usage/2026-11.jsonl'), [
  {instanceId: 'alpha', model: 'a-pro', input: 10, output: 5, at},
  {instanceId: 'beta', model: 'b-gone-free', input: 1, output: 1, at},
].map(x => JSON.stringify(x)).join('\n'));
const R = require('./factory-route.cjs');
const outcome = (e, m, c, r) => fs.appendFileSync(R.P.outcomes, JSON.stringify({engine: e, model: m, complexity: c, result: r}) + '\n');

test('classify recognises limit, too-big, transient and broken signals', () => {
  assert.equal(R.classify("You've hit your usage limit. Try again at 5pm").class, 'limit');
  assert.equal(R.classify('Error 429 Too Many Requests').class, 'limit');
  assert.equal(R.classify('Room stopped: no activity for 20 minutes').class, 'too-big');
  assert.equal(R.classify('ACP Internal service failure').class, 'transient');
  assert.equal(R.classify('model not found: x').class, 'broken');
  assert.equal(R.classify('all tests passed').class, null);
});

test('supply marks withdrawn models and engine-reported free price', () => {
  const s = R.supply();
  const beta = s.engines.find(e => e.id === 'beta');
  assert.equal(beta.models.find(m => m.id === 'b-zen-free').priceReported, 'free');
  assert.equal(beta.models.find(m => m.id === 'b-other').priceReported, 'unknown');
  assert.equal(beta.models.find(m => m.id === 'b-gone-free').withdrawnFromCatalog, true);
});

test('low complexity prefers free unproven model; withdrawn model rejected', () => {
  const r = R.route({slice: 's1', complexity: 'low'});
  assert.equal(`${r.choice.engine}/${r.choice.model}`, 'beta/b-zen-free');
  assert.ok(r.rejected.some(x => x.candidate === 'beta/b-gone-free' && /no longer in engine catalog/.test(x.reason)));
  assert.ok(fs.existsSync(r.file));
});

test('high complexity routes only to proven models once any exist; failures disqualify', () => {
  outcome('alpha', 'a-pro', 'high', 'ok'); outcome('alpha', 'a-pro', 'high', 'ok');
  outcome('beta', 'b-zen-free', 'high', 'broken'); outcome('beta', 'b-zen-free', 'high', 'broken');
  const r = R.route({slice: 's2', complexity: 'high'});
  assert.equal(`${r.choice.engine}/${r.choice.model}`, 'alpha/a-pro');
  assert.ok(r.rejected.some(x => x.candidate === 'beta/b-zen-free' && /not capable/.test(x.reason)));
});

test('active limit excludes engine and falls back; verifier must use a different engine', () => {
  R.recordLimit('alpha', null, 'hit your usage limit', new Date(Date.now() + 3600e3).toISOString());
  const r = R.route({slice: 's3', complexity: 'low'});
  assert.ok(r.choice.engine !== 'alpha');
  assert.ok(r.rejected.some(x => x.candidate.startsWith('alpha/') && /limit active/.test(x.reason)));
  const v = R.route({slice: 's3v', complexity: 'low'}, {notEngine: 'beta'});
  assert.equal(v.choice, null); // alpha limited, beta is builder's engine -> waiting-for-quota
  assert.match(v.reason, /no candidate/);
});

test('context need filters models with known smaller windows', () => {
  const r = R.route({slice: 's4', complexity: 'low', needs: {contextTokens: 100000}});
  assert.ok(r.rejected.some(x => x.candidate === 'beta/b-zen-free' && /context/.test(x.reason)));
});

test('cold start for high complexity prefers routes that actually ran; image need unknown ranks after confirmed', () => {
  fs.writeFileSync(R.P.outcomes, ''); fs.writeFileSync(R.P.limits, '');
  const r = R.route({slice: 's5', complexity: 'high'});
  assert.equal(r.coldStart, true);
  assert.equal(`${r.choice.engine}/${r.choice.model}`, 'alpha/a-pro'); // ran here; free beta models never ran
  fs.writeFileSync(R.P.policy, JSON.stringify({models: {'beta/b-other': {imageInput: true}}}));
  const v = R.route({slice: 's6', complexity: 'low', needs: {imageInput: true}});
  assert.equal(`${v.choice.engine}/${v.choice.model}`, 'beta/b-other');
  fs.unlinkSync(R.P.policy);
});

test('balanced trades measured reliability, cost and latency while free-first keeps price priority', () => {
  fs.writeFileSync(R.P.limits, '');
  fs.writeFileSync(R.P.outcomes, '');
  for (let i = 0; i < 10; i++) {
    for (const [engine, model, result, costUsd, durationMs] of [
      ['alpha', 'a-pro', 'ok', 0.001, 1000],
      ['beta', 'b-zen-free', i < 7 ? 'ok' : 'broken', 0, 600000],
    ]) fs.appendFileSync(R.P.outcomes, JSON.stringify({engine, model, complexity: 'high', result, costUsd, durationMs}) + '\n');
  }
  const free = R.route({complexity: 'high', budget: 'free-first'});
  const balanced = R.route({complexity: 'high', budget: 'balanced'});
  assert.equal(free.choice.engine, 'beta');
  assert.equal(balanced.choice.engine, 'alpha');
  assert.equal(balanced.choice.measurements.costSamples, 10);
  assert.equal(balanced.choice.measurements.durationMsPerAttempt, 1000);
  assert.equal(balanced.scoring.unknownPenalty, 1);
  assert.ok(balanced.choice.score.every(Number.isFinite));
  fs.writeFileSync(R.P.outcomes, '');
  const unknown = R.route({complexity: 'low', budget: 'balanced'});
  assert.equal(unknown.choice.measurements.costUsdPerAttempt, null);
  assert.equal(unknown.choice.measurements.durationMsPerAttempt, null);
  assert.ok(unknown.choice.flags.includes('observed cost unknown'));
});

test('limit on one model blocks the whole engine by default and keeps the reset hint', () => {
  fs.writeFileSync(R.P.limits, '');
  const e = R.recordLimit('alpha', 'a-pro', "Error: You've hit your usage limit. Try again at 3:15 PM.", null);
  assert.match(e.resetHint, /3:15 PM/);
  const r = R.route({slice: 's7', complexity: 'low'});
  assert.ok(r.rejected.some(x => x.candidate === 'alpha/a-mini' || x.candidate === 'alpha/a-pro'));
  assert.ok(!r.choice || r.choice.engine !== 'alpha');
  fs.writeFileSync(R.P.limits, '');
  R.recordLimit('alpha', 'a-pro', 'per-model limit', null, 'model');
  assert.ok(R.activeLimits().has('alpha/a-pro') && !R.activeLimits().has('alpha'));
  fs.writeFileSync(R.P.limits, '');
});
