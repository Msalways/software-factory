#!/usr/bin/env node
// Worktree janitor (gates-and-handoffs.md, "Cleanup"). Keeps slice worktrees from piling up on disk.
// Usage:
//   node tools/factory-worktrees.cjs list  <repo> [--base main] [--stale-days 7] [--gh] [--json]
//   node tools/factory-worktrees.cjs clean <repo> [--base main] [--stale-days 7] [--gh] [--include-stale] [--delete-branch] [--apply]
// Classification of every worktree except the main one:
//   remove  clean tree, nothing unpushed, branch merged into base (ancestor, or merged PR with --gh)
//   stale   clean tree, nothing unpushed, not merged, no commit for --stale-days. Removed only with --include-stale
//   keep    dirty tree, unpushed commits, locked, or recently active. Never removed by this tool
// clean is a dry run unless --apply. It never uses --force: git refuses to remove a dirty worktree.
// --delete-branch uses `git branch -d` (safe delete), never -D. Removing a worktree keeps the branch and its commits.
// No model calls. FACTORY_GH overrides the gh executable path. --gh asks the GitHub CLI whether the branch's PR was merged (squash merges are not ancestors).
const {spawnSync} = require('node:child_process');
const path = require('node:path');

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, {cwd, encoding: 'utf8'});
  return {ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim()};
}
const git = (cwd, ...a) => run('git', a, cwd);
const samePath = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

function worktrees(repo) {
  const r = git(repo, 'worktree', 'list', '--porcelain');
  if (!r.ok) throw Error(`not a git repository: ${repo}: ${r.err}`);
  const out = []; let cur = null;
  for (const line of r.out.split(/\r?\n/)) {
    if (line.startsWith('worktree ')) { cur = {path: line.slice(9)}; out.push(cur); }
    else if (!cur) continue;
    else if (line.startsWith('HEAD ')) cur.head = line.slice(5);
    else if (line.startsWith('branch ')) cur.branch = line.slice(7).replace(/^refs\/heads\//, '');
    else if (line === 'detached') cur.detached = true;
    else if (line.startsWith('locked')) cur.locked = line.slice(6).trim() || true;
    else if (line.startsWith('prunable')) cur.prunable = line.slice(8).trim() || true;
  }
  return out;
}

function baseRef(repo, base) {
  for (const ref of [`origin/${base}`, base]) if (git(repo, 'rev-parse', '--verify', '-q', ref).ok) return ref;
  return null;
}

function inspect(repo, opts = {}) {
  const base = opts.base || 'main', staleDays = opts.staleDays ?? 7;
  const all = worktrees(repo), main = all[0];
  const bref = baseRef(repo, base);
  const now = Date.now();
  return all.slice(1).map(w => {
    const e = {path: w.path, branch: w.branch || null, head: w.head, reasons: []};
    if (w.prunable) { e.class = 'remove'; e.reasons.push(`missing on disk (${w.prunable})`); e.prunableOnly = true; return e; }
    if (w.locked) { e.class = 'keep'; e.reasons.push('locked'); return e; }
    if (samePath(w.path, main.path)) { e.class = 'keep'; e.reasons.push('main worktree'); return e; }
    const st = git(w.path, 'status', '--porcelain');
    e.dirty = !st.ok || st.out.length > 0;
    if (e.dirty) e.reasons.push(st.ok ? `${st.out.split(/\r?\n/).length} uncommitted change(s)` : 'status failed');
    // unpushed: commits not on any remote branch (covers "no upstream")
    const un = git(repo, 'rev-list', '--count', w.head, '--not', '--remotes');
    e.unpushed = un.ok ? Number(un.out) : null;
    if (e.unpushed) e.reasons.push(`${e.unpushed} commit(s) not on any remote`);
    if (e.unpushed === null) e.reasons.push('could not count unpushed commits');
    const ts = Number(git(repo, 'log', '-1', '--format=%ct', w.head).out) * 1000;
    e.lastCommit = ts ? new Date(ts).toISOString() : null;
    e.idleDays = ts ? Math.floor((now - ts) / 86400e3) : null;
    e.merged = false;
    if (bref && git(repo, 'merge-base', '--is-ancestor', w.head, bref).ok) { e.merged = true; e.mergedVia = `ancestor of ${bref}`; }
    if (!e.merged && opts.gh && w.branch) {
      const pr = run(process.env.FACTORY_GH || 'gh', ['pr', 'list', '--head', w.branch, '--state', 'merged', '--json', 'number', '--limit', '1'], repo);
      if (pr.ok) { try { const n = JSON.parse(pr.out)[0]; if (n) { e.merged = true; e.mergedVia = `PR #${n.number} merged`; } } catch {} }
      else e.reasons.push('gh check failed');
    }
    const safe = !e.dirty && e.unpushed === 0;
    if (safe && e.merged) { e.class = 'remove'; e.reasons.push(e.mergedVia); }
    else if (safe && e.idleDays !== null && e.idleDays >= staleDays) { e.class = 'stale'; e.reasons.push(`unmerged, idle ${e.idleDays} day(s)`); }
    else { e.class = 'keep'; if (safe) e.reasons.push(e.idleDays === null ? 'activity unknown' : `active (idle ${e.idleDays} day(s))`); }
    return e;
  });
}

function clean(repo, opts = {}) {
  const items = inspect(repo, opts);
  const targets = items.filter(e => e.class === 'remove' || (opts.includeStale && e.class === 'stale'));
  const actions = [];
  for (const e of targets) {
    const a = {path: e.path, branch: e.branch, class: e.class, steps: []};
    if (!opts.apply) { a.steps.push(e.prunableOnly ? 'would prune record' : 'would remove worktree'); if (opts.deleteBranch && e.branch) a.steps.push(`would delete branch ${e.branch} (safe)`); actions.push(a); continue; }
    if (!e.prunableOnly) {
      const r = git(repo, 'worktree', 'remove', e.path); // no --force: git refuses dirty trees
      a.steps.push(r.ok ? 'removed worktree' : `remove failed: ${r.err}`); a.ok = r.ok;
    } else a.ok = true;
    if (a.ok && opts.deleteBranch && e.branch) {
      const r = git(repo, 'branch', '-d', e.branch);
      a.steps.push(r.ok ? `deleted branch ${e.branch}` : `kept branch ${e.branch}: ${r.err.split('\n')[0]}`);
    }
    actions.push(a);
  }
  if (opts.apply) git(repo, 'worktree', 'prune');
  return {applied: !!opts.apply, items, actions};
}

module.exports = {inspect, clean, worktrees};

if (require.main === module) {
  const [cmd, repo, ...rest] = process.argv.slice(2);
  const flag = f => rest.includes(f), val = (f, d) => { const i = rest.indexOf(f); return i >= 0 ? rest[i + 1] : d; };
  if (!['list', 'clean'].includes(cmd) || !repo) { console.error('usage: factory-worktrees.cjs list|clean <repo> [--base main] [--stale-days 7] [--gh] [--include-stale] [--delete-branch] [--apply] [--json]'); process.exit(2); }
  const opts = {base: val('--base', 'main'), staleDays: Number(val('--stale-days', 7)), gh: flag('--gh'),
    includeStale: flag('--include-stale'), deleteBranch: flag('--delete-branch'), apply: flag('--apply')};
  const res = cmd === 'list' ? {items: inspect(repo, opts)} : clean(repo, opts);
  if (flag('--json')) { console.log(JSON.stringify(res, null, 2)); process.exit(0); }
  for (const e of res.items) console.log(`${e.class.padEnd(6)} ${e.branch || '(detached)'}  ${e.path}\n       ${e.reasons.join('; ')}`);
  if (res.actions) {
    console.log(res.applied ? '\nApplied:' : '\nDry run (add --apply to act):');
    if (!res.actions.length) console.log('  nothing to clean');
    for (const a of res.actions) console.log(`  ${a.branch || a.path}: ${a.steps.join(', ')}`);
  }
}
