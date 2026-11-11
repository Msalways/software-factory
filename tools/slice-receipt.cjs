const fs = require('node:fs');
const text = v => typeof v === 'string' && v.trim();
function load(file) {
  const r = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  // Legacy choice is intent, never execution confirmation.
  r.planned ??= {engine: r.choice?.engine ?? null, model: r.choice?.model ?? null,
    effort: r.choice?.effort?.requested ?? null, workKind: r.workKind ?? null,
    tier: r.tier ?? null, fallback: r.fallback ?? false, fallbackReason: r.fallbackReason ?? null};
  r.actual ??= {engine: null, model: null, effort: null, confirmedBy: 'unconfirmed'};
  r.usage ??= {inputTokens: null, outputTokens: null, promptBytes: null, source: 'unreported'};
  r.handoffs ??= 0; r.mentorQuestions ??= 0; r.escalations ??= [];
  r.outcome ??= null;
  r.timestamps ??= {createdAt: r.decidedAt ?? null, updatedAt: null, closedAt: null};
  return r;
}
function update(file, action, payload) {
  // Exclusive lock + atomic replace prevents lost increments and double closes
  // across CLI processes. A crashed lock is retained for explicit recovery.
  const lock = file + '.lock', temp = file + '.tmp';
  const handle = fs.openSync(lock, 'wx');
  try {
    const r = load(file), at = new Date().toISOString();
    if (r.outcome !== null || r.timestamps.closedAt) throw Error('receipt already closed');
    if (action === 'handoff') r.handoffs++;
    else if (action === 'mentor') r.mentorQuestions++;
    else if (action === 'escalate') {
      if (!payload || !['check-failed-twice', 'brief-wrong', 'other'].includes(payload.reason) ||
        !text(payload.note) || !text(payload.fromTier) || !text(payload.toTier)) throw Error('escalation requires valid reason, note, fromTier and toTier');
      r.escalations.push({at, fromTier: payload.fromTier, toTier: payload.toTier, reason: payload.reason, note: payload.note});
    } else if (action === 'report') {
      // Explicit operator import of reported evidence, NOT automatic verification.
      // Today Hattera server/runtime.ts bookTurnUsage -> server/usage-ledger.ts
      // appendUsage writes usage/*.jsonl (tokensReported and optional promptBytes).
      // Ledger model attribution uses configuration; not a provider acknowledgement.
      // codex.ts session.started may fall back to requested model; raw provider
      // acknowledgement is required to distinguish confirmed from intended data.
      // Engine JSON turn/session events can confirm model/effort when reported.
      // Automatic provider-event decoding and slice/turn correlation are unwired.
      if (!payload || !['engine', 'hattera'].includes(payload.source) || !text(payload.reference)) throw Error('report requires engine/hattera source and evidence reference');
      const source = `${payload.source}:${payload.reference}`;
      if (payload.actual !== undefined) {
        const a = payload.actual;
        if (!a || !text(a.engine) || !text(a.model) || (a.effort != null && !text(a.effort))) throw Error('reported actual requires engine/model, optional reported effort');
        r.actual = {engine: a.engine, model: a.model, effort: a.effort ?? null, confirmedBy: source};
      }
      if (payload.usage !== undefined) {
        const u = payload.usage;
        if (!u || typeof u !== 'object' || Array.isArray(u)) throw Error('usage must be an object');
        const usage = {source: 'unreported', sources: {}};
        for (const key of ['inputTokens', 'outputTokens', 'promptBytes']) {
          const value = u[key] ?? null;
          if (value !== null && (!Number.isSafeInteger(value) || value <= 0)) throw Error(`${key} must be a positive reported integer or null; never use zero for missing data`);
          usage[key] = value; usage.sources[key] = value === null ? 'unreported' : source;
          if (value !== null) usage.source = source;
        }
        r.usage = usage;
      }
      if (payload.actual === undefined && payload.usage === undefined) throw Error('report has no actual or usage evidence');
    } else if (action === 'close') {
      if (!['passed', 'failed', 'split', 'escalated', 'abandoned'].includes(payload)) throw Error('invalid receipt outcome');
      r.outcome = payload; r.timestamps.closedAt = at;
    } else throw Error('unknown receipt action');
    r.timestamps.updatedAt = at;
    fs.writeFileSync(temp, JSON.stringify(r, null, 2)); fs.renameSync(temp, file);
    return r;
  } finally {
    fs.closeSync(handle); fs.rmSync(temp, {force: true}); fs.unlinkSync(lock);
  }
}
module.exports = {load, update};
