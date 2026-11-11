#!/usr/bin/env node
// Supply probe + quota/limit ledger + router (dynamic-execution.md). Deterministic; no model calls, no network.
// Nothing about models is hardcoded: supply comes from Hattera's live catalogs and usage log, capability is
// learned from recorded outcomes (or an editable policy file), price comes from what the engine reports.
//
//   supply   [--json]                         snapshot of engines/models/evidence -> state/routing/supply.json
//   route    <profile.json> [--work-kind kind] [--exclude e/m,..] [--avoid engine,..] [--not-engine e] [--json]
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
const defaults = require('./route-defaults.json');

const HOME = process.env.FACTORY_HATTERA_HOME || path.join(os.homedir(), '.openmausbot');
const STATE = process.env.FACTORY_STATE_DIR || path.join(__dirname, '..', 'state', 'routing');
const P = {
  config: path.join(HOME, 'config.json'),
  bots: path.join(HOME, 'bots.json'),
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
// Mirror Hattera's configuredBotModels owner gate. Catalog defaults, usage,
// prices and policy entries are observations/preferences, never permission.
function configuredModels() {
  const cfg = readJson(P.config, {}), saved = readJson(P.bots, []);
  const bots = Array.isArray(saved) ? saved : [];
  const selections = [cfg.defaultModelSelection, cfg.newBotDefaults?.profile?.modelSelection,
    ...bots.flatMap(bot => [bot.modelSelection, ...(Array.isArray(bot.tasks) ? bot.tasks : []).map(task => task.modelSelection)])];
  return new Set(selections.filter(s => typeof s?.instanceId === 'string' && s.instanceId && typeof s.model === 'string' && s.model)
    .map(s => `${s.instanceId}/${s.model}`));
}
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
      // Only an explicit catalog field reports free status; names are not price evidence.
      priceReported: o.priceReported === 'free' ? 'free' : 'unknown',
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
    if (n >= policy.capability.minOutcomes && ok / n >= policy.capability.minSuccessRate) return {ok: true, source: `outcomes ${ok}/${n}`, rate: ok / n};
    if (n >= policy.capability.minOutcomes) return {ok: false, source: `outcomes ${ok}/${n} below ${policy.capability.minSuccessRate * 100}%`, rate: ok / n};
    return {ok: null, source: n ? `outcomes ${ok}/${n} (too few)` : 'no outcomes yet', rate: n ? ok / n : null};
  };
  return proven;
}

// ---------- router
function readPolicy() {
  let text;
  try { text = fs.readFileSync(P.policy, 'utf8'); }
  catch (error) {
    if (error.code === 'ENOENT') return {};
    throw new Error(`Cannot read routing policy ${P.policy}: ${error.message}`, {cause: error});
  }
  try {
    const policy = JSON.parse(text.replace(/^\uFEFF/, ''));
    if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw Error('expected an object');
    return policy;
  } catch (error) { throw new Error(`Invalid routing policy ${P.policy}: ${error.message}`, {cause: error}); }
}

// For nonnegative finite observations, differences and incremental means cannot
// overflow as a raw sum can. Empty samples alone represent unknown measurements.
const mean = values => {
  if (!values?.length) return null;
  const average = values.reduce((m, x, i) => m + (x - m) / (i + 1), 0);
  // A positive mean below the representable range stays positive rather than
  // becoming evidence of zero cost/latency through floating-point underflow.
  return average || (values.some(x => x > 0) ? Number.MIN_VALUE : 0);
};
const normalizedPenalty = (value, scale) => value <= scale
  ? (value / scale) / (1 + value / scale)
  : 1 / (1 + scale / value);

function scoringPolicy(raw) {
  for (const [key, value] of [...['capability', 'costRank', 'balanced', 'engines', 'models', 'workKindTiers'].map(k => [k, raw[k]]),
    ['balanced.weights', raw.balanced?.weights]]) {
    if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value))) {
      throw Error(`invalid routing policy ${key}: expected an object`);
    }
  }
  const policy = {...raw,
    capability: {...defaults.capability, ...raw.capability},
    costRank: {...defaults.costRank, ...raw.costRank},
    balanced: {...defaults.balanced, ...raw.balanced,
      weights: {...defaults.balanced.weights, ...raw.balanced?.weights}}};
  for (const [kind, tier] of Object.entries(policy.workKindTiers || {})) {
    if (typeof tier !== 'string' || !tier.trim()) throw Error(`invalid routing policy workKindTiers.${kind}`);
  }
  for (const [key, model] of Object.entries(policy.models || {})) {
    if (model?.tier !== undefined && (typeof model.tier !== 'string' || !model.tier.trim())) throw Error(`invalid routing policy models.${key}.tier`);
  }
  const finite = (name, value, min, max = Infinity) => {
    if (!Number.isFinite(value) || value < min || value > max) throw Error(`invalid routing policy ${name}`);
  };
  finite('capability.minOutcomes', policy.capability.minOutcomes, 1);
  if (!Number.isInteger(policy.capability.minOutcomes)) throw Error('minOutcomes must be an integer');
  finite('capability.minSuccessRate', policy.capability.minSuccessRate, 0, 1);
  for (const key of Object.keys(defaults.costRank)) finite(`costRank.${key}`, policy.costRank[key], 0);
  for (const key of Object.keys(defaults.balanced.weights)) finite(`balanced.weights.${key}`, policy.balanced.weights[key], 0);
  if (!Object.values(policy.balanced.weights).some(v => v > 0)) throw Error('balanced weights must not all be zero');
  for (const key of ['costScaleUsd', 'latencyScaleMs']) {
    finite(`balanced.${key}`, policy.balanced[key], Number.MIN_VALUE);
  }
  finite('balanced.unknownPenalty', policy.balanced.unknownPenalty, 1);
  return policy;
}
function effortFor(engineId, complexity, attempt, policy) {
  const levels = policy.engines?.[engineId]?.effortLevels;
  if (!levels || !levels.length) return {requested: 'engine-default', note: 'engine advertises no effort levels in policy; set engines.<id>.effortLevels from the engine'};
  const want = {low: 'low', medium: 'medium', high: 'high'}[complexity];
  let i = levels.indexOf(want); if (i < 0) i = Math.round((LEVELS.indexOf(complexity) / 2) * (levels.length - 1));
  i = Math.min(levels.length - 1, i + Math.max(0, (attempt || 1) - 1));
  return {requested: levels[i]};
}
function route(profile, opts = {}) {
  const policy = scoringPolicy(readPolicy());
  const COST_RANK = policy.costRank;
  const snap = opts.snapshot || supply();
  const authorized = configuredModels();
  const workKind = opts.workKind ?? profile.workKind;
  if (workKind !== undefined && (typeof workKind !== 'string' || !workKind.trim())) throw Error('workKind must be a nonempty string');
  const tier = workKind ? policy.workKindTiers?.[workKind] ?? null : null;
  const limits = activeLimits();
  const proven = capability(policy);
  // Observations are per completed attempt, not catalog claims or authorization.
  const observations = new Map();
  for (const o of readJsonl(P.outcomes)) {
    if (o.result === 'limit' || o.result === 'transient') continue;
    const key = `${o.engine}/${o.model}`;
    const s = observations.get(key) || {runs: 0, ok: 0, costs: [], durations: []};
    s.runs++; if (o.result === 'ok') s.ok++;
    if (Number.isFinite(o.costUsd) && o.costUsd >= 0) s.costs.push(o.costUsd);
    if (Number.isFinite(o.durationMs) && o.durationMs >= 0) s.durations.push(o.durationMs);
    observations.set(key, s);
  }
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
      if (!authorized.has(key)) { rej('not owner-authorized in current configured model selections'); continue; }
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
      const observed = observations.get(key);
      const measurements = {source: 'outcomes.jsonl', runs: observed?.runs || 0,
        successRate: observed ? observed.ok / observed.runs : null,
        costUsdPerAttempt: mean(observed?.costs), costSamples: observed?.costs.length || 0,
        durationMsPerAttempt: mean(observed?.durations), durationSamples: observed?.durations.length || 0};
      if (budget === 'balanced' && measurements.costUsdPerAttempt === null) flags.push('observed cost unknown');
      if (budget === 'balanced' && measurements.durationMsPerAttempt === null) flags.push('observed latency unknown');
      cands.push({engine: e.id, model: m.id, label: m.label, cost, capability: cap, flags,
        measurements,
        effort: effortFor(e.id, cx, profile.attempt, policy), usage5hTokens: m.usage?.tokens5h ?? 0, runs: m.usage?.runs ?? 0});
    }
  }
  let eligible = cands, fallback = false, fallbackReason = null;
  if (workKind) {
    const inTier = tier ? cands.filter(c => policy.models?.[`${c.engine}/${c.model}`]?.tier === tier) : [];
    if (inTier.length) {
      eligible = inTier;
      for (const c of cands.filter(c => !inTier.includes(c))) rejected.push({candidate: `${c.engine}/${c.model}`, reason: `outside tier ${tier} for work kind ${workKind}`});
    } else {
      fallback = true;
      fallbackReason = `No eligible owner-authorized catalog candidates for tier ${tier ?? '(unmapped)'} and work kind ${workKind}; using previous ranking within authorized supply`;
    }
  }
  // Preserve the existing ranking/capability rules within the chosen supply.
  const provenSet = eligible.filter(c => c.capability.ok === true);
  let pool = eligible;
  const coldStart = cx !== 'low' && !provenSet.length;
  if (coldStart) for (const c of eligible) c.flags.push('cold start: no proven candidate for ' + cx);
  if (cx !== 'low' && provenSet.length) {
    for (const c of eligible.filter(c => c.capability.ok !== true)) rejected.push({candidate: `${c.engine}/${c.model}`, reason: `unproven for ${cx}; proven candidates exist`});
    pool = provenSet;
  }
  const needUnknown = c => c.flags.filter(f => /^(image input|context size) unknown$/.test(f)).length;
  // Fixed scales keep a route's score independent of which alternatives are present.
  // Missing observations receive a penalty of one, never a zero-cost assumption.
  const balancedScore = c => {
    const m = c.measurements;
    const b = policy.balanced;
    const terms = [
      [b.weights.failureRate, m.successRate === null ? b.unknownPenalty : 1 - m.successRate],
      [b.weights.cost, m.costUsdPerAttempt === null ? b.unknownPenalty : normalizedPenalty(m.costUsdPerAttempt, b.costScaleUsd)],
      [b.weights.latency, m.durationMsPerAttempt === null ? b.unknownPenalty : normalizedPenalty(m.durationMsPerAttempt, b.latencyScaleMs)],
    ];
    // A relative weighted mean preserves ranking and avoids overflowing either
    // weight sums or weight*penalty products for accepted finite policy values.
    const scale = Math.max(...terms.map(([w]) => w));
    let score = 0, total = 0;
    for (const [weight, penalty] of terms) {
      const w = weight / scale;
      if (!w) continue;
      total += w;
      score += (penalty - score) * (w / total);
    }
    return score;
  };
  const score = c => [
    avoid.has(c.engine) ? 1 : 0,
    needUnknown(c),                                   // a hard need we cannot confirm outranks price
    coldStart && c.flags.includes('never run here') ? 1 : 0,
    coldStart ? -(c.runs || 0) : 0,                   // cold start: prefer routes that actually ran here
    budget === 'balanced' ? balancedScore(c) : budget === 'best-quality' ? -(c.capability.rate ?? 0) : COST_RANK[c.cost] ?? 2,
    c.capability.ok === true ? 0 : 1,
    budget === 'best-quality' ? COST_RANK[c.cost] ?? 2 : -(c.capability.rate ?? 0),
    c.flags.length,
    c.usage5hTokens,
  ];
  for (const c of pool) c.score = score(c);
  pool.sort((a, b) => { const x = score(a), y = score(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; });
  const receipt = {
    slice: profile.slice || null, decidedAt: new Date().toISOString(), supplyObservedAt: snap.observedAt,
    profile: {complexity: cx, budget, needs, attempt: profile.attempt || 1},
    choice: pool[0] || null,
    coldStart,
    workKind: workKind ?? null, tier, fallback, fallbackReason,
    authorization: {source: [P.config, P.bots], rule: 'current configured model selections only'},
    scoring: {policy: budget, ...(budget === 'balanced' ? policy.balanced : {}), capability: policy.capability, costRank: policy.costRank,
      defaultsSource: 'tools/route-defaults.json', overridesSource: P.policy},
    reason: pool[0] ? `${coldStart ? 'COLD START (no proven candidate; record outcomes) — ' : ''}${budget === 'balanced' ? 'lowest measured balanced penalty' : 'cheapest-capable'} for ${cx}/${budget}: cost=${pool[0].cost}, capability=${pool[0].capability.source}${pool[0].flags.length ? ', flags=' + pool[0].flags.join('; ') : ''}` :
      'no candidate: mark slice waiting-for-quota or escalate (see rejected)',
    fallbacks: pool.slice(1, 4),
    rejected, activeLimits: [...limits.values()],
    effortApplied: 'unknown until the engine confirms; record it in evidence.json',
  };
  if (fallbackReason) receipt.reason += `; ${fallbackReason}`;
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
      const workKind = flag('--work-kind');
      const prof = JSON.parse(readIn(a[0]).replace(/^﻿/, ''));
      const r = route(prof, {workKind, exclude: (flag('--exclude') || '').split(',').filter(Boolean), avoid: (flag('--avoid') || '').split(',').filter(Boolean), notEngine: flag('--not-engine')});
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
      const cost = flag('--cost-usd'), duration = flag('--duration-ms');
      const measured = {};
      for (const [key, raw] of [['costUsd', cost], ['durationMs', duration]]) {
        if (raw === undefined) continue;
        const value = Number(raw);
        if (!raw.trim() || !Number.isFinite(value) || value < 0) throw Error(`${key} must be a finite nonnegative measurement`);
        measured[key] = value;
      }
      const [engine, model, complexity, result] = a;
      if (!LEVELS.includes(complexity) || !['ok', 'transient', 'limit', 'broken', 'too-big', 'spec', 'repeated'].includes(result)) throw Error('usage: outcome <engine> <model> <low|medium|high> <ok|transient|limit|broken|too-big|spec|repeated>');
      const o = {at: new Date().toISOString(), engine, model, complexity, result, slice: slice || null, note: note || null};
      Object.assign(o, measured);
      append(P.outcomes, o); console.log(JSON.stringify(o));
    } else {
      console.error('commands: supply | route | limit | detect | outcome | classify  (see header)'); process.exit(2);
    }
  } catch (e) { console.error(e.message); process.exit(2); }
}
module.exports = {classify, supply, route, recordLimit, activeLimits, P};
