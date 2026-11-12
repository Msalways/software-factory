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
const opencode = require('./opencode-discovery.cjs');
const sliceReceipt = require('./slice-receipt.cjs');

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
  discovery: path.join(STATE, 'opencode-discovery.json'),
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
  const oc = opencode.preference(readJson(P.discovery, null), policy);
  let openCodeConsidered = false;
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
    const isOpenCode = e.driver === 'opencodeGo';
    if (isOpenCode) openCodeConsidered = true;
    const epol = policy.engines?.[e.id] || {};
    if (epol.disabled) continue;
    const pool = e.models.filter(m => (isOpenCode && oc.chosen.includes(m.id)) || m.usage || policy.models?.[`${e.id}/${m.id}`] || m.id === e.defaultModel || (m.priceReported === 'free' && epol.trialFree !== false));
    for (const m of pool) {
      const key = `${e.id}/${m.id}`;
      const rej = r => rejected.push({candidate: key, reason: r});
      if (policy.models?.[key]?.disabled) { rej('disabled in policy'); continue; }
      if (!m.inCatalog) { rej(m.withdrawnFromCatalog ? 'no longer in engine catalog' : 'no catalog for engine'); continue; }
      if (!authorized.has(key)) { rej('not owner-authorized in current configured model selections'); continue; }
      if (isOpenCode && (oc.needsUserChoice || !oc.chosen.includes(m.id))) { rej(oc.reason || 'not chosen in OpenCode preference'); continue; }
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
  const tierExclusions = [];
  if (workKind) {
    // Preference limits candidates; only explicit policy data assigns tiers.
    const inTier = tier ? cands.filter(c => policy.models?.[`${c.engine}/${c.model}`]?.tier === tier) : [];
    for (const c of cands.filter(c => !inTier.includes(c))) {
      const policyTier = policy.models?.[`${c.engine}/${c.model}`]?.tier ?? null;
      tierExclusions.push({candidate: `${c.engine}/${c.model}`, policyTier,
        reason: policyTier === null ? `no policy tier declared; ineligible for tier ${tier ?? '(unmapped)'} for work kind ${workKind}` : `policy tier ${policyTier} is outside tier ${tier ?? '(unmapped)'} for work kind ${workKind}`});
    }
    if (inTier.length) {
      eligible = inTier;
      rejected.push(...tierExclusions);
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
    workKind: workKind ?? null, tier, fallback, fallbackReason, tierExclusions,
    needsUserChoice: openCodeConsidered && oc.needsUserChoice,
    opencodePreference: openCodeConsidered ? oc : null,
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
  if (receipt.needsUserChoice) { receipt.fallback = true; receipt.fallbackReason ||= oc.reason; receipt.reason += `; ${oc.reason}; OpenCode excluded`; }
  receipt.planned = {engine: receipt.choice?.engine ?? null, model: receipt.choice?.model ?? null,
    effort: receipt.choice?.effort?.requested ?? null, workKind: receipt.workKind, tier: receipt.tier,
    fallback: receipt.fallback, fallbackReason: receipt.fallbackReason};
  receipt.actual = {engine: null, model: null, effort: null, confirmedBy: 'unconfirmed'};
  receipt.usage = {inputTokens: null, outputTokens: null, promptBytes: null, source: 'unreported'};
  receipt.handoffs = 0; receipt.mentorQuestions = 0; receipt.escalations = []; receipt.outcome = null;
  receipt.timestamps = {createdAt: receipt.decidedAt, updatedAt: receipt.decidedAt, closedAt: null};
  fs.mkdirSync(P.receipts, {recursive: true});
  const f = path.join(P.receipts, `${(profile.slice || 'adhoc').replace(/[^\w.-]/g, '_')}-${Date.now()}-${require('node:crypto').randomUUID()}.json`);
  fs.writeFileSync(f, JSON.stringify(receipt, null, 2)); receipt.file = f;
  return receipt;
}

// Independently current, read-only source boundary. Attestations are not provider authentication.
function readCurrentSources({project,sessionId,now:time}) {
  const {fingerprint:H,resolveModelEvidence}=require('./provider-snapshot.cjs');
  const ok=(v,m)=>{if(!v)throw Error(m);},str=v=>typeof v==='string'&&v.trim().length>0;
  const safe=v=>{ok(str(v)&&/^[\w.-]+$/.test(v)&&!['.','..','__proto__','constructor','prototype'].includes(v),'unsafe identifier');return v;};
  const key=v=>{ok(str(v)&&v.includes('/')&&!/[\s\\]/.test(v),'invalid model key');let decoded;try{decoded=decodeURIComponent(v);}catch{throw Error('invalid key encoding');}ok(decoded.split('/').every(x=>x&&!['.','..','__proto__','constructor','prototype'].includes(x))&&!decoded.includes('\\'),'unsafe encoded model key');safe(v.slice(0,v.indexOf('/')));ok(v.slice(v.indexOf('/')+1).split('/').every(x=>str(x)&&!['.','..','__proto__','constructor','prototype'].includes(x))&&!v.includes('\\'),'unsafe model key');return v;};
  const sort=a=>a.sort((a,b)=>a<b?-1:a>b?1:0),unique=(a,label)=>{ok(Array.isArray(a)&&new Set(a).size===a.length,'duplicate/invalid '+label);return a;};
  const stamp=v=>{const t=typeof v==='string'?Date.parse(v):NaN;ok(Number.isFinite(t),'invalid timestamp');return t;};
  const observed=v=>{const t=stamp(v);ok(t<=time,'future observation');return t;};
  const ref=v=>{ok(str(v)&&!v.includes('..')&&!v.includes('\\')&&!v.includes('@'),'unsafe reference');if(/^https:/i.test(v)){const u=new URL(v);ok(!u.username&&!u.password&&![...u.searchParams.keys()].some(k=>/token|key|secret|password|credential/i.test(k)),'credential reference');}else ok(!/^[a-z][a-z0-9+.-]*:/i.test(v)||/^[a-z]:[\\/]/i.test(v),'unsupported reference scheme');};
  const object=v=>ok(v&&typeof v==='object'&&!Array.isArray(v),'expected object');
  const exact=(v,fields)=>{object(v);ok(Object.keys(v).sort().join()===fields.slice().sort().join(),'unexpected/missing fields');};
  safe(project);ok(str(sessionId)&&Number.isFinite(time),'session/time required');
  // Token walk detects duplicate object names before JSON.parse can overwrite them.
  function parse(text) {
    const tokens=text.replace(/^\uFEFF/,'').match(/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}\[\]:,]|\S/g)||[];let i=0;
    function value(){const t=tokens[i++];if(t==='{'){const names=new Set();if(tokens[i]!=='}')do{const name=JSON.parse(tokens[i++]);ok(typeof name==='string'&&!names.has(name)&&!['__proto__','prototype','constructor'].includes(name),'duplicate/unsafe JSON key');names.add(name);ok(tokens[i++]===':','invalid JSON');value();if(tokens[i]!==',')break;i++;}while(true);ok(tokens[i++]==='}','invalid JSON');}else if(t==='['){if(tokens[i]!==']')do{value();if(tokens[i]!==',')break;i++;}while(true);ok(tokens[i++]===']','invalid JSON');}else ok(t!==undefined&&/^(?:"|true$|false$|null$|-?\d)/.test(t),'invalid JSON');}
    value();ok(i===tokens.length,'invalid JSON');return JSON.parse(text.replace(/^\uFEFF/,''));
  }
  const stats=new Map(),missing={state:'missing',value:null},present=value=>({state:'present',value});
  const stat=file=>{try{const s=fs.statSync(file);ok(s.isFile()&&Number.isFinite(s.mtimeMs)&&s.mtimeMs>=0&&Number.isSafeInteger(s.size),'invalid file metadata');return {mtimeMs:s.mtimeMs,size:s.size};}catch(e){if(e.code==='ENOENT')return null;throw e;}};
  function read(file,required=false,jsonl=false){const before=stat(file);stats.set(file,before);if(before===null){ok(!required,'required source missing: '+file);return null;}const text=fs.readFileSync(file,'utf8');const v=jsonl?text.split(/\r?\n/).filter(x=>x.trim()).map(parse):parse(text);ok(v!==null,'present source cannot be null');ok(H(stat(file))===H(before),'source changed while reading');return v;}
  const cfg=read(P.config,true),bots=read(P.bots,true);object(cfg);object(cfg.instances);ok(Array.isArray(bots),'invalid bots');
  function sel(s){if(s==null)return null;object(s);safe(s.instanceId);ok(str(s.model),'model selection required');key(s.instanceId+'/'+s.model);ok(s.effort==null||str(s.effort),'invalid effort');return {key:s.instanceId+'/'+s.model,effort:s.effort??null};}
  const instances=sort(Object.keys(cfg.instances)).map(id=>{safe(id);const v=cfg.instances[id],driver=v.driverKind??v.driver;ok(str(driver)&& (v.enabled===undefined||typeof v.enabled==='boolean'),'invalid instance');return {id,driver,enabled:v.enabled??true};});
  const C={stat:stats.get(P.config),instances,defaultSelection:sel(cfg.defaultModelSelection),newBotSelection:sel(cfg.newBotDefaults?.profile?.modelSelection)};
  unique(bots.map(b=>safe(b.id)),'bots');
  const Hjson=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
  const B={stat:stats.get(P.bots),bots:bots.map(b=>{ok(b.section==null||typeof b.section==='string','invalid section');const tasks=b.tasks??[];ok(Array.isArray(tasks),'invalid tasks');unique(tasks.filter(t=>t.id!=null).map(t=>safe(t.id)),'tasks');return {id:b.id,section:b.section??null,selection:sel(b.modelSelection),tasks:tasks.map(t=>({id:t.id??null,selection:sel(t.modelSelection)})).sort((a,b)=>Hjson(a)<Hjson(b)?-1:Hjson(a)>Hjson(b)?1:0)};}).sort((a,b)=>a.id<b.id?-1:1)};

  const catalogs=instances.map(e=>{const file=path.join(P.catalogs,e.id+'.json'),cat=read(file);if(cat===null)return {id:e.id,driver:e.driver,file:missing,catalog:missing};object(cat);ok(Array.isArray(cat.options)&&(cat.default===undefined||typeof cat.default==='string'),'invalid catalog');unique(cat.options.map(o=>{object(o);ok(str(o.id),'option id required');key(e.id+'/'+o.id);return o.id;}),'options');H(cat.options);return {id:e.id,driver:e.driver,file:present(stats.get(file)),catalog:present({default:cat.default??null,options:[...cat.options].sort((a,b)=>a.id<b.id?-1:1)})};});
  const N=catalogs.map(e=>({...e,catalog:e.catalog.state==='missing'?missing:present({...e.catalog.value,options:e.catalog.value.options.map(o=>Object.fromEntries(Object.entries(o).filter(([k])=>!['label','observedAt','mtime','path','paths'].includes(k))))})}));
  const nativeBindingPreimage={schema:1,config:C,bots:B,catalogs:N},nativeFingerprint=H(nativeBindingPreimage);
  const capture=read(path.join(STATE,'route-identities.json'),true);exact(capture,['schema','sessionId','capturedAt','validUntil','nativeFingerprint','records']);ok(capture.schema===1&&capture.sessionId===sessionId&&capture.nativeFingerprint===nativeFingerprint,'identity session/native binding mismatch');const start=observed(capture.capturedAt),end=stamp(capture.validUntil);ok(time<end&&end>start&&end-start<=3600000,'identity capture expired/invalid');object(capture.records);
  const raw=read(P.policy),policy=raw??{};object(policy);const history=read(path.join(STATE,'project-catalog-history',project+'.json'));
  if(history!==null){ok(history.schema===1,'invalid history schema');object(history.engines);for(const [id,h] of Object.entries(history.engines)){safe(id);object(h);unique(h.lastKeys,'history keys').forEach(key);h.lastKeys=sort([...h.lastKeys]);object(h.retirementGeneration);for(const [k,g] of Object.entries(h.retirementGeneration)){key(k);ok(k.startsWith(id+'/')&&Number.isSafeInteger(g)&&g>=0,'invalid retirement generation');}}}
  const current=new Set(catalogs.flatMap(e=>e.catalog.state==='present'?e.catalog.value.options.map(o=>e.id+'/'+o.id):[]));
  const routeScopes={};for(const [k,r] of Object.entries(capture.records)){key(k);exact(r,['providerId','routeScope','sourceRef']);ok(str(r.providerId)&&str(r.routeScope)&&!r.providerId.includes('@')&&!r.routeScope.includes('@'),'invalid route identity');ref(r.sourceRef);const id=k.slice(0,k.indexOf('/'));ok(instances.some(e=>e.id===id)&&(current.has(k)||Object.hasOwn(history?.engines[id]?.retirementGeneration??{},k)),'foreign route');routeScopes[k]={providerId:r.providerId,routeScope:r.routeScope};}for(const k of current)ok(routeScopes[k],'incomplete route coverage');
  const evidence=read(path.join(STATE,'provider-evidence.json'));if(evidence!==null){exact(evidence,['schema','records']);ok(evidence.schema===1&&Array.isArray(evidence.records),'invalid evidence');unique(evidence.records.map(r=>JSON.stringify([r.key,r.field,r.sourceRef])),'evidence');for(const r of evidence.records){key(r.key);ok(str(r.providerId)&&str(r.routeScope)&&['tier','price','toolUse','imageInput','contextTokens'].includes(r.field)&&['provider-catalog','provider-doc','provider-pricing','aggregator','owner'].includes(r.kind)&&['observed','inferred','unavailable','unverified'].includes(r.status)&&['high','medium','low'].includes(r.confidence),'invalid evidence shape');ref(r.sourceRef);const at=observed(r.observedAt);ok(stamp(r.validUntil)>at,'invalid evidence interval');const v=r.value;ok(r.field==='tier'?v&&str(v.nativeTier)&&['worker','premium','unknown'].includes(v.normalized):['toolUse','imageInput'].includes(r.field)?typeof v==='boolean':r.field==='contextTokens'?Number.isSafeInteger(v)&&v>0:v&&str(v.currency)&&str(v.unit)&&['account','api-equivalent'].includes(v.basis)&&['input','output','cachedInput'].every(k=>v[k]==null||Number.isFinite(v[k])&&v[k]>=0),'invalid evidence value');ok(/^[a-f0-9]{64}$/.test(r.catalogFingerprint),'invalid evidence binding');ok(routeScopes[r.key],'evidence identity unavailable');}}
  if(policy.projects!==undefined)object(policy.projects);const projectPolicy=policy.projects?.[project]??{};object(projectPolicy);
  const allowlist=projectPolicy.allowlist??[];unique(allowlist.map(r=>typeof r==='string'?key(r):key(r.id)),'allowlist');const sortedAllow=[...allowlist].sort((a,b)=>(typeof a==='string'?a:a.id)<(typeof b==='string'?b:b.id)?-1:1);
  const modelDecisions=projectPolicy.modelDecisions??{},premiumApprovals=projectPolicy.premiumApprovals??{};object(modelDecisions);object(premiumApprovals);
  for(const [k,d] of Object.entries(modelDecisions)){key(k);object(d);ok(['worker','premium','unknown'].includes(d.tier)&&d.confirmedBy==='user'&&['model','catalog'].includes(d.scope)&&Number.isSafeInteger(d.retirementGeneration)&&d.retirementGeneration>=0,'invalid model decision');observed(d.confirmedAt);ref(d.sourceRef);ok(/^[a-f0-9]{64}$/.test(d.modelFingerprint)&&/^[a-f0-9]{64}$/.test(d.catalogFingerprint)&&(d.preferenceRank===null||Number.isSafeInteger(d.preferenceRank)&&d.preferenceRank>=0),'invalid decision binding');}
  for(const [slice,a] of Object.entries(premiumApprovals)){safe(slice);unique(a.keys,'approval keys').forEach(key);ok(a.approvedBy==='user'&&/^[a-f0-9]{64}$/.test(a.profileHash),'invalid approval');const at=observed(a.approvedAt);ok(stamp(a.expiresAt)>at,'invalid approval interval');ref(a.sourceRef);}
  const pref=projectPolicy.opencodePreference??null;if(pref!==null){ok(pref.confirmedBy==='user'&&pref.scope==='catalog'&&/^[a-f0-9]{64}$/.test(pref.catalogFingerprint),'invalid preference');unique(pref.chosen,'chosen').forEach(key);unique(pref.offered,'offered').forEach(key);ok(pref.chosen.every(k=>pref.offered.includes(k)),'chosen not offered');pref.chosen=sort([...pref.chosen]);pref.offered=sort([...pref.offered]);observed(pref.askedAt);ref(pref.sourceRef);}
  const scoring=scoringPolicy(policy),snapshot={maxAgeMinutes:policy.snapshot?.maxAgeMinutes??60,catalogStaleHours:policy.snapshot?.catalogStaleHours??24};ok(Object.values(snapshot).every(v=>Number.isFinite(v)&&v>0),'invalid snapshot settings');
  const engines={},models={};for(const [id,v] of Object.entries(policy.engines??{})){safe(id);object(v);if(instances.some(e=>e.id===id))engines[id]=v;}for(const [k,v] of Object.entries(policy.models??{})){key(k);object(v);if(current.has(k)||Object.hasOwn(history?.engines[k.slice(0,k.indexOf('/'))]?.retirementGeneration??{},k))models[k]=Object.fromEntries(Object.entries(v).filter(([f])=>f!=='tier'));}
  const events=read(P.limits,false,true);for(const e of events??[]){object(e);safe(e.engine);observed(e.at);ok(e.scope==null||['engine','model'].includes(e.scope),'invalid limit scope');ok(e.model==null||str(e.model),'invalid limit model');ok(str(e.signal),'invalid limit signal');if(e.resetAt!=null)stamp(e.resetAt);if(e.cooldownHours!=null)ok(Number.isFinite(e.cooldownHours)&&e.cooldownHours>=0,'invalid cooldown');}
  const discovery=read(P.discovery);let advisory=null;if(discovery!==null){observed(discovery.observedAt);ok(Number.isInteger(discovery.listingStatus)&&Array.isArray(discovery.models),'invalid discovery');unique(discovery.models.map(m=>m.id),'discovery');advisory={observedAt:discovery.observedAt,listingStatus:discovery.listingStatus,models:discovery.models.map(m=>{ok(str(m.id)&&(m.responded==null||typeof m.responded==='boolean')&&(m.price===undefined||['free','paid','unknown'].includes(m.price)),'invalid advisory model');return {id:m.id,price:m.price??'unknown',responded:m.responded??null};}).sort((a,b)=>a.id<b.id?-1:1)};}
  const records=evidence?.records??[];
  const configured=[...new Set([C.defaultSelection,C.newBotSelection,...B.bots.flatMap(b=>[b.selection,...b.tasks.map(t=>t.selection)])].filter(Boolean).map(s=>s.key))].sort();
  const inputsEngines=catalogs.map(e=>({id:e.id,driver:e.driver,options:e.catalog.state==='present'?e.catalog.value.options:[],modelRoutes:Object.fromEntries(Object.entries(routeScopes).filter(([k])=>k.startsWith(e.id+'/'))),evidence:records.filter(r=>r.key?.startsWith(e.id+'/')),retirementGenerations:history?.engines[e.id]?.retirementGeneration??{}}));
  // Reuse verified typed evidence validation; missing lifecycle history is not initialized here.
  for(const e of inputsEngines)for(const r of e.evidence){key(r.key);ok(routeScopes[r.key],'evidence route missing');const option=e.options.find(o=>e.id+'/'+o.id===r.key);if(!option)continue; // Retain typed historical claims; absent historical options cannot be invented.
const generations={...e.retirementGenerations};ok(Object.hasOwn(generations,r.key),'evidence history missing');resolveModelEvidence({key:r.key,modelOption:option,engine:e,routeScope:routeScopes[r.key].routeScope,evidence:e.evidence.filter(x=>x.key===r.key),decision:null,preference:null,retired:{isRetired:false,retirementGeneration:generations[r.key]},now:time});}
  const preimages={config:{schema:1,native:C,sessionId,routeIdentities:present(capture)},bots:{schema:1,native:B},catalogs:{schema:1,engines:catalogs},policy:{schema:1,project,source:raw===null?'missing':'present',allowlist:sortedAllow,snapshot,capability:scoring.capability,costRank:scoring.costRank,balanced:scoring.balanced,engines,models,knownExceptions:[...(policy.knownExceptions??[])].sort((a,b)=>Hjson(a)<Hjson(b)?-1:Hjson(a)>Hjson(b)?1:0)},evidence:{schema:1,source:evidence===null?missing:present({schema:1,records:[...records].sort((a,b)=>{const x=[a.key,a.field,a.sourceRef,Hjson(a)],y=[b.key,b.field,b.sourceRef,Hjson(b)];return x.join('\0')<y.join('\0')?-1:1;})})},decisions:{schema:1,project,policySource:raw===null?'missing':'present',modelDecisions,premiumApprovals},history:{schema:1,project,source:history===null?missing:present(history)},limits:{schema:1,source:events===null?'missing':'present',events:events??[]},opencode:{schema:1,project,preference:pref===null?missing:present(pref),advisory:{status:'ignored-for-project-routing',discovery:advisory===null?missing:present(advisory)}}};
  const revalidate=(checkNow=time)=>{ok(Number.isFinite(checkNow)&&checkNow>=time&&checkNow<end,'expired capture');for(const [file,s] of stats)ok(H(stat(file))===H(s),'source changed since read: '+file);ok(time<end,'expired capture');return true;};revalidate();
  return {preimages,currentFingerprints:Object.fromEntries(Object.entries(preimages).map(([k,v])=>[k,H(v)])),routeScopes,captureValidUntil:capture.validUntil,inputs:{configured,nativeBindingPreimage,nativeFingerprint,engines:inputsEngines,evidence:records,decisions:modelDecisions,preference:pref,history,allowlist:sortedAllow,policy:preimages.policy,limits:events??[]},revalidate};
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
    if (cmd === 'receipt') {
      const [file, action, data] = a;
      const payload = ['report', 'escalate'].includes(action) ? JSON.parse(readIn(data).replace(/^\uFEFF/, '')) : data;
      const result = action === 'show' ? sliceReceipt.load(file) : sliceReceipt.update(file, action, payload);
      console.log(JSON.stringify(result, null, 2));
    } else if (cmd === 'opencode-discover') {
      fs.mkdirSync(STATE, {recursive: true});
      console.log(JSON.stringify(opencode.discover(P.discovery), null, 2));
    } else if (cmd === 'opencode-prefer') {
      const chosen = (flag('--models') || '').split(',').filter(Boolean);
      const raw = readPolicy(), discovery = readJson(P.discovery, null);
      const state = opencode.preference(discovery, {});
      if (!chosen.length || chosen.some(id => !state.options.includes(id)) || !discovery || Date.now() - Date.parse(discovery.observedAt) > 86400000 || discovery.listingStatus !== 0) throw Error('choose only models from a successful fresh discovery');
      raw.opencodePreference = {chosen: [...new Set(chosen)], askedAt: new Date().toISOString(), offered: state.options};
      fs.mkdirSync(STATE, {recursive: true}); fs.writeFileSync(P.policy, JSON.stringify(raw, null, 2));
      console.log(JSON.stringify(raw.opencodePreference));
    } else if (cmd === 'supply') {
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
      console.error('commands: supply | route | receipt | opencode-discover | opencode-prefer | limit | detect | outcome | classify (see header)'); process.exit(2);
    }
  } catch (e) { console.error(e.message); process.exit(2); }
}
module.exports = {classify, supply, route, recordLimit, activeLimits, P, readCurrentSources};
