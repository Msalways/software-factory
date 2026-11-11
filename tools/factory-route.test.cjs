const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');

// isolated fake Hattera home + state dir; the module reads env at load time
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hh-')), state = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
process.env.FACTORY_HATTERA_HOME = home; process.env.FACTORY_STATE_DIR = state;
fs.mkdirSync(path.join(home, 'providers/engine-models'), {recursive: true}); fs.mkdirSync(path.join(home, 'usage'));
fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify({instances: {alpha: {driverKind: 'a'}, beta: {driverKind: 'b'}}}));
fs.writeFileSync(path.join(home, 'providers/engine-models/alpha.json'), JSON.stringify({default: 'a-pro', options: [{id: 'a-pro', label: 'A Pro'}, {id: 'a-mini', label: 'A Mini'}]}));
fs.writeFileSync(path.join(home, 'providers/engine-models/beta.json'), JSON.stringify({default: 'b-zen-free', options: [{id: 'b-zen-free', label: 'Zen Free', priceReported: 'free', contextWindow: 32000}, {id: 'b-other', label: 'Other'}]}));
const at = new Date().toISOString();
fs.writeFileSync(path.join(home, 'usage/2026-11.jsonl'), [
  {instanceId: 'alpha', model: 'a-pro', input: 10, output: 5, at},
  {instanceId: 'beta', model: 'b-gone-free', input: 1, output: 1, at},
].map(x => JSON.stringify(x)).join('\n'));
const R = require('./factory-route.cjs');
const opaqueSnapshot = {observedAt: at, engines: [{id: 'opaque-account', defaultModel: 'opaque-route',
  models: [{id: 'opaque-route', inCatalog: true, priceReported: 'unknown'}]}]};
const outcome = (e, m, c, r) => fs.appendFileSync(R.P.outcomes, JSON.stringify({engine: e, model: m, complexity: c, result: r}) + '\n');

test('a free-sounding identifier never supplies price evidence', () => {
  const catalog = path.join(home, 'providers/engine-models/alpha.json');
  const original = fs.readFileSync(catalog, 'utf8');
  try {
    fs.writeFileSync(catalog, JSON.stringify({default: 'free-promo', options: [{id: 'free-promo', label: 'Free forever'}]}));
    const model = R.supply().engines.find(e => e.id === 'alpha').models.find(m => m.id === 'free-promo');
    assert.equal(model.priceReported, 'unknown');
  } finally { fs.writeFileSync(catalog, original); }
});

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

test('arbitrary identities use configured weights and thresholds; absent observations stay null', () => {
  fs.writeFileSync(R.P.limits, '');
  fs.writeFileSync(R.P.outcomes, '');
  const snapshot = {observedAt: at, engines: ['provider-91', 'another-account-82'].map((id, i) => ({
    id, defaultModel: `opaque-model-${i}`, models: [{id: `opaque-model-${i}`, inCatalog: true, priceReported: 'unknown'}],
  }))};
  try {
    const missing = R.route({complexity: 'low', budget: 'balanced'}, {snapshot});
    assert.equal(missing.choice.capability.ok, null);
    assert.equal(missing.choice.cost, 'unknown');
    assert.equal(missing.choice.measurements.successRate, null);
    assert.equal(missing.choice.measurements.costUsdPerAttempt, null);
    assert.equal(missing.choice.measurements.durationMsPerAttempt, null);
    for (const [i, costUsd, durationMs] of [[0, 0.02, 10], [1, 0.001, 10000]]) {
      fs.appendFileSync(R.P.outcomes, JSON.stringify({engine: snapshot.engines[i].id, model: `opaque-model-${i}`,
        complexity: 'high', result: 'ok', costUsd, durationMs}) + '\n');
    }
    fs.writeFileSync(R.P.policy, JSON.stringify({capability: {minOutcomes: 1, minSuccessRate: 1},
      balanced: {weights: {failureRate: 0, cost: 1, latency: 0}, costScaleUsd: 0.5}}));
    const cheap = R.route({complexity: 'high', budget: 'balanced'}, {snapshot});
    assert.equal(cheap.choice.engine, 'another-account-82');
    assert.equal(cheap.choice.capability.ok, true);
    assert.equal(cheap.scoring.costScaleUsd, 0.5);
    fs.writeFileSync(R.P.policy, JSON.stringify({balanced: {weights: {failureRate: 0, cost: 0, latency: 1}}}));
    const fast = R.route({complexity: 'low', budget: 'balanced'}, {snapshot});
    assert.equal(fast.choice.engine, 'provider-91');
    fs.writeFileSync(R.P.policy, JSON.stringify({balanced: {costScaleUsd: 0}}));
    assert.throws(() => R.route({budget: 'balanced'}, {snapshot}), /invalid routing policy/);
  } finally {
    fs.unlinkSync(R.P.policy);
    fs.writeFileSync(R.P.outcomes, '');
  }
});

test('only a missing policy defaults; invalid or unreadable policy fails before receipts', () => {
  const receipts = () => fs.existsSync(R.P.receipts) ? fs.readdirSync(R.P.receipts).sort() : [];
  try {
    fs.rmSync(R.P.policy, {force: true});
    assert.ok(R.route({complexity: 'low'}, {snapshot: opaqueSnapshot}).choice);
    const before = receipts();
    for (const text of ['{bad json', 'null', '[]', '"not an object"']) {
      fs.writeFileSync(R.P.policy, text);
      assert.throws(() => R.route({budget: 'balanced'}, {snapshot: opaqueSnapshot}), /Invalid routing policy/);
      assert.deepEqual(receipts(), before);
    }
    fs.unlinkSync(R.P.policy);
    for (const policy of [{balanced: 42}, {balanced: {weights: null}}, {capability: []}]) {
      fs.writeFileSync(R.P.policy, JSON.stringify(policy));
      assert.throws(() => R.route({}, {snapshot: opaqueSnapshot}), /invalid routing policy/);
      assert.deepEqual(receipts(), before);
    }
    fs.unlinkSync(R.P.policy);
    // A directory at the policy path produces a real read failure on Windows
    // and POSIX, without relying on platform-specific chmod behavior.
    fs.mkdirSync(R.P.policy);
    assert.throws(() => R.route({}, {snapshot: opaqueSnapshot}), /Cannot read routing policy/);
    assert.deepEqual(receipts(), before);
    fs.rmdirSync(R.P.policy);
    fs.writeFileSync(R.P.policy, '{}');
    assert.ok(R.route({complexity: 'low'}, {snapshot: opaqueSnapshot}).choice);
  } finally {
    if (fs.existsSync(R.P.policy) && fs.statSync(R.P.policy).isDirectory()) fs.rmdirSync(R.P.policy);
    else fs.rmSync(R.P.policy, {force: true});
  }
});

test('finite extreme observations retain finite measured means and persisted scores', () => {
  fs.writeFileSync(R.P.limits, '');
  try {
    for (const value of [1e308, Number.MAX_VALUE, Number.MIN_VALUE, 0]) {
      fs.writeFileSync(R.P.outcomes, [1, 2].map(() => JSON.stringify({engine: 'opaque-account', model: 'opaque-route',
        complexity: 'low', result: 'ok', costUsd: value, durationMs: value})).join('\n'));
      const r = R.route({complexity: 'low', budget: 'balanced'}, {snapshot: opaqueSnapshot});
      const saved = JSON.parse(fs.readFileSync(r.file, 'utf8')).choice;
      assert.equal(saved.measurements.costUsdPerAttempt, value);
      assert.equal(saved.measurements.durationMsPerAttempt, value);
      assert.equal(saved.measurements.costSamples, 2);
      assert.ok(saved.score.every(Number.isFinite));
      assert.ok(!saved.flags.includes('observed cost unknown'));
    }
    fs.writeFileSync(R.P.outcomes, [0, Number.MIN_VALUE].map(value => JSON.stringify({engine: 'opaque-account', model: 'opaque-route',
      complexity: 'low', result: 'ok', costUsd: value, durationMs: value})).join('\n'));
    const tiny = R.route({complexity: 'low', budget: 'balanced'}, {snapshot: opaqueSnapshot});
    assert.ok(tiny.choice.measurements.costUsdPerAttempt > 0);
    assert.ok(tiny.choice.measurements.durationMsPerAttempt > 0);
    // Large valid policy scales must not overflow value+scale; large weights
    // must not overflow their sum or their products with unknown penalties.
    fs.writeFileSync(R.P.policy, JSON.stringify({balanced: {costScaleUsd: Number.MAX_VALUE,
      latencyScaleMs: Number.MAX_VALUE, weights: {failureRate: 0, cost: 1e308, latency: 1e308}, unknownPenalty: 1e308}}));
    fs.writeFileSync(R.P.outcomes, JSON.stringify({engine: 'opaque-account', model: 'opaque-route',
      complexity: 'low', result: 'ok', costUsd: Number.MAX_VALUE, durationMs: Number.MAX_VALUE}));
    const measured = R.route({complexity: 'low', budget: 'balanced'}, {snapshot: opaqueSnapshot});
    assert.equal(measured.choice.score[4], 0.5);
    fs.writeFileSync(R.P.outcomes, '');
    const unknown = R.route({complexity: 'low', budget: 'balanced'}, {snapshot: opaqueSnapshot});
    assert.equal(unknown.choice.measurements.costUsdPerAttempt, null);
    assert.ok(unknown.choice.score.every(Number.isFinite));
    assert.equal(unknown.choice.score[4], 1e308);
  } finally {
    fs.writeFileSync(R.P.outcomes, '');
    fs.rmSync(R.P.policy, {force: true});
  }
});
