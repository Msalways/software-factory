const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const {check} = require('./factory-gates.cjs');

function repo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gates-'));
  const g = (...a) => { const r = spawnSync('git', a, {cwd: d, encoding: 'utf8'}); if (r.status) throw Error(r.stderr); return r.stdout.trim(); };
  g('init', '-q'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't'); g('config', 'core.autocrlf', 'false');
  fs.mkdirSync(path.join(d, 'src')); fs.writeFileSync(path.join(d, 'src/a.js'), 'a\n');
  g('add', '.'); g('commit', '-qm', 'base');
  const base = g('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(d, 'src/a.js'), 'a2\n'); fs.writeFileSync(path.join(d, 'src/b.js'), 'b\n');
  g('add', '.'); g('commit', '-qm', 'slice');
  return {d, base, head: g('rev-parse', 'HEAD'), g};
}
const write = (d, ev) => { const p = path.join(d, 'evidence.json'); fs.writeFileSync(p, JSON.stringify(ev)); return p; };

test('all gates pass on honest evidence with --run', () => {
  const {d, base, head} = repo();
  const p = write(d, {baseline: base, revision: head, expectedSurface: ['src/'], changedFiles: ['src/a.js', 'src/b.js'],
    checks: [{command: 'node -e "process.exit(0)"', exitCode: 0}]});
  const r = check(d, p, {run: true});
  assert.equal(r.pass, true, r.findings.join('\n'));
});

test('without --run tests_pass is not-run, so overall fails', () => {
  const {d, base, head} = repo();
  const p = write(d, {baseline: base, revision: head, changedFiles: ['src/a.js', 'src/b.js'], checks: [{command: 'x', exitCode: 0}]});
  const r = check(d, p, {});
  assert.equal(r.gates.tests_pass, 'not-run');
  assert.equal(r.pass, false);
});

test('detects unclaimed and phantom files, and surface violations', () => {
  const {d, base, head} = repo();
  const p = write(d, {baseline: base, revision: head, expectedSurface: ['src/a.js'], changedFiles: ['src/a.js', 'src/c.js'],
    checks: [{command: 'node -e "0"', exitCode: 0}]});
  const r = check(d, p, {run: true});
  assert.equal(r.gates.diff_matches_claims, 'fail');
  const f = r.findings.join('\n');
  assert.match(f, /changed but not claimed: src\/b\.js/);
  assert.match(f, /claimed but not changed: src\/c\.js/);
  assert.match(f, /outside expected surface without explanation: src\/b\.js/);
});

test('dirty tree, wrong revision and failing command fail their gates', () => {
  const {d, base} = repo();
  fs.writeFileSync(path.join(d, 'src/a.js'), 'dirty\n');
  const p = write(d, {baseline: base, revision: base, changedFiles: ['src/a.js', 'src/b.js'],
    checks: [{command: 'node -e "process.exit(3)"', exitCode: 0}]});
  const r = check(d, p, {run: true});
  assert.equal(r.gates.artifacts_exist, 'fail');
  assert.equal(r.gates.tests_pass, 'fail');
  const f = r.findings.join('\n');
  assert.match(f, /not clean/); assert.match(f, /is not HEAD/); assert.match(f, /claimed exit 0, actual 3/);
});

test('missing screenshot fails artifacts_exist', () => {
  const {d, base, head} = repo();
  const p = write(d, {baseline: base, revision: head, changedFiles: ['src/a.js', 'src/b.js'],
    screenshots: [{path: 'shots/x.png'}], checks: [{command: 'node -e "0"', exitCode: 0}]});
  const r = check(d, p, {run: true});
  assert.match(r.findings.join('\n'), /screenshot missing/);
});
