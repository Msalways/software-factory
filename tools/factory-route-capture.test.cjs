// capture-identities: the writer for state/routing/route-identities.json. Synthetic fixtures under a temp
// FACTORY_HATTERA_HOME / FACTORY_STATE_DIR only; the real state/routing directory is never touched.
const {test, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawnSync} = require('node:child_process');

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'capture-ids-'));
const home = path.join(base, 'home'), state = path.join(base, 'state');
const project = 'cap-project', key = 'alpha/a-pro', sessionId = 'capture-session';
const L = require('./provider-snapshot.cjs');
const routeCjs = path.join(__dirname, 'factory-route.cjs');
const cli = (args, {input, env = {}} = {}) => spawnSync(process.execPath, [routeCjs, ...args],
  {input, encoding: 'utf8', env: {...process.env, FACTORY_HATTERA_HOME: home, FACTORY_STATE_DIR: state, FACTORY_ACTOR_ID: 'fixture-actor', ...env}});
const put = (f, v) => { fs.mkdirSync(path.dirname(f), {recursive: true}); fs.writeFileSync(f, typeof v === 'string' ? v : JSON.stringify(v)); };
const capturePath = path.join(state, 'route-identities.json');
const records = {[key]: {providerId: 'synthetic-provider', routeScope: 'account/test', sourceRef: 'fixtures/operator.json'}};
const capFile = path.join(base, 'team-setup-capture.json');
const profileFile = path.join(base, 'profile.json');

function fixture() {
  fs.rmSync(base, {recursive: true, force: true}); fs.mkdirSync(base, {recursive: true});
  put(path.join(home, 'config.json'), {instances: {alpha: {driver: 'synthetic'}}, defaultModelSelection: {instanceId: 'alpha', model: 'a-pro'}});
  put(path.join(home, 'bots.json'), []);
  put(path.join(home, 'providers', 'engine-models', 'alpha.json'), {default: 'a-pro', options: [{id: 'a-pro', label: 'A Pro'}]});
  put(path.join(state, 'route-policy.json'), {projects: {[project]: {allowlist: [key]}}});
  put(path.join(state, 'project-catalog-history', project + '.json'), {schema: 1, engines: {alpha: {lastKeys: [key], retirementGeneration: {[key]: 0}}}});
  put(capFile, {records});
  put(profileFile, {slice: 'cap-slice', complexity: 'low', budget: 'free-first', workKind: 'implement', needs: {toolUse: true, imageInput: false, contextTokens: 8000}});
}

// The route module reads its env at load, so the reader runs in a child pointed at this fixture only.
function readEngine() {
  const out = spawnSync(process.execPath, ['-e', `
    const R=require(${JSON.stringify(routeCjs)});
    const s=R.readCurrentSources({project:${JSON.stringify(project)},sessionId:${JSON.stringify(sessionId)},now:Date.now()});
    process.stdout.write(JSON.stringify(s.inputs.engines[0]));`],
  {encoding: 'utf8', env: {...process.env, FACTORY_HATTERA_HOME: home, FACTORY_STATE_DIR: state}});
  assert.equal(out.status, 0, out.stderr);
  return JSON.parse(out.stdout);
}

// Evidence is bound to the catalog fingerprint the reader derives, so capture first, read it back, then import.
function qualifiedFixture() {
  fixture();
  const r = cli(['capture-identities', project, '--file', capFile, '--session', sessionId, '--json']);
  assert.equal(r.status, 0, r.stderr);
  const engine = readEngine();
  const raw = L.resolveModelEvidence({key, engine, modelOption: engine.options[0], routeScope: 'account/test', evidence: [], decision: null, preference: null,
    retired: {isRetired: false, retirementGeneration: 0}, now: Date.now()}).rawCatalogFingerprint;
  put(path.join(state, 'provider-evidence.json'), {schema: 1, records: [['tier', {nativeTier: 'standard', normalized: 'worker'}],
    ['price', {currency: 'USD', unit: 'token', basis: 'account', input: 1, output: 1, cachedInput: 0}], ['toolUse', true], ['contextTokens', 32000]].map(([field, value]) => ({
    key, field, value, providerId: 'synthetic-provider', routeScope: 'account/test', kind: 'provider-catalog', status: 'observed', confidence: 'high',
    sourceRef: 'fixtures/' + field + '.json', observedAt: new Date(Date.now() - 1000).toISOString(), validUntil: new Date(Date.now() + 600000).toISOString(), catalogFingerprint: raw}))});
}
const snapshot = env => cli(['snapshot', project, '--team-setup', capFile, '--json'], {env});
const check = env => cli(['check', project, key, '--purpose', 'cli-run', '--profile', profileFile, '--json'], {env});
const rewrite = change => { const c = JSON.parse(fs.readFileSync(capturePath, 'utf8')); change(c); put(capturePath, c); };

after(() => fs.rmSync(base, {recursive: true, force: true}));

test('a capture written by the command lets snapshot --team-setup and check pass', () => {
  qualifiedFixture();
  const cap = cli(['capture-identities', project, '--file', capFile, '--session', sessionId]);
  assert.equal(cap.status, 0, cap.stderr);
  assert.match(cap.stdout, /export FACTORY_SESSION_ID=capture-session/);
  assert.match(cap.stdout, /not authenticated provider or account proof/);
  const env = {FACTORY_SESSION_ID: sessionId};
  const snap = snapshot(env); assert.equal(snap.status, 0, snap.stderr);
  const checked = check(env); assert.equal(checked.status, 0, checked.stderr + checked.stdout);
  const result = JSON.parse(checked.stdout);
  assert.equal(result.permitted, true);
  assert.ok(result.limitations.some(x => /attestations, not authenticated/.test(x)));
});

test('the written file carries only supplied records, a reader-derived fingerprint and validUntil within 60 minutes', () => {
  fixture();
  const r = cli(['capture-identities', project, '--session', sessionId], {input: JSON.stringify({records, ignoredNote: 'x'})});
  assert.equal(r.status, 0, r.stderr);
  const c = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
  assert.deepEqual(Object.keys(c).sort(), ['capturedAt', 'nativeFingerprint', 'records', 'schema', 'sessionId', 'validUntil']);
  assert.deepEqual(c.records, records);
  assert.ok(Date.parse(c.validUntil) - Date.parse(c.capturedAt) <= 3600000);
  assert.match(c.nativeFingerprint, /^[a-f0-9]{64}$/);
  assert.deepEqual(fs.readdirSync(state).filter(f => f.endsWith('.tmp')), []);
});

test('without --session the command prints a generated session id', () => {
  fixture();
  const r = cli(['capture-identities', project, '--file', capFile, '--json'], {env: {FACTORY_SESSION_ID: ''}});
  assert.equal(r.status, 0, r.stderr);
  assert.ok(JSON.parse(r.stdout).sessionId.length > 8);
});

test('refuses missing records, validity over 60 minutes and records the reader rejects, keeping the old capture', () => {
  qualifiedFixture();
  const before = fs.readFileSync(capturePath, 'utf8');
  assert.equal(cli(['capture-identities', project, '--session', sessionId], {input: '{}'}).status, 2);
  assert.equal(cli(['capture-identities', project, '--file', capFile, '--session', sessionId, '--valid-minutes', '61']).status, 2);
  const incomplete = cli(['capture-identities', project, '--session', sessionId], {input: JSON.stringify({records: {}})});
  assert.equal(incomplete.status, 2);
  assert.match(incomplete.stderr, /rejected by the route reader/);
  assert.equal(fs.readFileSync(capturePath, 'utf8'), before);
});

for (const [name, change, env] of [
  ['expired', c => { c.validUntil = new Date(Date.now() - 1).toISOString(); }, {}],
  ['wrong-session', () => {}, {FACTORY_SESSION_ID: 'another-session'}],
  ['fingerprint-mismatch', c => { c.nativeFingerprint = '0'.repeat(64); }, {}],
]) {
  test(`${name} capture is still refused`, () => {
    qualifiedFixture();
    rewrite(change);
    const r = check({FACTORY_SESSION_ID: sessionId, ...env});
    assert.equal(r.status, 8, r.stderr + r.stdout);
  });
}

test('missing capture is still refused', () => {
  qualifiedFixture();
  fs.unlinkSync(capturePath);
  assert.equal(check({FACTORY_SESSION_ID: sessionId}).status, 8);
});

test('a native config change after capture invalidates it until re-captured', () => {
  qualifiedFixture();
  fs.appendFileSync(path.join(home, 'config.json'), ' ');
  assert.equal(check({FACTORY_SESSION_ID: sessionId}).status, 8);
});
