const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');

// isolated fake Hattera home + state dir; the module reads env at load time
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hh-')), state = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
process.env.FACTORY_HATTERA_HOME = home; process.env.FACTORY_STATE_DIR = state;
fs.mkdirSync(path.join(home, 'providers/engine-models'), {recursive: true}); fs.mkdirSync(path.join(home, 'usage'));
fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify({instances: {alpha: {driverKind: 'a'}, beta: {driverKind: 'b'}}}));
// Authorization is explicit configuration, independent of catalogs/policy/usage.
fs.writeFileSync(path.join(home, 'bots.json'), JSON.stringify([
  ['alpha', 'a-pro'], ['beta', 'b-zen-free'], ['beta', 'b-other'],
  ['opaque-account', 'opaque-route'], ['provider-91', 'opaque-model-0'], ['another-account-82', 'opaque-model-1'],
].map(([instanceId, model]) => ({modelSelection: {instanceId, model}}))));
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

const tierPolicy = () => ({workKindTiers: {implement: 'worker', review: 'premium'}, models: {
  'alpha/a-pro': {tier: 'premium'}, 'beta/b-zen-free': {tier: 'worker'},
  'beta/b-other': {tier: 'worker', costClass: 'subscription'}, 'alpha/a-mini': {tier: 'worker', costClass: 'free'},
}});
test('work-kind intersection ranks only authorized catalog models within the requested tier', () => {
  fs.writeFileSync(R.P.limits, ''); fs.writeFileSync(R.P.outcomes, '');
  fs.writeFileSync(R.P.policy, JSON.stringify(tierPolicy()));
  try {
    const worker = R.route({complexity: 'low', workKind: 'implement'});
    assert.equal(worker.choice.model, 'b-zen-free');
    assert.equal(worker.fallback, false);
    assert.equal(worker.tier, 'worker');
    assert.ok(worker.fallbacks.some(c => c.model === 'b-other'), 'more expensive worker remains a fallback within tier');
    assert.ok(worker.rejected.some(r => r.candidate === 'alpha/a-mini' && /not owner-authorized/.test(r.reason)));
    const review = R.route({complexity: 'low', workKind: 'review'});
    assert.equal(review.choice.model, 'a-pro');
    assert.equal(review.fallback, false);
    const legacy = R.route({complexity: 'low'});
    assert.equal(legacy.choice.model, 'b-zen-free', 'no work kind retains existing ranking for authorized supply');
    assert.equal(legacy.workKind, null);
    assert.equal(legacy.fallback, false);
  } finally { fs.rmSync(R.P.policy, {force: true}); }
});

test('empty authorized tier falls back with persisted tier/work-kind reason, never policy authorization', () => {
  fs.writeFileSync(R.P.policy, JSON.stringify({workKindTiers: {implement: 'worker'}, models: {
    'alpha/a-pro': {tier: 'premium'}, 'alpha/a-mini': {tier: 'worker', costClass: 'free'},
  }}));
  try {
    const r = R.route({complexity: 'low', workKind: 'implement'});
    assert.equal(r.choice.model, 'b-zen-free');
    assert.equal(r.fallback, true);
    assert.match(r.fallbackReason, /tier worker.*work kind implement/);
    assert.match(r.reason, /tier worker.*work kind implement/);
    assert.equal(JSON.parse(fs.readFileSync(r.file, 'utf8')).fallback, true);
    assert.ok(!r.fallbacks.some(c => c.model === 'a-mini'));
  } finally { fs.rmSync(R.P.policy, {force: true}); }
});

test('authorization is current configured state, not policy, catalog default or prior execution', () => {
  const bots = fs.readFileSync(R.P.bots, 'utf8');
  fs.writeFileSync(R.P.policy, JSON.stringify(tierPolicy()));
  try {
    fs.writeFileSync(R.P.bots, '[]');
    for (const workKind of [undefined, 'implement']) {
      const denied = R.route({complexity: 'low', ...(workKind ? {workKind} : {})});
      assert.equal(denied.choice, null);
      assert.ok(denied.rejected.some(r => r.candidate === 'alpha/a-pro' && /not owner-authorized/.test(r.reason)));
    }
    fs.writeFileSync(R.P.bots, bots);
    assert.equal(R.route({complexity: 'low', workKind: 'implement'}).choice.model, 'b-zen-free');
  } finally { fs.writeFileSync(R.P.bots, bots); fs.rmSync(R.P.policy, {force: true}); }
});

test('CLI --work-kind overrides the profile through authorized schema-2 preflight', () => {
  const {spawnSync}=require('node:child_process'),base=fs.mkdtempSync(path.join(os.tmpdir(),'route-cli-'));
  const env={...process.env,FACTORY_HATTERA_HOME:path.join(base,'home'),FACTORY_STATE_DIR:path.join(base,'state'),FACTORY_SESSION_ID:'cli-session'};
  try {
    const setup=spawnSync(process.execPath,['-e',`
      const fs=require('node:fs'),path=require('node:path'),R=require(process.argv[1]),L=require(path.join(path.dirname(process.argv[1]),'provider-snapshot.cjs'));
      const put=(f,v)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v));},stat=f=>{const s=fs.statSync(f);return {mtimeMs:s.mtimeMs,size:s.size};},present=value=>({state:'present',value});
      const key='alpha/a-pro',project='cli-project';
      put(R.P.config,{instances:{alpha:{driver:'synthetic'}},defaultModelSelection:{instanceId:'alpha',model:'a-pro'}});put(R.P.bots,[]);
      const file=path.join(R.P.catalogs,'alpha.json'),catalog={default:'a-pro',options:[{id:'a-pro',label:'A Pro'}]};put(file,catalog);
      put(R.P.policy,{projects:{[project]:{allowlist:[key]}}});put(path.join(process.env.FACTORY_STATE_DIR,'project-catalog-history',project+'.json'),{schema:1,engines:{alpha:{lastKeys:[key],retirementGeneration:{[key]:0}}}});
      const native={schema:1,config:{stat:stat(R.P.config),instances:[{id:'alpha',driver:'synthetic',enabled:true}],defaultSelection:{key,effort:null},newBotSelection:null},bots:{stat:stat(R.P.bots),bots:[]},catalogs:[{id:'alpha',driver:'synthetic',file:present(stat(file)),catalog:present({default:catalog.default,options:[{id:'a-pro'}]})}]};
      put(path.join(process.env.FACTORY_STATE_DIR,'route-identities.json'),{schema:1,sessionId:'cli-session',capturedAt:new Date(Date.now()-1000).toISOString(),validUntil:new Date(Date.now()+600000).toISOString(),nativeFingerprint:L.fingerprint(native),records:{[key]:{providerId:'synthetic-provider',routeScope:'account/test',sourceRef:'fixtures/operator.json'}}});
      let source=R.readCurrentSources({project,sessionId:'cli-session',now:Date.now()}),engine=source.inputs.engines[0];const raw=L.resolveModelEvidence({key,engine,modelOption:engine.options[0],routeScope:'account/test',evidence:[],decision:null,preference:null,retired:{isRetired:false,retirementGeneration:0},now:Date.now()}).rawCatalogFingerprint;
      put(path.join(process.env.FACTORY_STATE_DIR,'provider-evidence.json'),{schema:1,records:[['tier',{nativeTier:'standard',normalized:'worker'}],['price',{currency:'USD',unit:'token',basis:'account',input:1,output:1,cachedInput:0}],['toolUse',true],['contextTokens',32000]].map(([field,value])=>({key,field,value,providerId:'synthetic-provider',routeScope:'account/test',kind:'provider-catalog',status:'observed',confidence:'high',sourceRef:'fixtures/'+field+'.json',observedAt:new Date(Date.now()-1000).toISOString(),validUntil:new Date(Date.now()+600000).toISOString(),catalogFingerprint:raw}))});
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50);R.takeSnapshot(project);
    `,path.join(__dirname,'factory-route.cjs')],{env,encoding:'utf8'});
    assert.equal(setup.status,0,setup.stderr);
    const profile=path.join(base,'profile.json');fs.writeFileSync(profile,JSON.stringify({slice:'cli-override',complexity:'low',budget:'free-first',workKind:'implement',needs:{toolUse:true,imageInput:false,contextTokens:8000}}));
    const result=spawnSync(process.execPath,[path.join(__dirname,'factory-route.cjs'),'route',profile,'--project','cli-project','--work-kind','review','--json'],{env,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);const receipt=JSON.parse(result.stdout);
    assert.equal(receipt.choice.model,'a-pro');assert.equal(receipt.profile.workKind,'review');assert.equal(receipt.dispatchAuthorized,true);assert.equal(receipt.providerSnapshot.hash,JSON.parse(fs.readFileSync(receipt.providerSnapshot.path)).hash);
  } finally {fs.rmSync(base,{recursive:true,force:true});}
});

test('workspace, new-bot and conversation configured selections each grant only their exact identity', () => {
  const cfg = fs.readFileSync(R.P.config, 'utf8'), bots = fs.readFileSync(R.P.bots, 'utf8');
  const selection = {instanceId: 'alpha', model: 'a-pro'};
  try {
    for (const source of ['workspace', 'new-bot', 'conversation']) {
      const config = JSON.parse(cfg);
      if (source === 'workspace') config.defaultModelSelection = selection;
      if (source === 'new-bot') config.newBotDefaults = {profile: {modelSelection: selection}};
      fs.writeFileSync(R.P.config, JSON.stringify(config));
      fs.writeFileSync(R.P.bots, JSON.stringify(source === 'conversation' ? [{tasks: [{modelSelection: selection}]}] : []));
      const r = R.route({complexity: 'low'});
      assert.equal(r.choice.model, 'a-pro', source);
      assert.equal(r.fallbacks.length, 0, 'other catalog choices remain unauthorized');
    }
  } finally { fs.writeFileSync(R.P.config, cfg); fs.writeFileSync(R.P.bots, bots); }
});

test('invalid tier policy fails explicitly before writing a route receipt', () => {
  const count = fs.readdirSync(R.P.receipts).length;
  try {
    for (const policy of [{workKindTiers: []}, {workKindTiers: {implement: ''}}, {models: {'alpha/a-pro': {tier: 2}}}]) {
      fs.writeFileSync(R.P.policy, JSON.stringify(policy));
      assert.throws(() => R.route({complexity: 'low', workKind: 'implement'}), /invalid routing policy/);
      assert.equal(fs.readdirSync(R.P.receipts).length, count);
    }
  } finally { fs.rmSync(R.P.policy, {force: true}); }
});

// ---------- v2.1 project-mode ranking (opts.project): S3A-capable-ranking.md fixtures ----------------------
const snapshotLib = require('./provider-snapshot.cjs');
const FP = Object.fromEntries(['config', 'bots', 'catalogs', 'policy', 'evidence', 'decisions', 'history', 'limits', 'opencode'].map(k => [k, 'a'.repeat(64)]));
function fx(key, {tier = 'worker', price = null, toolUse = true, imageInput = true, contextTokens = 100000, preferenceRank = null} = {}) {
  const [engine, model] = key.split('/');
  return {key, engine, model, authorization: {status: 'allowed', reasons: []}, hierarchy: {value: tier}, priceEvidence: {value: price},
    capabilities: {toolUse: {value: toolUse}, imageInput: {value: imageInput}, contextTokens: {value: contextTokens}},
    decisionState: {preferenceRank}};
}
function px(input, output, cachedInput = null, extra = {}) {
  return {currency: 'USD', unit: 'per-1k-tokens', basis: 'api-equivalent', contextBand: null, serviceTier: null, input, output, cachedInput, ...extra};
}
function snapshotFx(models, {nowMs = Date.now(), activeLimits = []} = {}) {
  const observedAt = new Date(nowMs - 1000).toISOString(), expiresAt = new Date(nowMs + 3600e3).toISOString();
  const content = {schema: 2, project: 'p3a', observedAt, expiresAt, evidenceExpiresAt: null, maxAgeMinutes: 60, catalogStaleHours: 24,
    sources: {}, engines: [], models, allowed: models.filter(m => m.authorization.status === 'allowed').map(m => m.key),
    catalogModelsOmitted: 0, currentFingerprints: FP, capabilityPolicy: {minOutcomes: 2, minSuccessRate: 0.7}, activeLimits, retired: {}};
  return {...content, hash: snapshotLib.fingerprint(content)};
}
function profileFx(overrides = {}) {
  return {slice: 's3a', workKind: 'implement', complexity: 'low', budget: 'free-first',
    needs: {toolUse: true, imageInput: false, contextTokens: 8000}, ...overrides};
}
function routeP(models, profile, opts = {}) {
  const nowMs = Date.now();
  return R.route(profile, {project: 'p3a', snapshot: snapshotFx(models, {nowMs, activeLimits: opts.activeLimits}),
    context: {now: nowMs, ...opts.context}, avoid: opts.avoid});
}

test('project mode: cheaper capable worker wins despite premium role and balanced weights', () => {
  const premium = fx('engA/premium-1', {tier: 'premium', price: px(10, 20)});
  const worker = fx('engB/worker-1', {price: px(1, 2)});
  const profile = profileFx({budget: 'balanced', premiumNeed: {requirementIds: ['r1'], reason: 'needs reasoning',
    cheaperRejected: [{key: 'engB/worker-1', reason: 'not enough', evidenceRef: 'https://example.test/e'}]}});
  const approval = {approvedBy: 'user', sourceRef: 'https://example.test/a', keys: ['engA/premium-1'],
    profileHash: snapshotLib.fingerprint(profile), approvedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 3600e3).toISOString()};
  const r = routeP([premium, worker], profile, {context: {approval}});
  assert.equal(r.held, false, r.holdReason);
  assert.equal(r.choice.key, 'engB/worker-1');
  assert.equal(r.dispatchAuthorized, true);
});

test('project mode: expensive worker loses on cost', () => {
  const cheap = fx('engC/cheap-1', {price: px(1, 1)});
  const pricey = fx('engD/pricey-1', {price: px(5, 5)});
  const r = routeP([pricey, cheap], profileFx());
  assert.equal(r.held, false, r.holdReason);
  assert.equal(r.choice.key, 'engC/cheap-1');
});

test('project mode: cheaper incapable route excluded, pricier capable route wins', () => {
  const cheapIncapable = fx('engE/cheap-no-tools', {price: px(1, 1), toolUse: false});
  const priceyCapable = fx('engF/pricey-tools', {price: px(5, 5)});
  const r = routeP([cheapIncapable, priceyCapable], profileFx());
  assert.equal(r.held, false, r.holdReason);
  assert.equal(r.choice.key, 'engF/pricey-tools');
  assert.ok(r.rejected.some(x => x.candidate === 'engE/cheap-no-tools' && /known incapable: toolUse/.test(x.reason)));
});

test('project mode: unknown required capability on the cheapest candidate holds the route', () => {
  const cheapUnknownCtx = fx('engG/cheap-unknown-ctx', {price: px(1, 1), contextTokens: null});
  const priceyKnown = fx('engH/pricey-known', {price: px(5, 5)});
  const r = routeP([cheapUnknownCtx, priceyKnown], profileFx());
  assert.equal(r.held, true);
  assert.equal(r.choice, null);
  assert.match(r.holdReason, /engG\/cheap-unknown-ctx/);
});

test('project mode: crossing price vectors with no estimate or preference hold the route', () => {
  const a = fx('engI/cross-a', {price: px(1, 10)});
  const b = fx('engJ/cross-b', {price: px(5, 2)});
  const r = routeP([a, b], profileFx());
  assert.equal(r.held, true);
  assert.equal(r.costTieGroup.length, 0);
});

test('project mode: complete estimated-token cost resolves crossing rates', () => {
  const a = fx('engI/cross-a', {price: px(1, 10)});
  const b = fx('engJ/cross-b', {price: px(5, 2)});
  // a: 1*1000 + 10*100 = 2000; b: 5*1000 + 2*100 = 5200 -> a wins despite crossing per-unit rates
  const r = routeP([a, b], profileFx({estimatedTokens: {input: 1000, output: 100, cachedInput: 0}}));
  assert.equal(r.held, false, r.holdReason);
  assert.equal(r.choice.key, 'engI/cross-a');
});

test('project mode: incomplete estimate and unlike billing basis hold the route', () => {
  const a = fx('engK/basis-account', {price: px(1, 1, null, {basis: 'account'})});
  const b = fx('engL/basis-api', {price: px(1, 1, null, {basis: 'api-equivalent'})});
  const r = routeP([a, b], profileFx()); // no estimatedTokens supplied
  assert.equal(r.held, true);
});

test('project mode: project comparative preference orders unknown-price candidates without a dollar claim', () => {
  const a = fx('engM/pref-a', {price: null, preferenceRank: 0});
  const b = fx('engN/pref-b', {price: null, preferenceRank: 1});
  const r = routeP([a, b], profileFx());
  assert.equal(r.held, false, r.holdReason);
  assert.equal(r.choice.key, 'engM/pref-a');
  assert.equal(r.choice.price, null);
});

test('project mode: no worker, an active limit, two failed outcomes and best-quality budget never auto-promote premium', () => {
  const premium = fx('engO/premium-only', {tier: 'premium', price: px(10, 20)});
  const profile = profileFx({budget: 'best-quality', complexity: 'medium'});
  fs.appendFileSync(R.P.outcomes, JSON.stringify({engine: 'engO', model: 'premium-only', complexity: 'medium', result: 'broken'}) + '\n');
  fs.appendFileSync(R.P.outcomes, JSON.stringify({engine: 'engO', model: 'premium-only', complexity: 'medium', result: 'broken'}) + '\n');
  const r = routeP([premium], profile, {activeLimits: [{engine: 'engP', until: new Date(Date.now() + 3600e3).toISOString()}]});
  assert.equal(r.held, true);
  assert.equal(r.choice, null);
  assert.ok(r.rejected.some(x => x.candidate === 'engO/premium-only' && /premium requires documented task need/.test(x.reason)));
});

test('project mode: a valid exact approval permits a justified premium choice', () => {
  const premium = fx('engQ/premium-approved', {tier: 'premium', price: px(10, 20)});
  const profile = profileFx({premiumNeed: {requirementIds: ['r1'], reason: 'needs reasoning depth',
    cheaperRejected: [{key: 'engQ/cheaper-rejected-ref', reason: 'failed on tool use', evidenceRef: 'https://example.test/evidence'}]}});
  const approval = {approvedBy: 'user', sourceRef: 'https://example.test/approval', keys: ['engQ/premium-approved'],
    profileHash: snapshotLib.fingerprint(profile), approvedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 3600e3).toISOString()};
  const r = routeP([premium], profile, {context: {approval}});
  assert.equal(r.held, false, r.holdReason);
  assert.equal(r.choice.key, 'engQ/premium-approved');
  assert.equal(r.dispatchAuthorized, true);
  assert.ok(r.premiumJustification);
});

test('project mode: equal-cost tie breaks on observed latency before falling back to key', () => {
  // Same price (cost-tied), same avoid status (neither avoided), same success rate (3/4 both) -
  // only observed durationMsPerAttempt differs. 'engA/slow-1' sorts before 'engZ/fast-1' by key,
  // so a tie-break that ignores latency would wrongly pick the slower one on key alone.
  const slow = fx('engA/slow-1', {price: px(1, 1)});
  const fast = fx('engZ/fast-1', {price: px(1, 1)});
  for (const result of ['ok', 'ok', 'ok', 'broken']) {
    fs.appendFileSync(R.P.outcomes, JSON.stringify({engine: 'engA', model: 'slow-1', complexity: 'low', result, durationMs: 50000}) + '\n');
    fs.appendFileSync(R.P.outcomes, JSON.stringify({engine: 'engZ', model: 'fast-1', complexity: 'low', result, durationMs: 500}) + '\n');
  }
  const r = routeP([slow, fast], profileFx());
  assert.equal(r.held, false, r.holdReason);
  assert.equal(r.costTieGroup.length, 2);
  assert.equal(r.choice.key, 'engZ/fast-1');
});

test('project mode: legacy route() without opts.project stays advisory (dispatchAuthorized:false)', () => {
  const r = R.route({slice: 's1', complexity: 'low'});
  assert.equal(r.dispatchAuthorized, false);
  assert.equal(r.mode, undefined);
});

// S3B: unresolved tier/price is a hold independent of cost comparison, single and multi candidate.
function assertHeld(r, pattern) {
  assert.equal(r.held, true);
  assert.equal(r.choice, null);
  assert.equal(r.dispatchAuthorized, false);
  assert.match(JSON.stringify(r.relevantCandidates) + r.holdReason, pattern);
}
test('S3B: single candidate with unknown tier holds', () => {
  assertHeld(routeP([fx('engS/unknown-tier', {tier: 'unknown', price: px(1, 1)})], profileFx()), /provider tier unresolved/);
});
test('S3B: single candidate with unresolved price holds even without a comparison', () => {
  assertHeld(routeP([fx('engS/no-price', {price: null})], profileFx()), /price evidence unresolved/);
});
test('S3B: cheaper unknown-tier candidate is neither selected nor dropped in favour of a dearer known worker', () => {
  const r = routeP([fx('engT/unknown-cheap', {tier: 'unknown', price: px(1, 1)}), fx('engU/known-dear', {price: px(5, 5)})], profileFx());
  assertHeld(r, /provider tier unresolved/);
  assert.ok(!/cheapest task-qualified candidate/.test(r.reason));
});
test('S3B: unknown-tier candidate stays held even when preference ordering ranks it first', () => {
  const r = routeP([fx('engT/unknown-pref', {tier: 'unknown', price: null, preferenceRank: 0}), fx('engU/known-pref', {price: null, preferenceRank: 1})], profileFx());
  assertHeld(r, /provider tier unresolved/);
});
test('S3B: unresolved-price candidate without estimate or comparative answer holds against a known worker', () => {
  assertHeld(routeP([fx('engV/no-price', {price: null}), fx('engW/priced', {price: px(5, 5)})], profileFx()), /./);
});

// S3B rework1: partial price vectors never dominate; route verdict equals check's resolver verdict.
test('S3B: lower known input rate does not dominate an unknown output rate (pair holds, no choice)', () => {
  const a = fx('engX/partial', {price: px(0.000001, null)}), b = fx('engY/full', {price: px(0.000005, 0.00001)});
  const r = routeP([a, b], profileFx());
  assertHeld(r, /./);
  assert.equal(r.costTieGroup.length, 0);
  assert.equal(R.route({slice: 's'}).dispatchAuthorized, false);
});
test('S3B: complete crossing vectors with a high known output rate hold', () => {
  assertHeld(routeP([fx('engX/low-in', {price: px(1, 100)}), fx('engY/low-out', {price: px(5, 2)})], profileFx()), /./);
});
test('S3B: estimate with a zero token count cannot clear a candidate whose own price is unresolved', () => {
  const r = routeP([fx('engX/partial', {price: px(1, null)}), fx('engY/full', {price: px(5, 5)})], profileFx({estimatedTokens: {input: 1000, output: 0, cachedInput: 0}}));
  assertHeld(r, /./);
});
// Differential: for single-candidate fixtures route's verdict must equal evaluateTask's (the resolver check uses).
for (const [name, model, profileExtra] of [
  ['resolved worker', fx('engD1/ok', {price: px(1, 1)}), {}],
  ['unknown tier', fx('engD2/t', {tier: 'unknown', price: px(1, 1)}), {}],
  ['no price', fx('engD3/p', {price: null}), {}],
  ['partial output price', fx('engD4/po', {price: px(1, null)}), {}],
  ['partial input price', fx('engD5/pi', {price: px(null, 1)}), {}],
  ['missing cachedInput rate needed by estimate', fx('engD6/c', {price: px(1, 1, null)}), {estimatedTokens: {input: 10, output: 10, cachedInput: 5}}],
  ['unknown context capability', fx('engD7/ctx', {price: px(1, 1), contextTokens: null}), {}],
  ['premium without need', fx('engD8/prem', {tier: 'premium', price: px(1, 1)}), {}],
]) test('S3B differential: single-candidate route verdict equals check evaluator for ' + name, () => {
  const nowMs = Date.now(), profile = profileFx(profileExtra), snap = snapshotFx([model], {nowMs});
  const ev = snapshotLib.evaluateTask(snap, model.key, profile, {now: nowMs});
  const r = R.route(profile, {project: 'p3a', snapshot: snap, context: {now: nowMs}});
  assert.equal(Boolean(r.choice), ev.decision === 'allowed', name);
  assert.equal(r.dispatchAuthorized, ev.decision === 'allowed', name);
  assert.equal(r.held, ev.decision !== 'allowed' || false, name);
});
test('S3B documented exception: valid owner comparative order may rank while individual check stays held', () => {
  const nowMs = Date.now(), profile = profileFx(), a = fx('engE/a', {price: null, preferenceRank: 1}), b = fx('engF/b', {price: null, preferenceRank: 0});
  const snap = snapshotFx([a, b], {nowMs});
  assert.equal(snapshotLib.evaluateTask(snap, b.key, profile, {now: nowMs}).decision, 'held');
  const r = R.route(profile, {project: 'p3a', snapshot: snap, context: {now: nowMs}});
  assert.equal(r.choice.key, b.key);
  assert.equal(r.choice.price, null);
  // Limitation: dispatchAuthorized is true here (S3A contract); check on the same model still exits 8.
  assert.equal(r.dispatchAuthorized, true);
});
