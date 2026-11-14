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


const sha256 = bytes => require('node:crypto').createHash('sha256').update(bytes).digest('hex');
function checkUi(worktree, ev, head) {
  const result = {status:'incomplete',required:[],covered:[],missing:[],invalid:[],reasons:[]};
  const need = (ok, reason) => { if (!ok) throw Error(reason); };
  const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const text = v => typeof v === 'string' && v.trim().length > 0;
  const integer = v => Number.isInteger(v) && v > 0;
  const local = p => {need(text(p),'missing file path');return path.resolve(worktree,p);};
  try {
    need(object(ev) && object(ev.ui),'UI evidence missing; migrate legacy count-only screenshots to a spec matrix');
    const ui=ev.ui;
    // Decode fatally; preserve BOM until the specified single-BOM normalization.
    const spec=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(fs.readFileSync(local(ui.specPath))).replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
    need(ui.specSha256 === sha256(spec),'spec digest mismatch');
    const start='<!-- factory-ui-requirements:start -->',end='<!-- factory-ui-requirements:end -->';
    need(spec.split(start).length===2 && spec.split(end).length===2,'exactly one requirements block required');
    const block=spec.slice(spec.indexOf(start)+start.length,spec.indexOf(end));
    const match=block.match(/^\s*\x60\x60\x60json\s*\n([\s\S]*?)\n\x60\x60\x60\s*$/);
    need(match,'malformed requirements block');const req=JSON.parse(match[1]);
    need(object(req)&&req.schema==='factory-ui-requirements/1'&&text(req.specVersion)&&req.specVersion===ev.specVersion,'requirements schema/version mismatch');
    const ids=(items,viewport)=>{need(Array.isArray(items)&&items.length>0,'empty requirements');const map=new Map();for(const item of items){need(object(item)&&text(item.id)&&!map.has(item.id),'invalid/duplicate requirement ID');if(viewport)need(integer(item.width)&&integer(item.height)&&(item.deviceScaleFactor===undefined||(Number.isFinite(item.deviceScaleFactor)&&item.deviceScaleFactor>0)),'invalid viewport geometry');else need(text(item.description),'missing state description');map.set(item.id,item);}return map;};
    const states=ids(req.states,false),ports=ids(req.viewports,true);
    for(const state of states.keys())for(const viewport of ports.keys())result.required.push({state,viewport});
    need(Array.isArray(ev.screenshots),'screenshots must be an array');
    need(object(ui.capture)&&['available','unavailable'].includes(ui.capture.status),'invalid capture status');
    if(ui.capture.status==='unavailable')need(text(ui.capture.reason),'unavailable capture requires reason');
    const cells=new Set(),physical=new Set(),inodes=new Set(),triples=[];
    for(const shot of ev.screenshots){
      try {
        need(object(shot)&&states.has(shot.state)&&ports.has(shot.viewport),'unknown screenshot cell');
        const cell=JSON.stringify([shot.state,shot.viewport]);need(!cells.has(cell),'duplicate screenshot cell');cells.add(cell);
        const file=local(shot.path),real=fs.realpathSync(file);need(!physical.has(real),'reused physical screenshot');physical.add(real);
        const stat=fs.statSync(file);need(stat.isFile(),'screenshot is not a regular file');const inode=stat.dev+':'+stat.ino;need(!inodes.has(inode),'reused physical screenshot');inodes.add(inode);const bytes=fs.readFileSync(file);
        const png=bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
        const jpeg=bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
        const webp=bytes.length>=12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
        need(png||jpeg||webp,'empty/nonimage screenshot');const hash=sha256(bytes);
        need(typeof shot.sha256==='string'&&shot.sha256.toLowerCase()===hash,'screenshot digest mismatch');
        need(/^[0-9a-f]{40}$/.test(head)&&ev.revision===head&&shot.revision===head,'screenshot revision mismatch');
        const p=ports.get(shot.viewport),factor=p.deviceScaleFactor??1;
        need(integer(shot.pixelWidth)&&integer(shot.pixelHeight)&&(shot.fullPage===undefined||typeof shot.fullPage==='boolean'),'invalid screenshot geometry');
        need(shot.pixelWidth===Math.round(p.width*factor)&&(shot.fullPage?shot.pixelHeight>=Math.round(p.height*factor):shot.pixelHeight===Math.round(p.height*factor)),'declared geometry mismatch');
        result.covered.push({state:shot.state,viewport:shot.viewport});triples.push([shot.state,shot.viewport,hash]);
      }catch(error){result.invalid.push({state:shot?.state??null,viewport:shot?.viewport??null,reason:error.message});}
    }
    result.missing=result.required.filter(cell=>!result.covered.some(c=>c.state===cell.state&&c.viewport===cell.viewport));
    if(result.invalid.length){result.reasons.push('invalid designated screenshot metadata/artifacts');return result;}
    if(ui.review!==undefined){const r=ui.review;need(object(r)&&['clean','open'].includes(r.result)&&text(r.reviewer)&&r.revision===head&&typeof r.screenshotSetSha256==='string'&&/^[0-9a-f]{64}$/.test(r.screenshotSetSha256),'invalid review shape');const report=local(r.path);need(fs.statSync(report).isFile()&&fs.statSync(report).size>0,'empty review report');}
    if(ui.capture.status==='unavailable'&&ev.screenshots.length===0){result.status='unrendered';result.reasons.push(ui.capture.reason);return result;}
    if(result.missing.length||ui.capture.status==='unavailable'){result.reasons.push(ui.capture.reason||'required cells missing');return result;}
    const review=ui.review;need(object(review)&&['clean','open'].includes(review.result)&&text(review.reviewer)&&review.revision===head,'missing/invalid/stale review');
    const report=local(review.path);need(fs.statSync(report).isFile()&&fs.statSync(report).size>0,'empty review report');
    triples.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:a[1]<b[1]?-1:a[1]>b[1]?1:0);
    need(review.screenshotSetSha256===sha256(JSON.stringify(triples)),'review screenshot set mismatch');
    result.status=review.result;if(review.result==='open')result.reasons.push('review has open findings');
  }catch(error){result.reasons.push(error.message);}
  return result;
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
    if (ev.screenshots !== undefined && !Array.isArray(ev.screenshots)) fail('artifacts_exist', 'screenshots must be an array when present');
    for (const s of (Array.isArray(ev.screenshots) ? ev.screenshots : [])) {
      if (!s || typeof s.path !== 'string') { if (!opts.requireScreenshots) fail('artifacts_exist', 'invalid screenshot path'); continue; }
      const p = path.isAbsolute(s.path) ? s.path : path.join(worktree, s.path);
      if (!fs.existsSync(p)) fail('artifacts_exist', `screenshot missing: ${s.path}`);
    }
    if (opts.requireScreenshots && !(ev.screenshots || []).length) fail('artifacts_exist', 'UI slice but no screenshots recorded');
  }
  const status = git(worktree, ['status', '--porcelain', '--untracked-files=normal']).out;
  // evidence/screenshot files themselves may be untracked; ignore them
  const ignore = new Set([evidencePath, ...(Array.isArray(ev?.screenshots) ? ev.screenshots : []).filter(s=>s&&typeof s.path==='string').map(s => s.path)].map(p => norm(path.relative(worktree, path.resolve(worktree, p)))));
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

  if (opts.requireScreenshots) {
    res.uiEvidence=checkUi(worktree,ev,head);
    if(res.uiEvidence.status==='clean')pass('ui_coverage');
    else fail('ui_coverage',res.uiEvidence.status+': '+res.uiEvidence.reasons.join('; '));
  } else if(ev?.ui) res.findings.push('UI_EVIDENCE_NOT_ENFORCED: UI surface requires --ui; metadata was not checked');
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
    if(r.uiEvidence) console.log('UI EVIDENCE: '+r.uiEvidence.status);
    for (const [g, v] of Object.entries(r.gates)) console.log(`${v.toUpperCase().padEnd(8)} ${g}`);
    for (const f of r.findings) console.log(`  - ${f}`);
    console.log(r.pass ? 'ALL GATES PASS' : 'GATES NOT PASSED');
  }
  process.exit(r.pass ? 0 : 1);
}
module.exports = {check, matchesSurface};
