const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const W = require('./factory-worktrees.cjs');

// origin (bare) + clone with worktrees in several states
function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-'));
  const g = (cwd, ...a) => { const r = spawnSync('git', a, {cwd, encoding: 'utf8'}); if (r.status) throw Error(a.join(' ') + ': ' + r.stderr); return r.stdout.trim(); };
  const origin = path.join(root, 'origin.git'), repo = path.join(root, 'repo');
  g(root, 'init', '-q', '--bare', '-b', 'main', origin);
  g(root, 'clone', '-q', origin, repo);
  for (const [k, v] of [['user.email', 't@t'], ['user.name', 't'], ['core.autocrlf', 'false']]) g(repo, 'config', k, v);
  fs.writeFileSync(path.join(repo, 'a'), '1'); g(repo, 'add', '.'); g(repo, 'commit', '-qm', 'base'); g(repo, 'push', '-q', '-u', 'origin', 'main');
  const wt = name => { const p = path.join(root, name); g(repo, 'worktree', 'add', '-q', '-b', name, p); return p; };
  const commit = (p, f, date) => { fs.writeFileSync(path.join(p, f), f); g(p, 'add', '.');
    spawnSync('git', ['commit', '-qm', f], {cwd: p, env: {...process.env, ...(date ? {GIT_COMMITTER_DATE: date, GIT_AUTHOR_DATE: date} : {})}}); };
  // merged: committed, pushed, merged into main
  const merged = wt('merged'); commit(merged, 'm'); g(merged, 'push', '-q', 'origin', 'merged');
  g(repo, 'merge', '-q', '--ff-only', 'merged'); g(repo, 'push', '-q', 'origin', 'main');
  // dirty: merged base but uncommitted change
  const dirty = wt('dirty'); fs.writeFileSync(path.join(dirty, 'x'), 'x');
  // unpushed: local commit only
  const unpushed = wt('unpushed'); commit(unpushed, 'u');
  // stale: pushed, unmerged, old
  const stale = wt('stale'); commit(stale, 's', '2020-01-01T00:00:00Z'); g(stale, 'push', '-q', 'origin', 'stale');
  return {repo, merged, dirty, unpushed, stale};
}

test('classifies merged, dirty, unpushed and stale worktrees', () => {
  const s = setup();
  const by = Object.fromEntries(W.inspect(s.repo).map(e => [e.branch, e]));
  assert.equal(by.merged.class, 'remove');
  assert.equal(by.dirty.class, 'keep');
  assert.equal(by.unpushed.class, 'keep');
  assert.match(by.unpushed.reasons.join(), /not on any remote/);
  assert.equal(by.stale.class, 'stale');
});

test('clean is a dry run by default and only removes safe targets with --apply', () => {
  const s = setup();
  const dry = W.clean(s.repo, {});
  assert.equal(dry.applied, false);
  assert.ok(fs.existsSync(s.merged));
  assert.deepEqual(dry.actions.map(a => a.branch), ['merged']);
  const done = W.clean(s.repo, {apply: true, deleteBranch: true});
  assert.ok(!fs.existsSync(s.merged));
  assert.match(done.actions[0].steps.join(), /deleted branch merged/);
  for (const p of [s.dirty, s.unpushed, s.stale]) assert.ok(fs.existsSync(p));
  W.clean(s.repo, {apply: true, includeStale: true});
  assert.ok(!fs.existsSync(s.stale));
  assert.ok(fs.existsSync(s.dirty) && fs.existsSync(s.unpushed));
});
