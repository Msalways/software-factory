#!/usr/bin/env node
// Verify gate checker (gates-and-handoffs.md): checks concrete signals, never agent claims.
// Usage: node tools/factory-gates.cjs check <worktree> <evidence.json> [--base <rev>] [--run] [--json]
//   artifacts_exist     commit exists, tree clean, evidence present, screenshots present
//   diff_matches_claims actual changed files == evidence.changedFiles; outside expected surface explained
//   tests_pass          with --run, re-executes evidence.checks[].command and compares exit codes;
//                       without --run, reports "not-run" (the verifier must run them itself)
// Exit code 0 only if every gate passes. No network, no model calls.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {checkBriefFile} = require('./factory-brief.cjs');

function git(cwd, args) {
  const r = spawnSync('git', args, {cwd, encoding: 'utf8'});
  return {ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim()};
}
const norm = p => p.replace(/\\/g, '/').replace(/^\.\//, '');

function matchesSurface(file, surface) {
  return surface.some(s => {
    const n = norm(s);
    if (n.endsWith('/**') || n.endsWith('/')) return file.startsWith(n.replace(/\*\*$/, '').replace(/\/?$/, '/'));
    if (n.includes('*')) {
      const re = new RegExp('^' + n.split('*').map(x => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*') + '$');
      return re.test(file);
    }
    return file === n || file.startsWith(n + '/');
  });
}

function check(worktree, evidencePath, opts = {}) {
  const res = {gates: {}, findings: [], worktree, evidence: evidencePath};
  const fail = (gate, msg) => { res.gates[gate] = 'fail'; res.findings.push(`${gate}: ${msg}`); };
  const pass = gate => { if (!res.gates[gate]) res.gates[gate] = 'pass'; };

  // ---- artifacts_exist
  let ev = null;
  if (!fs.existsSync(evidencePath)) fail('artifacts_exist', `evidence file missing: ${evidencePath}`);
  else {
    try { ev = JSON.parse(fs.readFileSync(evidencePath, 'utf8').replace(/^\uFEFF/, '')); }
    catch (e) { fail('artifacts_exist', `evidence.json is not valid JSON: ${e.message}`); }
  }
  if (!git(worktree, ['rev-parse', '--is-inside-work-tree']).ok) fail('artifacts_exist', 'not a git worktree');
  const head = git(worktree, ['rev-parse', 'HEAD']).out;
  if (ev) {
    for (const k of ['revision', 'changedFiles', 'checks']) if (ev[k] === undefined) fail('artifacts_exist', `evidence missing field "${k}"`);
    if (ev.revision) {
      const full = git(worktree, ['rev-parse', '--verify', `${ev.revision}^{commit}`]);
      if (!full.ok) fail('artifacts_exist', `claimed revision ${ev.revision} does not exist`);
      else if (full.out !== head) fail('artifacts_exist', `claimed revision ${ev.revision} is not HEAD (${head.slice(0, 12)}); verify the tested revision`);
    }
    for (const s of ev.screenshots || []) {
      const p = path.isAbsolute(s.path) ? s.path : path.join(worktree, s.path);
      if (!fs.existsSync(p)) fail('artifacts_exist', `screenshot missing: ${s.path}`);
    }
    if (opts.requireScreenshots && !(ev.screenshots || []).length) fail('artifacts_exist', 'UI slice but no screenshots recorded');
  }
  const status = git(worktree, ['status', '--porcelain', '--untracked-files=normal']).out;
  // evidence/screenshot files themselves may be untracked; ignore them
  const ignore = new Set([evidencePath, ...((ev && ev.screenshots) || []).map(s => s.path)].map(p => norm(path.relative(worktree, path.resolve(worktree, p)))));
  const dirty = status.split('\n').filter(Boolean).map(l => norm(l.slice(3))).filter(f => !ignore.has(f));
  if (dirty.length) fail('artifacts_exist', `working tree not clean: ${dirty.slice(0, 10).join(', ')}`);
  if (ev && ev.treeClean === true && dirty.length) res.findings.push('claim mismatch: evidence says treeClean=true but tree is dirty');
  pass('artifacts_exist');

  // Optional for legacy evidence; required when a new slice declares its brief.
  if (ev && ev.brief) {
    const brief = checkBriefFile(path.resolve(worktree,ev.brief));
    if (brief.pass) pass('brief_complete');
    else for (const finding of brief.findings) fail('brief_complete',finding);
  }

  // ---- diff_matches_claims
  if (!ev) fail('diff_matches_claims', 'no evidence to compare');
  else {
    const base = opts.base || ev.baseline;
    if (!base) fail('diff_matches_claims', 'no base revision (pass --base or set evidence.baseline)');
    else {
      const d = git(worktree, ['diff', '--name-only', `${base}...HEAD`]);
      if (!d.ok) fail('diff_matches_claims', `git diff failed: ${d.err}`);
      else {
        const actual = new Set(d.out.split('\n').filter(Boolean).map(norm));
        const claimed = new Set((ev.changedFiles || []).map(norm));
        const unclaimed = [...actual].filter(f => !claimed.has(f));
        const phantom = [...claimed].filter(f => !actual.has(f));
        if (unclaimed.length) fail('diff_matches_claims', `changed but not claimed: ${unclaimed.join(', ')}`);
        if (phantom.length) fail('diff_matches_claims', `claimed but not changed: ${phantom.join(', ')}`);
        const surface = ev.expectedSurface || opts.surface;
        if (surface && surface.length) {
          const explained = new Set((ev.outsideExpectedSurface || []).map(o => norm(o.path)));
          const outside = [...actual].filter(f => !matchesSurface(f, surface) && !explained.has(f));
          if (outside.length) fail('diff_matches_claims', `outside expected surface without explanation: ${outside.join(', ')}`);
        } else res.findings.push('diff_matches_claims: no expectedSurface in evidence; surface not checked');
        res.diff = {base, files: [...actual]};
      }
    }
  }
  pass('diff_matches_claims');

  // ---- tests_pass
  const checks = (ev && ev.checks) || [];
  if (!checks.length) fail('tests_pass', 'no checks recorded');
  else if (!opts.run) {
    res.gates.tests_pass = 'not-run';
    res.findings.push('tests_pass: not re-run (use --run); claimed results are not evidence');
    const claimedFail = checks.filter(c => c.exitCode !== 0);
    if (claimedFail.length) fail('tests_pass', `evidence itself reports failing checks: ${claimedFail.map(c => c.command).join(' | ')}`);
  } else {
    res.runs = [];
    for (const c of checks) {
      const t0 = Date.now();
      const r = spawnSync(c.command, {cwd: worktree, shell: true, encoding: 'utf8', timeout: opts.timeoutMs || 15 * 60 * 1000, maxBuffer: 64 * 1024 * 1024});
      const code = r.status === null ? (r.error ? 'error' : 'timeout') : r.status;
      res.runs.push({command: c.command, exitCode: code, claimed: c.exitCode, ms: Date.now() - t0, tail: ((r.stdout || '') + (r.stderr || '')).slice(-1500)});
      if (code !== 0) fail('tests_pass', `"${c.command}" exited ${code}`);
      if (c.exitCode !== undefined && c.exitCode !== code) res.findings.push(`claim mismatch: "${c.command}" claimed exit ${c.exitCode}, actual ${code}`);
    }
  }
  pass('tests_pass');

  res.revision = head;
  res.checkedAt = new Date().toISOString();
  res.pass = Object.values(res.gates).every(v => v === 'pass');
  return res;
}

if (require.main === module) {
  const a = process.argv.slice(2);
  if (a[0] === 'brief') {
    const result = checkBriefFile(a[1] || '');
    console.log(JSON.stringify(result,null,2));
    process.exit(result.pass ? 0 : 1);
  }
  const flag = n => { const i = a.indexOf(n); if (i < 0) return undefined; const v = a[i + 1]; a.splice(i, 2); return v; };
  const has = n => { const i = a.indexOf(n); if (i < 0) return false; a.splice(i, 1); return true; };
  const base = flag('--base'), run = has('--run'), json = has('--json'), ui = has('--ui');
  if (a[0] !== 'check' || a.length < 3) {
    console.error('usage: factory-gates.cjs check <worktree> <evidence.json> [--base <rev>] [--run] [--ui] [--json]');
    process.exit(2);
  }
  const r = check(path.resolve(a[1]), path.resolve(a[2]), {base, run, requireScreenshots: ui});
  if (json) console.log(JSON.stringify(r, null, 2));
  else {
    for (const [g, v] of Object.entries(r.gates)) console.log(`${v.toUpperCase().padEnd(8)} ${g}`);
    for (const f of r.findings) console.log(`  - ${f}`);
    console.log(r.pass ? 'ALL GATES PASS' : 'GATES NOT PASSED');
  }
  process.exit(r.pass ? 0 : 1);
}
module.exports = {check, matchesSurface};
