#!/usr/bin/env node
// Supply probe + quota/limit ledger + router (dynamic-execution.md). Deterministic; no model calls, no network.
// Nothing about models is hardcoded: supply comes from Hattera's live catalogs and usage log, capability is
// learned from recorded outcomes (or an editable policy file), price comes from what the engine reports.
//
//   supply   [--json]                         snapshot of engines/models/evidence -> state/routing/supply.json
//   allowlist <project> (--add e/m,... --source text | --remove e/m,... | --show)
//   snapshot <project> [--team-setup file|-] [--captured-at ISO] [--evidence file] [--json]
//   audit <project> --section name [--since ISO] [--json]
//   check <project> <engine/model> --purpose native-delegation|cli-run|route|verify --profile file [--actual file] [--json]
//   route    <profile.json> --project <project> [--work-kind kind] [--exclude e/m,..] [--avoid engine,..] [--not-engine e] [--json]
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
const snapshotLib = require('./provider-snapshot.cjs');

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
  snapshots: path.join(STATE, 'project-provider-snapshots'),
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
function usageRecords({details=false}={}) {
  let all=[];try{all=fs.readdirSync(P.usage).filter(f=>f.endsWith('.jsonl')).sort();}catch(error){if(details&&error.code!=='ENOENT')throw error;}
  const files=all.slice(-2),records=files.flatMap(f=>details?fs.readFileSync(path.join(P.usage,f),'utf8').split(/\r?\n/).filter(s=>s.trim()).map(parseSourceJson):readJsonl(path.join(P.usage,f)));
  return details?{records,files,omittedFiles:all.length-files.length}:records;
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

function projectId(p) { if (typeof p !== 'string' || !/^[\w.-]+$/.test(p) || ['.', '..', '__proto__', 'constructor', 'prototype'].includes(p)) throw Error('usage: project id must match [A-Za-z0-9_.-]+'); return p; }
function snapshotPath(project) { return path.join(P.snapshots, projectId(project) + '.json'); }
function snapshotSettings(raw) {
  if (raw.snapshot !== undefined && (!raw.snapshot || typeof raw.snapshot !== 'object' || Array.isArray(raw.snapshot))) throw Error('invalid routing policy snapshot: expected object');
  const settings = {maxAgeMinutes: 60, catalogStaleHours: 24, ...raw.snapshot};
  for (const key of ['maxAgeMinutes', 'catalogStaleHours']) if (!Number.isFinite(settings[key]) || settings[key] <= 0) throw Error(`invalid routing policy snapshot: ${key} must be positive and finite`);
  return settings;
}
function allowlistIds(raw, project) { return (raw.projects?.[project]?.allowlist || []).map(e => typeof e === 'string' ? e : e.id); }
function mtimeOf(p) { try { return fs.statSync(p).mtime.toISOString(); } catch { return null; } }

// Reconciles frozen readCurrentSources attestation + buildSnapshot assembly behind one atomic write;
// never trusts a prior snapshot file, never widens scope beyond the attested/retained identities.
function takeSnapshot(project, {teamSetupText = null, teamSetupPath = null, capturedAt = null, evidenceFile = null} = {}) {
  projectId(project);
  if (evidenceFile !== null) recordProviderInput('evidence-import', project, evidenceFile);
  const sessionId = process.env.FACTORY_SESSION_ID;
  const t = now();
  const source = readCurrentSources({project, sessionId, now: t});
  const raw = readPolicy();
  const settings = snapshotSettings(raw);
  const capRemainingMinutes = (Date.parse(source.captureValidUntil) - t) / 60000;
  const maxAgeMinutes = Math.min(settings.maxAgeMinutes, capRemainingMinutes);
  let teamSetup = null;
  if (teamSetupText !== null) {
    let data = null;
    try { data = JSON.parse(teamSetupText.replace(/^﻿/, '')); } catch {}
    let at;
    if (capturedAt !== null) at = Date.parse(capturedAt);
    else if (teamSetupPath && teamSetupPath !== 'stdin') at = Date.parse(mtimeOf(teamSetupPath));
    else at = t; // stdin observed time: trust is limited to this process's own clock
    if (!Number.isFinite(at) || at > t) throw Error('invalid/future team-setup capture time');
    teamSetup = {path: teamSetupPath, capturedAt: new Date(at).toISOString(), data};
  }
  const discovery = readJson(P.discovery, null);
  const rawSupply = supply();
  const optionsById = new Map(source.inputs.engines.map(e => [e.id, e.options]));
  const supplyForSnapshot = {...rawSupply, engines: rawSupply.engines.map(e => ({...e, options: optionsById.get(e.id) ?? []}))};
  // Every retained generation (current or tombstoned) is carried through; absent entries never become generation 0.
  const retired = {};
  for (const e of source.inputs.engines) {
    const currentIds = new Set(e.options.map(o => e.id + '/' + o.id));
    for (const [k, generation] of Object.entries(e.retirementGenerations)) {
      const isRetired = !currentIds.has(k);
      retired[k] = {isRetired, retirementGeneration: generation, ...(isRetired ? {} : {modelOption: e.options.find(o => e.id + '/' + o.id === k)})};
    }
  }
  const allowlist = allowlistIds(raw, project);
  const snap = snapshotLib.buildSnapshot({
    project, now: t, maxAgeMinutes, catalogStaleHours: settings.catalogStaleHours,
    supply: supplyForSnapshot, configured: source.inputs.configured, allowlist, teamSetup,
    opencode: opencode.preference(discovery, raw), policy: source.inputs.policy,
    sources: {config: {path: P.config, mtime: mtimeOf(P.config)}, bots: {path: P.bots, mtime: mtimeOf(P.bots)},
      catalogs: {dir: P.catalogs}, policy: {path: P.policy, mtime: mtimeOf(P.policy)},
      opencodeDiscovery: {path: P.discovery, observedAt: discovery?.observedAt ?? null}},
    evidence: source.inputs.evidence, decisions: source.inputs.decisions, preference: source.inputs.preference,
    routeScopes: source.routeScopes, activeLimits: [...activeLimits(t).values()], retired,
    currentFingerprints: source.currentFingerprints,
  });
  source.revalidate(now()); // sources must still be unchanged/unexpired at the moment of write
  fs.mkdirSync(P.snapshots, {recursive: true});
  const temp = snapshotPath(project) + '.' + require('node:crypto').randomUUID() + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(snap, null, 2), {flag: 'wx', mode: 0o600});
  fs.renameSync(temp, snapshotPath(project));
  return snap;
}
function loadSnapshot(project) { return readJson(snapshotPath(project), null); }

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
// ---------- v2.1 project-mode ranking (opts.project): cheapest task-qualified candidate only, per brief
// S3A-capable-ranking.md. Legacy route() below stays advisory-only (dispatchAuthorized:false), unchanged.
function priceVectorKey(price) {
  return price ? [price.currency, price.unit, price.basis, price.contextBand ?? null, price.serviceTier ?? null].join('|') : null;
}
// Dominance: for applicable (both non-null) rate components, no higher anywhere and strictly lower somewhere.
// A missing component is unknown, not zero, so it is excluded from the comparison rather than assumed free.
// Returns -1/0/1, or undefined when the pair is not comparable this way (mismatched vector, crossing rates,
// or no overlapping known component).
function dominanceCompare(a, b) {
  if (!a || !b || priceVectorKey(a) !== priceVectorKey(b)) return undefined;
  let cmp = 0, applicable = false;
  for (const f of ['input', 'output', 'cachedInput']) {
    if (a[f] == null || b[f] == null) continue;
    applicable = true;
    if (a[f] < b[f]) { if (cmp > 0) return undefined; cmp = -1; }
    else if (a[f] > b[f]) { if (cmp < 0) return undefined; cmp = 1; }
  }
  return applicable ? cmp : undefined;
}
function estimatedTotalCost(price, estimatedTokens) {
  if (!price || !estimatedTokens) return null;
  let total = 0;
  for (const f of ['input', 'output', 'cachedInput']) {
    const tokens = estimatedTokens[f];
    if (!tokens) continue;
    if (price[f] == null) return null; // missing rate for a needed component: unknown, not zero
    total += price[f] * tokens;
  }
  return total;
}
// Cost comparison between two task-qualified candidates: dominance first, then a complete estimated-token
// cost (only when the profile supplies validated counts), then a project comparative preferenceRank (orders
// without claiming a dollar figure). undefined = unresolved (crossing/incomparable/no evidence).
function compareCost(a, b, profile) {
  const pa = a.model.priceEvidence.value, pb = b.model.priceEvidence.value;
  const dom = dominanceCompare(pa, pb);
  if (dom !== undefined) return dom;
  if (profile.estimatedTokens) {
    const ea = estimatedTotalCost(pa, profile.estimatedTokens), eb = estimatedTotalCost(pb, profile.estimatedTokens);
    if (ea !== null && eb !== null) return ea < eb ? -1 : ea > eb ? 1 : 0;
  }
  const ra = a.model.decisionState?.preferenceRank, rb = b.model.decisionState?.preferenceRank;
  if (Number.isSafeInteger(ra) && Number.isSafeInteger(rb)) return ra < rb ? -1 : ra > rb ? 1 : 0;
  return undefined;
}
// A candidate is a cheapest-or-tied winner only if it is comparably no-worse-than every other relevant
// candidate; an unresolved (crossing/incomparable) pair blocks both sides from winning, so a held-only
// candidate is never silently out-ranked by a dearer but fully known one (brief: "do not drop them").
function cheapestTieGroup(relevant, profile) {
  const n = relevant.length, cmp = Array.from({length: n}, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const c = compareCost(relevant[i], relevant[j], profile);
    cmp[i][j] = c; cmp[j][i] = c === undefined ? undefined : -c;
  }
  const winners = [];
  for (let i = 0; i < n; i++) {
    let ok = true;
    for (let j = 0; j < n; j++) if (j !== i && (cmp[i][j] === undefined || cmp[i][j] > 0)) { ok = false; break; }
    if (ok) winners.push(relevant[i]);
  }
  return winners;
}
// A candidate held only for provider tier or price can still be chosen when the cost comparison itself
// (dominance/estimate/preference) resolves it as the unique or tied winner — that is what resolves the
// unknown. A candidate held for capability/outcome reasons is never resolvable this way (brief: "Assert
// unknown alongside otherwise qualified known worker causes held unless evidence rules it out").
const RESOLVABLE_HOLD_REASONS = new Set(['provider tier unresolved', 'price evidence unresolved']);
function routeProject(profile, opts) {
  const project = opts.project;
  const context = {now: now(), ...opts.context};
  const snap = Object.prototype.hasOwnProperty.call(opts, 'snapshot') ? opts.snapshot : loadSnapshot(project);
  const rejected = [], relevant = [];
  const excluded = new Set(opts.exclude || []);
  let profileInvalid = false;
  if (snap) {
    for (const key of snap.allowed) {
      if (excluded.has(key) || opts.notEngine === key.split('/')[0]) { rejected.push({candidate:key,reason:'excluded by route flag'});continue; }
      const ev = snapshotLib.evaluateTask(snap, key, profile, context);
      if (ev.decision === 'refused') {
        if (ev.reasons.includes('invalid task profile')) profileInvalid = true;
        rejected.push({candidate: key, reason: ev.reasons.join('; ') || 'refused'}); continue;
      }
      relevant.push({key, model: snap.models.find(m => m.key === key), evaluation: ev});
    }
  }
  let held = !snap, holdReason = snap ? null : `no provider snapshot captured for project ${project}; run snapshot first`;
  let tieGroup = [], choice = null, noCapableCandidate = false;
  if (snap && !relevant.length) {
    held = true; holdReason = 'no task-qualified candidate in snapshot.allowed for this profile (see rejected)';
    noCapableCandidate = !profileInvalid;
  } else if (snap) {
    tieGroup = cheapestTieGroup(relevant, profile);
    if (!tieGroup.length) {
      held = true; holdReason = 'crossing or otherwise incomparable price vectors across relevant candidates; no comparable winner';
    } else {
      const unresolvable = tieGroup.filter(c => c.evaluation.decision !== 'allowed' && !c.evaluation.reasons.every(r => RESOLVABLE_HOLD_REASONS.has(r)));
      if (unresolvable.length) {
        held = true;
        holdReason = `held candidate cannot be ruled out of the cheapest-or-tied group: ${unresolvable.map(c => `${c.key} (${c.evaluation.reasons.join('; ')})`).join('; ')}`;
      } else if (tieGroup.length === 1) {
        choice = tieGroup[0];
      } else {
        // Equal-cost tie: existing reliability/latency/avoid scoring breaks it, key is the final tie-break.
        // Reuses the same failureRate/latency weighting and normalizedPenalty shape as the legacy balancedScore
        // (cost is excluded here since the tie group already shares one cost rank; including it would double-count).
        const policy = scoringPolicy(readPolicy());
        const bw = policy.balanced;
        const observations = new Map();
        for (const o of readJsonl(P.outcomes)) {
          if (o.result === 'limit' || o.result === 'transient') continue;
          const k = `${o.engine}/${o.model}`, s = observations.get(k) || {runs: 0, ok: 0, durations: []};
          s.runs++; if (o.result === 'ok') s.ok++;
          if (Number.isFinite(o.durationMs) && o.durationMs >= 0) s.durations.push(o.durationMs);
          observations.set(k, s);
        }
        const avoid = new Set(opts.avoid || []);
        const scale = Math.max(bw.weights.failureRate, bw.weights.latency) || 1;
        const tieScore = c => {
          const obs = observations.get(c.key);
          const durationMsPerAttempt = mean(obs?.durations);
          const terms = [
            [bw.weights.failureRate, obs ? 1 - obs.ok / obs.runs : bw.unknownPenalty],
            [bw.weights.latency, durationMsPerAttempt === null ? bw.unknownPenalty : normalizedPenalty(durationMsPerAttempt, bw.latencyScaleMs)],
          ];
          let score = 0, total = 0;
          for (const [weight, penalty] of terms) {
            const w = weight / scale;
            if (!w) continue;
            total += w;
            score += (penalty - score) * (w / total);
          }
          return score;
        };
        const rank = c => [avoid.has(c.key.split('/')[0]) ? 1 : 0, tieScore(c), c.key];
        choice = [...tieGroup].sort((a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; return 0; })[0];
      }
    }
  }
  const receipt = {
    mode: 'project', project, slice: profile.slice || null, decidedAt: new Date(context.now).toISOString(),
    supplyObservedAt: snap?.observedAt ?? null,
    profile: {complexity: profile.complexity, budget: profile.budget, needs: profile.needs, attempt: profile.attempt || 1},
    choice: choice ? {engine: choice.key.split('/')[0], model: choice.key.slice(choice.key.indexOf('/') + 1), key: choice.key,
      price: choice.model.priceEvidence.value, tier: choice.model.hierarchy.value} : null,
    held, holdReason, needsUserChoice: held, profileInvalid, noCapableCandidate,
    relevantCandidates: relevant.map(c => ({candidate: c.key, decision: c.evaluation.decision, reasons: c.evaluation.reasons,
      price: c.model.priceEvidence.value, tier: c.model.hierarchy.value, preferenceRank: c.model.decisionState?.preferenceRank ?? null})),
    costTieGroup: tieGroup.map(c => c.key),
    rejected,
    dispatchAuthorized: Boolean(choice) && !held,
    premiumJustification: choice ? choice.evaluation.premiumJustification : null,
    reason: choice ? `cheapest task-qualified candidate for ${profile.complexity}/${profile.budget}: ${choice.key}` : (holdReason || 'held'),
  };
  return receipt;
}
function route(profile, opts = {}) {
  if (opts.project) return routeProject(profile, opts);
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
  receipt.dispatchAuthorized = false; // legacy advisory ranking never grants dispatch (v2.1 project mode is separate)
  fs.mkdirSync(P.receipts, {recursive: true});
  const f = path.join(P.receipts, `${(profile.slice || 'adhoc').replace(/[^\w.-]/g, '_')}-${Date.now()}-${require('node:crypto').randomUUID()}.json`);
  fs.writeFileSync(f, JSON.stringify(receipt, null, 2)); receipt.file = f;
  return receipt;
}

function parseSourceJson(text) {
  const ok=(value,message)=>{if(!value)throw Error(message);};
    const tokens=text.replace(/^\uFEFF/,'').match(/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}\[\]:,]|\S/g)||[];let i=0;
    function value(){const t=tokens[i++];if(t==='{'){const names=new Set();if(tokens[i]!=='}')do{const name=JSON.parse(tokens[i++]);ok(typeof name==='string'&&!names.has(name)&&!['__proto__','prototype','constructor'].includes(name),'duplicate/unsafe JSON key');names.add(name);ok(tokens[i++]===':','invalid JSON');value();if(tokens[i]!==',')break;i++;}while(true);ok(tokens[i++]==='}','invalid JSON');}else if(t==='['){if(tokens[i]!==']')do{value();if(tokens[i]!==',')break;i++;}while(true);ok(tokens[i++]===']','invalid JSON');}else ok(t!==undefined&&/^(?:"|true$|false$|null$|-?\d)/.test(t),'invalid JSON');}
    value();ok(i===tokens.length,'invalid JSON');return JSON.parse(text.replace(/^\uFEFF/,''));
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
  const parse=parseSourceJson;
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
  if(history!==null){ok(history.schema===1,'invalid history schema');object(history.engines);for(const [id,h] of Object.entries(history.engines)){safe(id);object(h);object(h.retirementGeneration);
      for(const k of unique(h.lastKeys,'history keys')){key(k);ok(k.startsWith(id+'/'),'history identity belongs to another engine');ok(Object.hasOwn(h.retirementGeneration,k),'history key missing explicit retirement generation');}
      h.lastKeys=sort([...h.lastKeys]);for(const [k,g] of Object.entries(h.retirementGeneration)){key(k);ok(k.startsWith(id+'/')&&Number.isSafeInteger(g)&&g>=0,'invalid retirement generation');}}}
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

// These imports attest user/operator records; they do not authenticate the user or authorize models.
function recordProviderInput(command,project,file) {
  const {fingerprint:H,resolveModelEvidence}=require('./provider-snapshot.cjs');
  const fail=(value,message)=>{if(!value)throw Error(message);};
  const shape=(v,fields)=>fail(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===fields.slice().sort().join(),'invalid record fields');
  const source=readCurrentSources({project,sessionId:process.env.FACTORY_SESSION_ID,now:Date.now()});
  fail(typeof file==='string'&&file.length>0,'--file required');
  const envelope=parseSourceJson(fs.readFileSync(file,'utf8'));H(envelope);
  const when=(v,future=false)=>{const t=typeof v==='string'?Date.parse(v):NaN;fail(Number.isFinite(t)&&(future||t<=Date.now()),'invalid/future record timestamp');return t;};
  const reference=v=>{fail(typeof v==='string'&&v.trim()&&!/[\r\n]/.test(v),'explicit user/source reference required');if(/^https:/i.test(v)){const u=new URL(v);fail(!u.username&&!u.password&&![...u.searchParams.keys()].some(k=>/token|key|secret|password|credential/i.test(k)),'unsafe reference');}else fail((!/^[a-z][a-z\d+.-]*:/i.test(v)||/^[a-z]:[\\/]/i.test(v))&&!v.split(/[\\/]/).includes('..'),'unsafe reference');};
  const member=k=>{fail(typeof k==='string','model key required');const e=source.inputs.engines.find(e=>e.options.some(o=>e.id+'/'+o.id===k));fail(e&&source.routeScopes[k],'unknown/retired model identity');fail(source.inputs.history?.engines[e.id]?.lastKeys.includes(k)&&Object.hasOwn(e.retirementGenerations,k),'current catalog history required');return e;};
  const authorized=k=>{const e=member(k);fail(source.inputs.configured.includes(k)&&source.inputs.allowlist.some(a=>(typeof a==='string'?a:a.id)===k),'model not owner authorized');return e;};
  const resolve=(k,records=source.inputs.evidence,decision=null,preference=null)=>{const e=member(k),engine={...e,evidence:records.filter(r=>r.key.startsWith(e.id+'/'))};return resolveModelEvidence({key:k,modelOption:e.options.find(o=>e.id+'/'+o.id===k),engine,routeScope:source.routeScopes[k].routeScope,evidence:engine.evidence.filter(r=>r.key===k),decision,preference,retired:{isRetired:false,retirementGeneration:e.retirementGenerations[k]},now:Date.now()});};
  let target,value,deadline=Infinity;
  if(command==='evidence-import'){
    shape(envelope,['schema','records']);fail(envelope.schema===1&&Array.isArray(envelope.records),'schema1 evidence envelope required');
    const ids=new Set();for(const r of envelope.records){shape(r,['key','providerId','routeScope','field','value','kind','status','confidence','sourceRef','observedAt','validUntil','catalogFingerprint']);member(r.key);reference(r.sourceRef);const at=when(r.observedAt),until=when(r.validUntil,true);fail(until>at&&until>Date.now(),'invalid/expired evidence bounds');deadline=Math.min(deadline,until);const id=JSON.stringify([r.key,r.field,r.sourceRef]);fail(!ids.has(id),'duplicate evidence record');ids.add(id);const route=source.routeScopes[r.key];fail(r.providerId===route.providerId&&r.routeScope===route.routeScope,'provider/account identity mismatch');}
    const identity=r=>JSON.stringify([r.key,r.field,r.sourceRef]);value={schema:1,records:[...source.inputs.evidence.filter(r=>!ids.has(identity(r))),...envelope.records]};
    // Full proposed engine claims are validated before mutation; bindings are never rewritten.
    for(const r of envelope.records){const result=resolve(r.key,value.records);fail(r.catalogFingerprint===result.rawCatalogFingerprint,'stale raw catalog binding');}
    H(value);target=path.join(STATE,'provider-evidence.json');
  }else{
    shape(envelope,['schema','kind','value']);fail(envelope.schema===1&&['model-decision','premium-approval','opencode-preference'].includes(envelope.kind),'unsupported model record envelope');
    const v=envelope.value;
    if(envelope.kind==='model-decision'){
      shape(v,['key','tier','preferenceRank','confirmedBy','confirmedAt','sourceRef','modelFingerprint','catalogFingerprint','retirementGeneration','scope']);authorized(v.key);when(v.confirmedAt);reference(v.sourceRef);
      const {key,...answer}=v,result=resolve(key,source.inputs.evidence,answer);fail(answer.modelFingerprint===result.modelFingerprint&&!result.decisionState.excludedAnswers.length&&!(answer.preferenceRank!==null&&result.decisionState.preferenceRank===null),'invalid/stale model answer');
    }else if(envelope.kind==='premium-approval'){
      shape(v,['slice','keys','profileHash','approvedBy','approvedAt','expiresAt','sourceRef']);fail(typeof v.slice==='string'&&/^[\w.-]+$/.test(v.slice)&&!['.','..','__proto__','prototype','constructor'].includes(v.slice),'safe slice required');fail(Array.isArray(v.keys)&&v.keys.length&&new Set(v.keys).size===v.keys.length,'unique approval keys required');v.keys.forEach(authorized);reference(v.sourceRef);fail(v.approvedBy==='user'&&/^[a-f0-9]{64}$/.test(v.profileHash),'explicit user/profile approval required');const start=when(v.approvedAt),end=when(v.expiresAt,true);fail(end>start&&end>Date.now(),'invalid/expired approval');deadline=end;
    }else{
      shape(v,['chosen','offered','askedAt','confirmedBy','sourceRef','catalogFingerprint','scope']);fail(Array.isArray(v.chosen)&&v.chosen.length&&Array.isArray(v.offered)&&v.offered.length,'preference keys required');const engine=authorized(v.chosen[0]);fail(engine.driver==='opencodeGo','OpenCode engine required');for(const k of [...v.chosen,...v.offered])fail(authorized(k).id===engine.id,'catalog preference spans engines');when(v.askedAt);reference(v.sourceRef);const result=resolve(v.chosen[0],source.inputs.evidence,null,v);fail(!result.decisionState.excludedAnswers.length,'invalid/stale catalog preference');
    }
    value=source.preimages.policy.source==='missing'?{}:parseSourceJson(fs.readFileSync(P.policy,'utf8'));value.projects??={};value.projects[project]??={};const dest=value.projects[project];
    if(envelope.kind==='model-decision'){dest.modelDecisions??={};const {key,...answer}=v;dest.modelDecisions[key]=answer;}
    else if(envelope.kind==='premium-approval'){dest.premiumApprovals??={};const {slice,...answer}=v;dest.premiumApprovals[slice]=answer;}
    else dest.opencodePreference=v;
    H(value);target=P.policy;
  }
  // Exclusive per-target mutation plus re-stat prevents concurrent imports from losing updates.
  const lock=target+'.lock',temp=target+'.'+require('node:crypto').randomUUID()+'.tmp';let locked=false,committed=false,cleanupPending=false;
  try{const fd=fs.openSync(lock,'wx',0o600);locked=true;fs.closeSync(fd);source.revalidate(Date.now());fail(Date.now()<deadline,'record expired before mutation');fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});source.revalidate(Date.now());fail(Date.now()<deadline,'record expired before mutation');fs.renameSync(temp,target);committed=true;}
  finally{if(fs.existsSync(temp))fs.unlinkSync(temp);if(locked)try{fs.unlinkSync(lock);}catch(error){if(!committed)throw error;cleanupPending=true;}}
  return {schema:1,command,project,recorded:true,attestationOnly:true,cleanupPending};
}

// Missing/stale/wrong-session/wrong-native-binding route-identity attestation holds snapshot (exit8, PRD v2.2);
// distinct from malformed/invalid input (exit2) and from an unrelated source changing mid-read.
const IDENTITY_HOLD_PATTERNS = [
  /^required source missing: .*route-identities\.json$/,
  /^identity session\/native binding mismatch$/,
  /^identity capture expired\/invalid$/,
  /^expired capture$/,
];
const isIdentityHold = message => IDENTITY_HOLD_PATTERNS.some(p => p.test(message));

function validateTaskProfile(profile) {
  const nonempty=v=>typeof v==='string'&&v.trim();
  snapshotLib.fingerprint(profile); // Reject unsafe/non-JSON fields before any route can be authorized.
  if(!profile||!nonempty(profile.slice)||!nonempty(profile.workKind)||!LEVELS.includes(profile.complexity)||!['free-first','balanced','best-quality'].includes(profile.budget)||!profile.needs||typeof profile.needs.toolUse!=='boolean'||typeof profile.needs.imageInput!=='boolean'||!Number.isSafeInteger(profile.needs.contextTokens)||profile.needs.contextTokens<0)throw Error('invalid task profile');
  if(profile.estimatedTokens!==undefined&&(!profile.estimatedTokens||!['input','output','cachedInput'].every(k=>Number.isSafeInteger(profile.estimatedTokens[k])&&profile.estimatedTokens[k]>=0)))throw Error('invalid estimated token counts');
}

function validProjectSnapshot(snap,source,project,time) { return !(!snap||snap.project!==project||!Array.isArray(snap.allowed)||!Array.isArray(snap.models)||new Set(snap.allowed).size!==snap.allowed.length||snap.allowed.some(k=>!source.inputs.configured.includes(k)||!source.inputs.allowlist.some(a=>(typeof a==='string'?a:a.id)===k)||!source.inputs.engines.some(e=>e.options.some(o=>e.id+'/'+o.id===k)))||!snapshotLib.isFresh(snap,time,source.currentFingerprints)); }

// CLI permission boundary: fresh independently read source hashes, never a saved map as current truth.
function routeCommand(profile,opts) {
  const project=projectId(opts.project);
  validateTaskProfile(profile);
  const base={mode:'project',project,slice:profile.slice,profile,profileHash:snapshotLib.fingerprint(profile),providerSnapshot:{path:snapshotPath(project),hash:null,observedAt:null},choice:null,dispatchAuthorized:false,held:false,needsUserChoice:false,candidates:[],exclusions:[],costOrder:null,premiumJustification:null,unknowns:[],fallbacks:[],actual:{engine:null,model:null,effort:null,confirmedBy:'unconfirmed'}};
  const failed=(code,reason)=>({exitCode:code,result:{...base,reason,held:code===8,needsUserChoice:code===8}});
  let source;
  try{source=readCurrentSources({project,sessionId:process.env.FACTORY_SESSION_ID,now:now()});}
  catch(error){return failed(isIdentityHold(error.message)?8:2,error.message);}
  const snap=loadSnapshot(project);
  if(snap)base.providerSnapshot={path:snapshotPath(project),hash:snap.hash??null,observedAt:snap.observedAt??null};
  if(!validProjectSnapshot(snap,source,project,now()))return failed(5,'invalid/missing/expired/changed provider snapshot; run snapshot explicitly');
  let outcomes=[];
  try{outcomes=fs.readFileSync(P.outcomes,'utf8').split(/\r?\n/).filter(x=>x.trim()).map(parseSourceJson);}
  catch(error){if(error.code!=='ENOENT')return failed(2,error.message);}
  const context={now:now(),currentFingerprints:source.currentFingerprints,outcomes,limits:[...activeLimits().values()],approval:source.preimages.decisions.premiumApprovals[profile.slice]??null};
  const r=route(profile,{...opts,snapshot:snap,context});
  const result={...base,...r,profile,profileHash:base.profileHash,providerSnapshot:base.providerSnapshot,
    candidates:r.relevantCandidates,exclusions:r.rejected,
    costOrder:{method:'dominance, complete estimate or catalog preference; reliability/latency/avoid for equal-cost ties only',tieGroup:r.costTieGroup,candidates:r.relevantCandidates.map(c=>({key:c.candidate,price:c.price,preferenceRank:c.preferenceRank,estimatedCost:estimatedTotalCost(c.price,profile.estimatedTokens)}))},
    unknowns:r.relevantCandidates.filter(c=>c.decision==='held').map(c=>({key:c.candidate,reasons:c.reasons})),
    planned:{engine:r.choice?.engine??null,model:r.choice?.model??null,effort:null,workKind:profile.workKind,tier:r.choice?.tier??null},
    usage:{inputTokens:null,outputTokens:null,promptBytes:null,source:'unreported'},handoffs:0,mentorQuestions:0,escalations:[],outcome:null,
    timestamps:{createdAt:r.decidedAt,updatedAt:r.decidedAt,closedAt:null}};
  // A decision is not an engine acknowledgement; no unguarded legacy fallback list is returned.
  result.fallbacks=[];
  try{source.revalidate(now());}
  catch(error){return failed(isIdentityHold(error.message)?8:5,error.message);}
  if(!snapshotLib.isFresh(snap,now(),source.currentFingerprints))return failed(5,'provider snapshot expired during routing');
  fs.mkdirSync(P.receipts,{recursive:true});
  const file=path.join(P.receipts,'project-'+require('node:crypto').randomUUID()+'.json'),temp=file+'.tmp';
  result.file=file;
  try{fs.writeFileSync(temp,JSON.stringify(result,null,2),{flag:'wx',mode:0o600});try{source.revalidate(now());}catch(error){return failed(isIdentityHold(error.message)?8:5,error.message);}if(!snapshotLib.isFresh(snap,now(),source.currentFingerprints))return failed(5,'provider snapshot expired during receipt write');fs.renameSync(temp,file);}
  finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  return {result,exitCode:r.choice?0:r.profileInvalid?2:r.noCapableCandidate?3:8};
}

// One audit append per parsed check invocation, including argument/profile/preflight failures.
function checkCommand(args) {
  const row={at:new Date().toISOString(),project:args[0]??null,key:args[1]??null,purpose:null,actor:process.env.FACTORY_ACTOR_ID||null,decision:'invalid',reasons:[],snapshotHash:null,profileHash:null,evidenceRefs:[],premiumJustification:null,actualConfirmation:'unknown'};
  const abort=(code,message)=>{const reasons=Array.isArray(message)?message:[message];throw Object.assign(Error(reasons.join('; ')),{checkExitCode:code,checkReasons:reasons});};
  let exitCode=2,providerSnapshot=null,actual=null;
  const limitations=['User/operator confirmation markers and source references are attestations, not authenticated provider/account proof.'];
  try {
    const rest=args.slice(2),options={};
    for(let i=0;i<rest.length;i+=2){const flag=rest[i];if(!['--purpose','--profile','--actual'].includes(flag)||Object.hasOwn(options,flag)||!rest[i+1]||rest[i+1].startsWith('--'))abort(2,'invalid check arguments');options[flag]=rest[i+1];}
    row.purpose=options['--purpose']??null;
    projectId(row.project);
    if(typeof row.key!=='string'||!/^[^/\s]+\/\S+$/.test(row.key))abort(2,'check requires engine/model key');
    const decoded=decodeURIComponent(row.key);if(decoded.includes('\\')||decoded.split('/').some(p=>!p||['.','..','__proto__','constructor','prototype'].includes(p)))abort(2,'unsafe check identity');
    if(!['native-delegation','cli-run','route','verify'].includes(row.purpose)||!options['--profile'])abort(2,'check requires --purpose and --profile');
    if(row.purpose!=='verify'&&options['--actual'])abort(2,'--actual is only valid for verify');
    let profile;try{profile=parseSourceJson(fs.readFileSync(options['--profile'],'utf8'));}catch{abort(2,'missing or invalid profile JSON');}
    row.profileHash=snapshotLib.fingerprint(profile);validateTaskProfile(profile);
    let source;
    try{source=readCurrentSources({project:row.project,sessionId:process.env.FACTORY_SESSION_ID,now:now()});}
    catch(error){abort(isIdentityHold(error.message)?8:2,error instanceof SyntaxError?'malformed current source JSON':error.message);}
    const snap=loadSnapshot(row.project);
    row.snapshotHash=typeof snap?.hash==='string'&&/^[a-f0-9]{64}$/.test(snap.hash)?snap.hash:null;
    providerSnapshot={path:snapshotPath(row.project),hash:row.snapshotHash,observedAt:snap?.observedAt??null};
    if(!validProjectSnapshot(snap,source,row.project,now()))abort(5,'invalid/missing/expired/changed provider snapshot; run snapshot explicitly');
    let outcomes=[];try{outcomes=fs.readFileSync(P.outcomes,'utf8').split(/\r?\n/).filter(s=>s.trim()).map(parseSourceJson);}catch(error){if(error.code!=='ENOENT')throw error;}
    const evaluated=snapshotLib.evaluateTask(snap,row.key,profile,{now:now(),currentFingerprints:source.currentFingerprints,outcomes,limits:[...activeLimits().values()],approval:source.preimages.decisions.premiumApprovals[profile.slice]??null});
    row.premiumJustification=evaluated.premiumJustification;
    const model=snap.models.find(m=>m.key===row.key),routeRef=source.preimages.config.routeIdentities.value.records[row.key]?.sourceRef;
    row.evidenceRefs=[...new Set([routeRef,...(model?.hierarchy.sourceRefs??[]),...(model?.priceEvidence.sourceRefs??[]),...Object.values(model?.capabilities??{}).flatMap(c=>c.sourceRefs??[]),row.premiumJustification?.sourceRef].filter(Boolean))];
    if(evaluated.decision!=='allowed')abort(evaluated.decision==='held'?8:6,evaluated.reasons.length?evaluated.reasons:[evaluated.decision]);
    if(row.purpose==='verify'){
      if(!options['--actual'])abort(6,'verify requires provider acknowledgement and a receipt reference');
      let acknowledgement;
      try{acknowledgement=parseSourceJson(fs.readFileSync(options['--actual'],'utf8'));}catch(error){if(error.code==='ENOENT')abort(6,'actual acknowledgement file missing');abort(2,'invalid actual envelope JSON');}
      snapshotLib.fingerprint(acknowledgement);
      if(!acknowledgement||typeof acknowledgement!=='object'||Array.isArray(acknowledgement))abort(2,'invalid actual envelope');
      acknowledgement={effort:null,...acknowledgement};
      const fields=['engine','model','effort','sourceRef','receiptPath','confirmation'];
      if(JSON.stringify(Object.keys(acknowledgement).sort())!==JSON.stringify(fields.sort())||!['engine','model','sourceRef','receiptPath'].every(k=>typeof acknowledgement[k]==='string'&&acknowledgement[k].trim())||!(acknowledgement.effort===null||typeof acknowledgement.effort==='string'&&acknowledgement.effort.trim())||!['provider-ack','unknown'].includes(acknowledgement.confirmation))abort(2,'invalid typed actual envelope');
      if(/[\r\n]/.test(acknowledgement.sourceRef)||acknowledgement.sourceRef.split(/[\\/]/).includes('..'))abort(2,'invalid acknowledgement source reference');
      if(/^https:/i.test(acknowledgement.sourceRef)){const u=new URL(acknowledgement.sourceRef);if(u.username||u.password||[...u.searchParams.keys()].some(k=>/key|secret|password|credential|token/i.test(k)))abort(2,'credential-bearing acknowledgement reference');}
      else if(/^[a-z][a-z\d+.-]*:/i.test(acknowledgement.sourceRef)&&!/^[a-z]:[\\/]/i.test(acknowledgement.sourceRef))abort(2,'acknowledgement reference must be HTTPS or a local artifact');
      if(acknowledgement.confirmation!=='provider-ack')abort(6,'requested/default/ledger attribution is not a provider acknowledgement');
      if(acknowledgement.engine+'/'+acknowledgement.model!==row.key)abort(6,'actual execution identity mismatch');
      let receipt;try{receipt=parseSourceJson(fs.readFileSync(acknowledgement.receiptPath,'utf8'));snapshotLib.fingerprint(receipt);}catch{abort(6,'missing or invalid selected-route receipt');}
      if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))abort(6,'invalid selected-route receipt: expected an object');
      if(receipt.mode!=='project'||receipt.project!==row.project||receipt.dispatchAuthorized!==true||receipt.held||receipt.choice?.key!==row.key||receipt.choice.engine!==acknowledgement.engine||receipt.choice.model!==acknowledgement.model||receipt.profileHash!==row.profileHash||receipt.providerSnapshot?.hash!==snap.hash||receipt.providerSnapshot.observedAt!==snap.observedAt||typeof receipt.providerSnapshot.path!=='string'||path.resolve(receipt.providerSnapshot.path)!==path.resolve(snapshotPath(row.project)))abort(6,'receipt identity/profile/snapshot evidence mismatch');
      row.evidenceRefs=[...new Set([...row.evidenceRefs,acknowledgement.sourceRef,acknowledgement.receiptPath])];
      row.actualConfirmation='provider-ack';
      if(acknowledgement.effort===null)limitations.push('Applied effort was not acknowledged and remains unknown.');
      actual=acknowledgement;
    }
    try{source.revalidate(now());}catch(error){abort(isIdentityHold(error.message)?8:5,error.message);}
    if(!validProjectSnapshot(snap,source,row.project,now()))abort(5,'provider snapshot expired during check');
    exitCode=0;row.decision='permitted';
  } catch(error) {
    exitCode=error.checkExitCode??2;row.decision=exitCode===8?'held':exitCode===6?'refused':'invalid';row.reasons=error.checkReasons??[error.message];
    // A supplied claim is not confirmed when later checks fail.
    row.actualConfirmation='unknown';
  }
  const log=path.join(STATE,'model-decisions.jsonl');
  // No permitted output can precede this single append. Failure propagates to the nonzero CLI handler.
  append(log,row);
  return {exitCode,result:{...row,permitted:exitCode===0,dispatchAuthorized:exitCode===0&&row.purpose!=='verify',providerSnapshot,actual,limitations,log}};
}

// Historical audit is read-only except its saved report. Current policy is comparison, never at-run proof.
function auditUsage(project,section,since=null) {
  projectId(project);const text=v=>typeof v==='string'&&v.trim(),fail=(ok,message)=>{if(!ok)throw Error(message);};
  fail(text(section),'audit requires --section');const sinceAt=since===null?null:Date.parse(since);
  if(since!==null)fail(typeof since==='string'&&/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(since)&&Number.isFinite(sinceAt),'invalid --since ISO date');
  const read=file=>{try{return parseSourceJson(fs.readFileSync(file,'utf8'));}catch(error){if(error instanceof SyntaxError)throw Error('invalid audit JSON source');throw error;}};
  const optional=file=>{try{return read(file);}catch(error){if(error.code==='ENOENT')return null;throw error;}};
  const bots=read(P.bots);fail(Array.isArray(bots),'invalid bots source');const byBot=new Map();for(const b of bots){fail(b&&text(b.id)&&!byBot.has(b.id),'invalid/duplicate bot id');byBot.set(b.id,{id:b.id,section:b.section??null});}
  const raw=readPolicy(),policyPresent=fs.existsSync(P.policy),allowlist=allowlistIds(raw,project),config=optional(P.config);
  const configured=config===null?null:new Set([config.defaultModelSelection,config.newBotDefaults?.profile?.modelSelection,...bots.flatMap(b=>[b.modelSelection,...(Array.isArray(b.tasks)?b.tasks:[]).map(t=>t.modelSelection)])].filter(s=>text(s?.instanceId)&&text(s?.model)).map(s=>s.instanceId+'/'+s.model));
  fail(Array.isArray(raw.knownExceptions??[]),'invalid knownExceptions');
  const scope=usageRecords({details:true}),observed=now(),rows=[],covered=[];let otherSection=0,otherProject=0,beforeSince=0;
  let receiptIndex=null;
  function linked(record){
    if(text(record.receiptPath)){const file=path.resolve(STATE,record.receiptPath);return {file,receipt:read(file)};}
    const session=text(record.sessionId)?record.sessionId:null,thread=text(record.threadId)?record.threadId:null;
    if(!session&&!thread)throw Error('no explicit receipt/session link');
    if(receiptIndex===null){let names=[];try{names=fs.readdirSync(P.receipts).filter(f=>f.endsWith('.json'));}catch(error){if(error.code!=='ENOENT')throw error;}receiptIndex=names.flatMap(name=>{const file=path.join(P.receipts,name);try{const receipt=read(file);return receipt&&typeof receipt==='object'?[{file,receipt}]:[];}catch{return [];}});}
    const matches=receiptIndex.filter(({receipt:r})=>r.project===project&&(session?(r.sessionId===session||r.session===session):thread&&r.threadId===thread));
    fail(matches.length===1,matches.length?'ambiguous explicit session link':'no linked session receipt');return matches[0];
  }
  const add=(a,b)=>{const v=(a??0)+b;fail(Number.isFinite(v),'audit measurement total overflow');return v;};
  function summarize(list){
    const totals={rows:list.length,authorizationAtRun:{authorized:0,unauthorized:0,unknown:0},tierAtRun:{worker:0,premium:0,unknown:0},actualIdentity:{confirmed:0,unknown:0},attribution:{section:0,unknown:0},currentPolicyComparison:{allowlisted:0,notAllowlisted:0,unknown:0},costSources:{reported:{rows:0,usd:null},estimated:{rows:0,usd:null},unreported:{rows:0,usd:null}},tokens:{measuredRows:0,unreportedRows:0,tokensReportedFalse:0,total:null},premiumCoverage:{eligibleRows:0,unknownTierRows:0,unknownActualRows:0,unknownAttributionRows:0,tokens:{eligible:null,premium:null,share:null},reportedCost:{eligible:null,premium:null,share:null},estimatedCost:{eligible:null,premium:null,share:null}}};
    for(const r of list){totals.authorizationAtRun[r.authorizationAtRun]++;totals.tierAtRun[r.tierAtRun]++;totals.actualIdentity[r.actualKey?'confirmed':'unknown']++;totals.attribution[r.attribution]++;totals.currentPolicyComparison[r.currentPolicyComparison.allowlisted===null?'unknown':r.currentPolicyComparison.allowlisted?'allowlisted':'notAllowlisted']++;
      const cost=totals.costSources[r.costSource];cost.rows++;if(r.costSource!=='unreported')cost.usd=add(cost.usd,r.costUsd);
      if(r.measuredTokens===null)totals.tokens.unreportedRows++;else{totals.tokens.measuredRows++;totals.tokens.total=add(totals.tokens.total,r.measuredTokens);}if(r.tokensReported===false)totals.tokens.tokensReportedFalse++;
      const c=totals.premiumCoverage;if(r.tierAtRun==='unknown')c.unknownTierRows++;if(!r.actualKey)c.unknownActualRows++;if(r.attribution==='unknown')c.unknownAttributionRows++;
      if(r.actualKey&&r.tierAtRun!=='unknown'&&r.attribution==='section'){c.eligibleRows++;const premium=r.tierAtRun==='premium';for(const [bucket,value] of [['tokens',r.measuredTokens],['reportedCost',r.costSource==='reported'?r.costUsd:null],['estimatedCost',r.costSource==='estimated'?r.costUsd:null]])if(value!==null){c[bucket].eligible=add(c[bucket].eligible,value);c[bucket].premium=add(c[bucket].premium,premium?value:0);}}
    }
    for(const bucket of ['tokens','reportedCost','estimatedCost']){const c=totals.premiumCoverage[bucket];c.share=c.eligible>0?c.premium/c.eligible:null;}return totals;
  }
  for(const record of scope.records){
    fail(record&&typeof record==='object'&&!Array.isArray(record),'invalid ledger record');const at=typeof record.at==='string'?Date.parse(record.at):NaN;fail(Number.isFinite(at)&&at<=observed,'invalid/future ledger time');covered.push(at);
    if(sinceAt!==null&&at<sinceAt){beforeSince++;continue;}if(record.project!==undefined&&record.project!==project){otherProject++;continue;}
    const bot=byBot.get(record.botId),attributed=bot&&text(bot.section);if(attributed&&bot.section!==section){otherSection++;continue;}
    const reportedKey=text(record.instanceId)&&text(record.model)?record.instanceId+'/'+record.model:null;
    const r={at:record.at,botId:typeof record.botId==='string'?record.botId:null,attribution:attributed?'section':'unknown',reportedKey,actualKey:null,authorizationAtRun:'unknown',tierAtRun:'unknown',currentPolicyComparison:null,costSource:'unreported',costUsd:null,tokensReported:record.tokensReported??null,measuredTokens:null,knownExceptionReasons:[],evidence:{receiptPath:null,snapshotPath:null,snapshotHash:null},findings:[]};
    if(record.costUsd!==null&&record.costUsd!==undefined)fail(typeof record.costUsd==='number'&&Number.isFinite(record.costUsd)&&record.costUsd>=0,'invalid ledger cost');
    if(record.costSource==='reported'||record.costSource==='estimated')if(record.costUsd!=null){r.costSource=record.costSource;r.costUsd=record.costUsd;}
    if(record.tokensReported!==false&&Number.isSafeInteger(record.input)&&record.input>=0&&Number.isSafeInteger(record.output)&&record.output>=0&&Number.isSafeInteger(record.input+record.output))r.measuredTokens=record.input+record.output;
    try{
      const link=linked(record),receipt=link.receipt;fail(receipt&&typeof receipt==='object'&&!Array.isArray(receipt)&&receipt.project===project,'invalid/foreign linked receipt');r.evidence.receiptPath=link.file;
      if(text(record.sessionId)&&text(receipt.sessionId??receipt.session))fail(record.sessionId===(receipt.sessionId??receipt.session),'receipt/session link mismatch');
      if(text(record.threadId)&&text(receipt.threadId))fail(record.threadId===receipt.threadId,'receipt/thread link mismatch');
      const a=record.actual??receipt.actual,confirmed=a&&text(a.engine)&&text(a.model)&&(a.confirmation==='provider-ack'&&text(a.sourceRef)||typeof a.confirmedBy==='string'&&/^engine:.+/.test(a.confirmedBy));
      fail(confirmed,'actual execution identity unconfirmed; requested/default/ledger attribution is not acknowledgement');r.actualKey=a.engine+'/'+a.model;
      fail(!receipt.choice?.key||receipt.choice.key===r.actualKey,'selected/actual identity mismatch');
      if(reportedKey&&reportedKey!==r.actualKey)r.findings.push('ledger-attributed model differs from acknowledged actual identity');
      const ref=receipt.providerSnapshot;fail(ref&&text(ref.path)&&text(ref.hash),'no explicit historical snapshot reference');
      const file=path.resolve(STATE,ref.path),snapshot=read(file);r.evidence.snapshotPath=file;
      fail(snapshot&&typeof snapshot==='object'&&snapshot.schema===2&&snapshot.project===project&&Array.isArray(snapshot.models)&&Array.isArray(snapshot.allowed),'invalid historical snapshot');const {hash,...content}=snapshot;
      fail(hash===ref.hash&&hash===snapshotLib.fingerprint(content)&&snapshot.observedAt===ref.observedAt,'historical snapshot hash/reference mismatch');r.evidence.snapshotHash=hash;
      const start=Date.parse(snapshot.observedAt),end=Date.parse(snapshot.expiresAt),decided=Date.parse(receipt.decidedAt??receipt.timestamps?.createdAt);
      fail(Number.isFinite(start)&&Number.isFinite(end)&&start<=at&&at<=end&&(snapshot.evidenceExpiresAt==null||at<Date.parse(snapshot.evidenceExpiresAt))&&Number.isFinite(decided)&&decided<=at,'snapshot/receipt not contemporaneous with execution');
      const m=snapshot.models.find(m=>m.key===r.actualKey);r.authorizationAtRun=snapshot.allowed.includes(r.actualKey)&&m?.authorization?.status==='allowed'?'authorized':'unauthorized';
      r.tierAtRun=['worker','premium'].includes(m?.hierarchy?.value)?m.hierarchy.value:'unknown';
    }catch(error){r.authorizationAtRun='unknown';r.tierAtRun='unknown';r.findings.push('historical proof unknown: '+(error instanceof SyntaxError?'invalid linked JSON':error.code?'linked historical evidence unavailable':error.message));}
    const compared=r.actualKey??reportedKey,decision=raw.projects?.[project]?.modelDecisions?.[compared];
    r.currentPolicyComparison={key:compared,allowlisted:policyPresent?allowlist.includes(compared):null,configured:configured===null?null:configured.has(compared),tierClaim:['worker','premium'].includes(decision?.tier)?decision.tier:'unknown',tierClaimStatus:'current project answer only; binding not revalidated; never historical proof'};
    for(const e of raw.knownExceptions??[]){if(!e||!text(e.reason))continue;const keys=['key','botId','receiptPath','sessionId'].filter(k=>e[k]!==undefined);if(!keys.length)continue;const values={key:compared,botId:record.botId,receiptPath:r.evidence.receiptPath,sessionId:record.sessionId};if(keys.every(k=>e[k]===values[k])&&(e.project===undefined||e.project===project)&&(e.from===undefined||Number.isFinite(Date.parse(e.from))&&at>=Date.parse(e.from))&&(e.until===undefined||Number.isFinite(Date.parse(e.until))&&at<=Date.parse(e.until)))r.knownExceptionReasons.push(e.reason);}
    if(r.attribution==='unknown')r.findings.push('section attribution unknown: bot removed or missing');if(r.authorizationAtRun!=='authorized')r.findings.push('authorization-at-run '+r.authorizationAtRun);if(r.tierAtRun==='unknown')r.findings.push('tier-at-run unknown');if(!r.actualKey)r.findings.push('actual identity unknown');if(r.costSource==='unreported')r.findings.push('cost unreported');if(r.measuredTokens===null)r.findings.push('token telemetry unreported');rows.push(r);
  }
  const grouped=new Map();for(const r of rows){const key=JSON.stringify([r.botId,r.actualKey??r.reportedKey,r.attribution]);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(r);}
  const from=covered.length?new Date(covered.reduce((a,b)=>Math.min(a,b),Infinity)).toISOString():null,to=covered.length?new Date(covered.reduce((a,b)=>Math.max(a,b),-Infinity)).toISOString():null;
  const report={schema:2,project,observedAt:new Date(observed).toISOString(),coveredRange:{scope:'last-two-ledger-files',files:scope.files,from,to,earlierFilesOmitted:scope.omittedFiles,missingEarlierHistory:scope.omittedFiles>0||sinceAt!==null&&(from===null||sinceAt<Date.parse(from)),completeness:'History outside these files is not established.'},filters:{section,since,otherSectionRowsExcluded:otherSection,otherProjectRowsExcluded:otherProject,beforeSinceRowsExcluded:beforeSince,unknownAttributionIncluded:true},rows,groups:[...grouped.values()].map(list=>({botId:list[0].botId,key:list[0].actualKey??list[0].reportedKey,attribution:list[0].attribution,totals:summarize(list)})),...summarize(rows),dispatchAuthorized:false,findings:rows.flatMap((r,i)=>r.findings.map(reason=>({row:i,reason}))),limitations:['Receipt/session links and engine/provider-ack markers are local attestations, not authenticated provider/account proof.','Current readiness and tier claims do not establish historical authorization or tier.','Only the last two ledger files are covered; unknown/removed section attribution is reported separately and excluded from section premium shares.','Legacy costs without explicit source remain unreported; estimates and subscription-equivalent reported USD are not verified billed charges.']};
  // Keep rows as the detailed array; totals.rows is its count.
  report.totals={...summarize(rows)};report.rows=rows;
  const dir=path.join(STATE,'audits');fs.mkdirSync(dir,{recursive:true});report.file=path.join(dir,project+'-'+observed+'-'+require('node:crypto').randomUUID()+'.json');const temp=report.file+'.tmp';try{fs.writeFileSync(temp,JSON.stringify(report,null,2),{flag:'wx',mode:0o600});fs.renameSync(temp,report.file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  return report;
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
    if (cmd === 'audit') {
      for(const name of ['--section','--since']){const i=a.indexOf(name);if(i>=0&&(a.lastIndexOf(name)!==i||!a[i+1]||a[i+1].startsWith('--')))throw Error('audit flag requires one value: '+name);}
      const section=flag('--section'),since=flag('--since');
      if(a.length!==1)throw Error('audit requires project --section name [--since ISO]');
      const result=auditUsage(a[0],section,since??null);
      if(json)console.log(JSON.stringify(result,null,2));else console.log('AUDIT '+result.project+': '+result.findings.length+' findings; '+result.file);
      process.exit(result.findings.length?7:0);
    } else if (cmd === 'check') {
      const {result,exitCode}=checkCommand(a);
      if(json)console.log(JSON.stringify(result,null,2));else console.log(result.decision+': '+result.reasons.join('; '));
      process.exit(exitCode);
    } else if (cmd === 'evidence-import' || cmd === 'model-record') {
      const file=flag('--file'),project=cmd==='model-record'?a.shift():process.env.FACTORY_PROJECT_ID;
      if(a.length)throw Error('unexpected record arguments');
      console.log(JSON.stringify(recordProviderInput(cmd,project,file)));
    } else if (cmd === 'receipt') {
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
    } else if (cmd === 'allowlist') {
      const p = projectId(a.shift()), add = flag('--add'), remove = flag('--remove'), show = has('--show');
      const source = flag('--source'), confirmedBy = flag('--confirmed-by');
      if (Number(add !== undefined) + Number(remove !== undefined) + Number(show) !== 1 || a.length ||
        (add !== undefined && (typeof source !== 'string' || !source.trim())) ||
        (add === undefined && (source !== undefined || confirmedBy !== undefined))) throw Error('usage: allowlist <project> --add ids --source text | --remove ids | --show');
      const ids = (add ?? remove ?? '').split(',').filter(Boolean);
      if (!show && (!ids.length || ids.some(id => !/^[^/\s]+\/\S+$/.test(id)))) throw Error('usage: model ids must be engine/model');
      const raw = readPolicy();
      let list = raw.projects?.[p]?.allowlist || [];
      if (add !== undefined) {
        const configured = configuredModels();
        for (const id of ids) {
          list = list.filter(e => (typeof e === 'string' ? e : e.id) !== id);
          // Authorization only: never assigns a tier here; tier stays an owner-recorded model decision.
          list.push({id, confirmedBy: confirmedBy || 'user', confirmedAt: new Date().toISOString(), source});
          if (!configured.has(id)) console.error(`warning: ${id} is not a configured model selection; the snapshot will refuse it until the owner selects it`);
        }
      } else if (remove !== undefined) list = list.filter(e => !ids.includes(typeof e === 'string' ? e : e.id));
      if (!show) {
        raw.projects ||= {}; raw.projects[p] ||= {}; raw.projects[p].allowlist = list;
        fs.mkdirSync(STATE, {recursive: true}); fs.writeFileSync(P.policy, JSON.stringify(raw, null, 2));
      }
      console.log(JSON.stringify(list, null, 2));
    } else if (cmd === 'snapshot') {
      const hasCapture = a.includes('--team-setup'), hasCapturedAt = a.includes('--captured-at'), hasEvidence = a.includes('--evidence');
      const project = projectId(a.shift()), captureFile = flag('--team-setup'), explicitAt = flag('--captured-at'), evidenceFile = flag('--evidence');
      if (a.length || (hasCapture && captureFile === undefined) || (hasCapturedAt && explicitAt === undefined) || (hasEvidence && evidenceFile === undefined) ||
        (explicitAt !== undefined && !Number.isFinite(Date.parse(explicitAt)))) throw Error('usage: snapshot <project> [--team-setup file|-] [--captured-at ISO] [--evidence file]');
      const teamSetupText = captureFile === undefined ? null : readIn(captureFile);
      let snap;
      try {
        snap = takeSnapshot(project, {teamSetupText, teamSetupPath: captureFile === '-' ? 'stdin' : captureFile ?? null, capturedAt: explicitAt ?? null, evidenceFile: evidenceFile ?? null});
      } catch (e) {
        if (isIdentityHold(e.message)) { console.error(e.message); process.exit(8); }
        throw e;
      }
      if (!allowlistIds(readPolicy(), project).length) console.error(`warning: no allowlist for ${project}; every model is refused until the user confirms one (allowlist --add)`);
      if (json) console.log(JSON.stringify(snap, null, 2));
      else {
        console.log(`SNAPSHOT ${project} hash=${snap.hash} expires=${snap.expiresAt} teamSetup=${snap.sources.teamSetup.status}`);
        for (const m of snap.models) console.log(m.authorization.status === 'allowed' ? `  ALLOWED ${m.key}${m.authorization.flags.length ? '  flags: ' + m.authorization.flags.join(', ') : ''}` : `  REFUSED ${m.key}: ${m.authorization.reasons.join('; ')}`);
      }
    } else if (cmd === 'supply') {
      const s = supply();
      if (json) console.log(JSON.stringify(s, null, 2));
      else for (const e of s.engines) {
        const used = e.models.filter(m => m.usage);
        console.log(`${e.id.padEnd(13)} catalog=${e.catalogAt ? e.catalogAt.slice(0, 16) : 'none'}${e.catalogStale ? ' (stale)' : ''} models=${e.models.filter(m => m.inCatalog).length} free=${e.models.filter(m => m.priceReported === 'free').length} lastRun=${e.runEvidence || '-'}`);
        for (const m of used) console.log(`    ran ${m.id}${m.inCatalog ? '' : '  [WITHDRAWN from catalog]'} runs=${m.usage.runs} 5h_tokens=${m.usage.tokens5h}`);
      }
    } else if (cmd === 'route') {
      for(const name of ['--project','--work-kind','--exclude','--avoid','--not-engine']) {
        const i=a.indexOf(name);if(i>=0&&(a.lastIndexOf(name)!==i||!a[i+1]||a[i+1].startsWith('--')))throw Error('route flag requires one value: '+name);
      }
      const workKind=flag('--work-kind'), project=flag('--project');
      if(!project)throw Error('route requires --project');
      const opts={project,exclude:(flag('--exclude')||'').split(',').filter(Boolean),avoid:(flag('--avoid')||'').split(',').filter(Boolean),notEngine:flag('--not-engine')};
      if(a.length!==1)throw Error('route requires one profile file');
      const input=parseSourceJson(readIn(a[0]));
      const profile=workKind===undefined?input:{...input,workKind};
      const {result,exitCode}=routeCommand(profile,opts);
      if(json)console.log(JSON.stringify(result,null,2));
      else console.log(result.choice ? 'CHOICE '+result.choice.key : 'NO CANDIDATE: '+result.reason);
      process.exit(exitCode);
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
      console.error('commands: supply | allowlist | snapshot | route | receipt | opencode-discover | opencode-prefer | limit | detect | outcome | classify (see header)'); process.exit(2);
    }
  } catch (e) { console.error(e.message); process.exit(2); }
}
module.exports = {classify, supply, route, recordLimit, activeLimits, P, readCurrentSources, takeSnapshot, loadSnapshot, snapshotPath};
