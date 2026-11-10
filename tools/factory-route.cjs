#!/usr/bin/env node
// Supply probe + quota/limit ledger + router (dynamic-execution.md). Deterministic; no model calls, no network.
// Nothing about models is hardcoded: supply comes from Hattera's live catalogs and usage log, capability is
// learned from recorded outcomes (or an editable policy file), price comes from what the engine reports.
//
//   supply   [--json]                         snapshot of engines/models/evidence -> state/routing/supply.json
//   route    <profile.json> [--exclude e/m,..] [--avoid engine,..] [--not-engine e] [--json]
//                                             ranked candidates + routing receipt -> state/routing/receipts/
//   limit    <engine> [--model m] [--reset ISO] [--model-scoped] --signal "<text>"  record a limit event
//            (account/engine-wide by default; --model-scoped only when the engine says the limit is per model)
//   detect   <engine> [--model m] <file|->      scan output text; classify + record limit signals
//   outcome  <engine> <model> <low|medium|high> <ok|transient|limit|broken|too-big|spec|repeated> [--slice id]
//   classify <file|->                          print failure class of an output text
//
// Env overrides (for tests): FACTORY_HATTERA_HOME, FACTORY_STATE_DIR.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const HOME = process.env.FACTORY_HATTERA_HOME || path.join(os.homedir(), '.openmausbot');
const STATE = process.env.FACTORY_STATE_DIR || path.join(__dirname, '..', 'state', 'routing');
const P = {
  config: path.join(HOME, 'config.json'),
  catalogs: path.join(HOME, 'providers', 'engine-models'),
  usage: path.join(HOME, 'usage'),
  supply: path.join(STATE, 'supply.json'),
  limits: path.join(STATE, 'limit-events.jsonl'),
  outcomes: path.join(STATE, 'outcomes.jsonl'),
  policy: path.join(STATE, 'route-policy.json'),
  receipts: path.join(STATE, 'receipts'),
};
const LEVELS = ['low', 'medium', 'high'];
const H = 3600e3;
const now = () => Date.now();
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, '')); } catch { return d; } };
const readJsonl = p => { try { return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; } };
const append = (p, o) => { fs.mkdirSync(path.dirname(p), {recursive: true}); fs.appendFileSync(p, JSON.stringify(o) + '\n'); };

// ---------- limit / failure signal detection (agent-yes style anchored phrases; heuristic, recorded verbatim)
const SIGNALS = [
  ['limit', /(you'?ve |you have )?(hit|reached|exceeded) (your |the )?(usage|rate|session|daily|weekly|5[- ]hour|monthly) limit/i],
  ['limit', /(usage|session|5[- ]hour|weekly|quota) (limit|window) (reached|exceeded|exhausted)/i],
  ['limit', /\b(quota|credits?) (exceeded|exhausted|depleted)|insufficient[_ ]quota|out of credits/i],
  ['limit', /\b429\b|too many requests|rate[_ ]limit(ed)?\b/i],
  ['too-big', /context (window|length) (exceeded|full|limit)|maximum context|prompt is too long|too many tokens|no activity for \d+ minutes/i],
  ['transient', /\b(50[0234])\b|service unavailable|overloaded|ECONNRESET|ETIMEDOUT|timed? ?out|internal service failure/i],
  ['broken', /model (not found|does not exist|unavailable|not supported)|invalid model|unknown model|unauthori[sz]ed|forbidden|\b40[13]\b/i],
];
function classify(text) {
  for (const [cls, re] of SIGNALS) { const m = text.match(re); if (m) return {class: cls, match: m[0]}; }
  return {class: null, match: null};
}
function resetHint(text) {
  const m = text.match(/(?:resets?|try again|available again)\s*(?:at|in|after)?\s*([^\n.;]{3,60})/i);
  return m ? m[1].trim() : null;
}

// ---------- supply
function usageRecords() {
  let files = [];
  try { files = fs.readdirSync(P.usage).filter(f => f.endsWith('.jsonl')).sort().slice(-2); } catch {}
  return files.flatMap(f => readJsonl(path.join(P.usage, f)));
}
function supply() {
  const cfg = readJson(P.config, {});
  const instances = Object.entries(cfg.instances || {}).map(([id, v]) => ({id, driver: v.driverKind || v.driver || null}));
  const usage = usageRecords();
  const t = now();
  const engines = [];
  for (const inst of instances) {
    const catPath = path.join(P.catalogs, inst.id + '.json');
    const cat = readJson(catPath, null);
    const catAt = cat ? fs.statSync(catPath).mtime.toISOString() : null;
    const recs = usage.filter(u => u.instanceId === inst.id);
    const byModel = {};
    for (const u of recs) {
      const m = byModel[u.model] ||= {runs: 0, lastRunAt: null, tokens5h: 0, tokens7d: 0, cost7d: 0, costReported: false};
      const at = Date.parse(u.at); m.runs++;
      if (!m.lastRunAt || at > Date.parse(m.lastRunAt)) m.lastRunAt = u.at;
      const tok = (u.input || 0) + (u.output || 0);
      if (t - at < 5 * H) m.tokens5h += tok;
      if (t - at < 168 * H) { m.tokens7d += tok; m.cost7d += u.costUsd || 0; }
      if (u.costSource === 'reported') m.costReported = true;
    }
    const catIds = new Set((cat?.options || []).map(o => o.id));
    const models = (cat?.options || []).map(o => ({
      id: o.id, label: o.label, contextWindow: o.contextWindow ?? null,
      // price as reported by the engine's own catalog label/id; otherwise unknown (never assumed $0)
      priceReported: /(^|[^a-z])free([^a-z]|$)/i.test(`${o.id} ${o.label}`) ? 'free' : 'unknown',
      inCatalog: true, usage: byModel[o.id] || null,
    }));
    for (const [id, u] of Object.entries(byModel)) if (!catIds.has(id))
      models.push({id, label: null, contextWindow: null, priceReported: 'unknown', inCatalog: false, withdrawnFromCatalog: !!cat, usage: u});
    const lastRun = recs.map(u => u.at).sort().pop() || null;
    engines.push({id: inst.id, driver: inst.driver, catalogAt: catAt, catalogStale: catAt ? t - Date.parse(catAt) > 24 * H : null,
      defaultModel: cat?.default ?? null, runEvidence: lastRun, models});
  }
  const snap = {observedAt: new Date(t).toISOString(), source: {config: P.config, catalogs: P.catalogs, usage: P.usage}, engines};
  fs.mkdirSync(STATE, {recursive: true});
  fs.writeFileSync(P.supply, JSON.stringify(snap, null, 2));
  return snap;
}

// ---------- ledger
function activeLimits(t = now()) {
  const act = new Map();
  for (const e of readJsonl(P.limits)) {
    const until = e.resetAt ? Date.parse(e.resetAt) : Date.parse(e.at) + (e.cooldownHours ?? 5) * H;
    // quota limits are account-wide unless explicitly recorded as model-scoped
    const key = e.scope === 'model' && e.model ? `${e.engine}/${e.model}` : e.engine;
    if (until > t) act.set(key, {...e, until: new Date(until).toISOString()});
  }
  return act;
}
function recordLimit(engine, model, signal, resetAt, scope = 'engine') {
  const e = {at: new Date().toISOString(), engine, model: model || null, scope, signal: String(signal).slice(0, 400), resetAt: resetAt || null,
    resetHint: resetAt ? null : resetHint(signal), cooldownHours: resetAt ? null : 5};
  append(P.limits, e); return e;
}

// ---------- learned capability
function capability(policy) {
  const cap = {}; // key engine/model -> {low:{ok,n},medium:..,high:..}
  for (const o of readJsonl(P.outcomes)) {
    if (o.result === 'limit' || o.result === 'transient') continue; // not a capability signal
    const k = `${o.engine}/${o.model}`;
    const c = (cap[k] ||= {}); const s = (c[o.complexity] ||= {ok: 0, n: 0});
    s.n++; if (o.result === 'ok') s.ok++;
  }
  const proven = (k, level) => {
    const pol = policy.models?.[k]?.maxComplexity;
    if (pol) return {ok: LEVELS.indexOf(pol) >= LEVELS.indexOf(level), source: 'policy'};
    // successes at this level or harder count for it; failures at this level or easier count against it
    // (failing a hard task says nothing about an easy one). Proven = >=2 relevant outcomes, >=70% success.
    let ok = 0, n = 0; const li = LEVELS.indexOf(level);
    LEVELS.forEach((l, i) => { const s = cap[k]?.[l]; if (!s) return;
      if (i >= li) { ok += s.ok; n += s.ok; }
      if (i <= li) n += s.n - s.ok; });
    if (n >= 2 && ok / n >= 0.7) return {ok: true, source: `outcomes ${ok}/${n}`, rate: ok / n};
    if (n >= 2) return {ok: false, source: `outcomes ${ok}/${n} below 70%`, rate: ok / n};
    return {ok: null, source: n ? `outcomes ${ok}/${n} (too few)` : 'no outcomes yet', rate: n ? ok / n : null};
  };
  return proven;
}

// ---------- router
const COST_RANK = {free: 0, subscription: 1, unknown: 2, metered: 3};
function effortFor(engineId, complexity, attempt, policy) {
  const levels = policy.engines?.[engineId]?.effortLevels;
  if (!levels || !levels.length) return {requested: 'engine-default', note: 'engine advertises no effort levels in policy; set engines.<id>.effortLevels from the engine'};
  const want = {low: 'low', medium: 'medium', high: 'high'}[complexity];
  let i = levels.indexOf(want); if (i < 0) i = Math.round((LEVELS.indexOf(complexity) / 2) * (levels.length - 1));
  i = Math.min(levels.length - 1, i + Math.max(0, (attempt || 1) - 1));
  return {requested: levels[i]};
}
function route(profile, opts = {}) {
  const policy = readJson(P.policy, {});
  const snap = opts.snapshot || supply();
  const limits = activeLimits();
  const proven = capability(policy);
  const cx = LEVELS.includes(profile.complexity) ? profile.complexity : 'medium';
  const budget = profile.budget || 'free-first';
  const needs = profile.needs || {};
  const exclude = new Set(opts.exclude || []);
  const avoid = new Set(opts.avoid || []);
  const rejected = [], cands = [];
  for (const e of snap.engines) {
    const epol = policy.engines?.[e.id] || {};
    if (epol.disabled) continue;
    const pool = e.models.filter(m => m.usage || policy.models?.[`${e.id}/${m.id}`] || m.id === e.defaultModel || (m.priceReported === 'free' && epol.trialFree !== false));
    for (const m of pool) {
      const key = `${e.id}/${m.id}`;
      const rej = r => rejected.push({candidate: key, reason: r});
      if (policy.models?.[key]?.disabled) { rej('disabled in policy'); continue; }
      if (!m.inCatalog) { rej(m.withdrawnFromCatalog ? 'no longer in engine catalog' : 'no catalog for engine'); continue; }
      if (exclude.has(key) || exclude.has(e.id)) { rej('excluded (failed or in use for this slice)'); continue; }
      if (opts.notEngine && e.id === opts.notEngine) { rej('same engine as builder (verifier must differ)'); continue; }
      const lim = limits.get(key) || limits.get(e.id);
      if (lim) { rej(`limit active until ${lim.until}: ${lim.signal.slice(0, 80)}`); continue; }
      const mpol = policy.models?.[key] || {};
      const ctx = m.contextWindow ?? mpol.contextWindow ?? null;
      if (needs.contextTokens && ctx && ctx < needs.contextTokens) { rej(`context ${ctx} < needed ${needs.contextTokens}`); continue; }
      const img = mpol.imageInput ?? null;
      if (needs.imageInput && img === false) { rej('no image input'); continue; }
      const cap = proven(key, cx);
      if (cap.ok === false) { rej(`not capable enough for ${cx}: ${cap.source}`); continue; }
      const cost = m.priceReported === 'free' ? 'free' : (mpol.costClass || epol.costClass || 'unknown');
      const flags = [];
      if (cap.ok === null) flags.push('unproven');
      if (needs.imageInput && img === null) flags.push('image input unknown');
      if (needs.contextTokens && !ctx) flags.push('context size unknown');
      if (e.catalogStale) flags.push('catalog stale: re-probe engine');
      if (!m.usage) flags.push('never run here');
      if (avoid.has(e.id)) flags.push('engine busy with a parallel slice');
      cands.push({engine: e.id, model: m.id, label: m.label, cost, capability: cap, flags,
        effort: effortFor(e.id, cx, profile.attempt, policy), usage5hTokens: m.usage?.tokens5h ?? 0, runs: m.usage?.runs ?? 0});
    }
  }
  // unproven models only ride on low complexity, or as last resort if nothing proven exists
  const provenSet = cands.filter(c => c.capability.ok === true);
  let pool = cands;
  const coldStart = cx !== 'low' && !provenSet.length;
  if (coldStart) for (const c of cands) c.flags.push('cold start: no proven candidate for ' + cx);
  if (cx !== 'low' && provenSet.length) {
    for (const c of cands.filter(c => c.capability.ok !== true)) rejected.push({candidate: `${c.engine}/${c.model}`, reason: `unproven for ${cx}; proven candidates exist`});
    pool = provenSet;
  }
  const needUnknown = c => c.flags.filter(f => / unknown$/.test(f)).length;
  const score = c => [
    avoid.has(c.engine) ? 1 : 0,
    needUnknown(c),                                   // a hard need we cannot confirm outranks price
    coldStart && c.flags.includes('never run here') ? 1 : 0,
    coldStart ? -(c.runs || 0) : 0,                   // cold start: prefer routes that actually ran here
    budget === 'best-quality' ? -(c.capability.rate ?? 0) : COST_RANK[c.cost] ?? 2,
    c.capability.ok === true ? 0 : 1,
    budget === 'best-quality' ? COST_RANK[c.cost] ?? 2 : -(c.capability.rate ?? 0),
    c.flags.length,
    c.usage5hTokens,
  ];
  pool.sort((a, b) => { const x = score(a), y = score(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; });
  const receipt = {
    slice: profile.slice || null, decidedAt: new Date().toISOString(), supplyObservedAt: snap.observedAt,
    profile: {complexity: cx, budget, needs, attempt: profile.attempt || 1},
    choice: pool[0] || null,
    coldStart,
    reason: pool[0] ? `${coldStart ? 'COLD START (no proven candidate; record outcomes) — ' : ''}cheapest-capable for ${cx}/${budget}: cost=${pool[0].cost}, capability=${pool[0].capability.source}${pool[0].flags.length ? ', flags=' + pool[0].flags.join('; ') : ''}` :
      'no candidate: mark slice waiting-for-quota or escalate (see rejected)',
    fallbacks: pool.slice(1, 4),
    rejected, activeLimits: [...limits.values()],
    effortApplied: 'unknown until the engine confirms; record it in evidence.json',
  };
  fs.mkdirSync(P.receipts, {recursive: true});
  const f = path.join(P.receipts, `${(profile.slice || 'adhoc').replace(/[^\w.-]/g, '_')}-${Date.now()}.json`);
  fs.writeFileSync(f, JSON.stringify(receipt, null, 2)); receipt.file = f;
  return receipt;
}

// ---------- CLI
if (require.main === module) {
  const a = process.argv.slice(2);
  const flag = n => { const i = a.indexOf(n); if (i < 0) return undefined; const v = a[i + 1]; a.splice(i, 2); return v; };
  const has = n => { const i = a.indexOf(n); if (i < 0) return false; a.splice(i, 1); return true; };
  const readIn = f => f === '-' || !f ? fs.readFileSync(0, 'utf8') : fs.readFileSync(f, 'utf8');
  const json = has('--json');
  const cmd = a.shift();
  try {
    if (cmd === 'supply') {
      const s = supply();
      if (json) console.log(JSON.stringify(s, null, 2));
      else for (const e of s.engines) {
        const used = e.models.filter(m => m.usage);
        console.log(`${e.id.padEnd(13)} catalog=${e.catalogAt ? e.catalogAt.slice(0, 16) : 'none'}${e.catalogStale ? ' (stale)' : ''} models=${e.models.filter(m => m.inCatalog).length} free=${e.models.filter(m => m.priceReported === 'free').length} lastRun=${e.runEvidence || '-'}`);
        for (const m of used) console.log(`    ran ${m.id}${m.inCatalog ? '' : '  [WITHDRAWN from catalog]'} runs=${m.usage.runs} 5h_tokens=${m.usage.tokens5h}`);
      }
    } else if (cmd === 'route') {
      const prof = JSON.parse(readIn(a[0]).replace(/^﻿/, ''));
      const r = route(prof, {exclude: (flag('--exclude') || '').split(',').filter(Boolean), avoid: (flag('--avoid') || '').split(',').filter(Boolean), notEngine: flag('--not-engine')});
      if (json) console.log(JSON.stringify(r, null, 2));
      else {
        console.log(r.choice ? `CHOICE ${r.choice.engine}/${r.choice.model} effort=${r.choice.effort.requested}` : 'NO CANDIDATE');
        console.log(`  ${r.reason}`);
        for (const f of r.fallbacks) console.log(`  fallback ${f.engine}/${f.model} (${f.cost}, ${f.capability.source})`);
        console.log(`  rejected ${r.rejected.length}; receipt ${r.file}`);
      }
      process.exit(r.choice ? 0 : 3);
    } else if (cmd === 'limit') {
      const model = flag('--model'), reset = flag('--reset'), signal = flag('--signal'), ms = has('--model-scoped');
      if (!a[0] || !signal) throw Error('usage: limit <engine> [--model m] [--reset ISO] --signal "<text>"');
      console.log(JSON.stringify(recordLimit(a[0], model, signal, reset, ms ? 'model' : 'engine')));
    } else if (cmd === 'detect') {
      const model = flag('--model'); const engine = a[0]; const text = readIn(a[1]);
      const c = classify(text);
      if (c.class === 'limit') { const i = text.indexOf(c.match); const e = recordLimit(engine, model, text.slice(Math.max(0, i - 40), i + 200).trim(), null, has('--model-scoped') ? 'model' : 'engine'); console.log(JSON.stringify({...c, recorded: e})); }
      else console.log(JSON.stringify(c));
    } else if (cmd === 'classify') {
      console.log(JSON.stringify(classify(readIn(a[0]))));
    } else if (cmd === 'outcome') {
      const slice = flag('--slice'), note = flag('--note');
      const [engine, model, complexity, result] = a;
      if (!LEVELS.includes(complexity) || !['ok', 'transient', 'limit', 'broken', 'too-big', 'spec', 'repeated'].includes(result)) throw Error('usage: outcome <engine> <model> <low|medium|high> <ok|transient|limit|broken|too-big|spec|repeated>');
      const o = {at: new Date().toISOString(), engine, model, complexity, result, slice: slice || null, note: note || null};
      append(P.outcomes, o); console.log(JSON.stringify(o));
    } else {
      console.error('commands: supply | route | limit | detect | outcome | classify  (see header)'); process.exit(2);
    }
  } catch (e) { console.error(e.message); process.exit(2); }
}
module.exports = {classify, supply, route, recordLimit, activeLimits, P};
