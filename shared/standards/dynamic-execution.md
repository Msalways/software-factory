# Dynamic execution: routing, limits and fallback
Updated: 2026-11-10. Patterns adapted from Bernstein (cheap-first cascade), Claudexor (quota headroom preflight, effort receipt, rotate before/after progress), opencode-swarm (context budget and handoff), Fusion (per-task model precedence) and agent-yes (limit-signal detection).

Atlas or the project Lead chooses engine, model and effort **per slice, from live data**. Nothing here or in any SOUL or skill names a specific model or assumes something is free. Bot defaults are bootstrap settings, not a router.

## 1. Discover supply (each dispatch)
- Ready engines and their current models: Hattera's live engine catalog (`~/.openmausbot/providers/engine-models/*.json`). Re-probe the engine itself when an entry is stale or the engine is new. A catalog entry is a hint. A successful run proves the route.
- For each candidate: effort levels it advertises, image input, context size, current price/free status as the engine reports it now, and recent limit or failure events (`~/.openmausbot/usage/*.jsonl`, slice attempt history).
- Every value carries an observed time. Unknown stays unknown and is never treated as free or $0.

## 2. Route
1. Filter to candidates that meet the slice's needs (requirements profile in the slice spec) and have quota headroom (section 4).
2. Rank cheapest-capable first for the complexity and budget class.
3. Choose effort only from that engine's advertised levels: low complexity → low, medium → medium, cross-cutting or risky → high. A repeated failure escalates one step or changes engine.
4. Spread parallel slices across engines and accounts so one limit cannot stall everything. Give the verifier a different engine from the builder where one is available.
5. Write a **routing receipt** in the slice record: the candidates considered, the choice, the reason, effort requested and effort actually applied, and the supply snapshot time.
6. Mark the slice *running* only once the engine has accepted the execution identity (thread or session ID, engine, model).

## 3. How to dispatch today

`balanced` retains eligibility and hard-need filters, then ranks observed attempt
failure rate (weight 0.5), cost (0.3), and latency (0.2). Cost is normalized as
dollars / (dollars + 0.01); latency as milliseconds / (milliseconds + 60000).
Receipts expose weights, scales, scores, sample counts and null missing values.
Missing observations receive penalty 1; they are never assumed free or instant.
`free-first` retains price-class priority. Measurements do not authorize routes
or prove current provider readiness.

All scoring defaults live in `tools/route-defaults.json`. Override individual
`balanced.weights`, `balanced.costScaleUsd`, `balanced.latencyScaleMs`,
`balanced.unknownPenalty`, `capability.minOutcomes`,
`capability.minSuccessRate`, or `costRank` keys in `route-policy.json` under
`FACTORY_STATE_DIR`. Omitted keys inherit the documented JSON defaults. Invalid
numeric values fail routing; scales must be positive, weights nonnegative with
at least one positive, success rate within [0,1], minimum outcomes a positive
integer, and unknown penalty at least 1. Normalization scales are policy tuning
parameters, not prices claimed for any model. Receipts show resolved values and
their configuration paths. Model and engine identifiers have no scoring rules.

Free status requires an explicit `priceReported: "free"` catalog field or an
operator-confirmed cost class in policy. Names and labels do not establish free
status. Existing catalogs without structured price evidence remain unknown.

Record actual observations using optional `outcome` flags `--cost-usd <dollars>`
and `--duration-ms <milliseconds>`. Omit unreported values rather than supplying
zero. These are operator-recorded observations; automatic native execution
correlation remains unimplemented.
- **Native teammates:** the receiving bot runs on its own default model, because Hattera's handoff has no per-task model override. Routing natively means choosing the bot whose engine matches the receipt. Chiefs' setup catalog lists only models already chosen on some bot, so an engine with no bot stays invisible until a bot uses it.
- **Engine CLI in the slice worktree** (when shell access is authorised): for example `opencode.cmd run --model <discovered-provider/model> --format json --file <brief>`. Use a fresh session per independent slice, and resume only that slice's own recorded session. Keep approval boundaries; never use `--auto` to bypass them.
- Still needed in Hattera: per-task model and effort in delegation, and a full engine catalog for Chiefs.

## 3a. Tools (`tools/` in the factory root, Node, no model calls)
- `node tools/factory-route.cjs supply`: live snapshot of engines, catalogs (with staleness), models that ran here, and models withdrawn from a catalog.
- `node tools/factory-route.cjs route <profile.json> [--not-engine <builder engine>] [--avoid <busy engines>] [--exclude engine/model,...]`: ranked choice, fallbacks and a routing receipt in `state/routing/receipts/`. Exit code 3 means there is no candidate, so mark the slice waiting-for-quota. The profile is `{"slice","complexity":"low|medium|high","budget":"free-first|balanced|best-quality","needs":{"imageInput","contextTokens"},"attempt"}`.
- `node tools/factory-route.cjs detect <engine> --model <m> <output-file|->`: classifies output text and records limit signals. These are engine-wide unless `--model-scoped`, and keep any reset time given.
- `node tools/factory-route.cjs limit <engine> --signal "<text>" [--reset ISO]`: records a limit seen elsewhere, for example a Hattera incident.
- `node tools/factory-route.cjs outcome <engine> <model> <complexity> <ok|transient|limit|broken|too-big|spec|repeated> --slice <id> --note "<evidence>"`: **record one after every verified slice.** Capability is learned from these records. A model counts as proven at a complexity after at least 2 relevant outcomes with at least 70% success. Unproven or free models are tried on low complexity, and a cold start is labelled in the receipt.
- `node tools/factory-gates.cjs check <worktree> <evidence.json> --run [--ui]`: the verify gate (artifacts_exist, diff_matches_claims, tests_pass). Exit code 0 only when every gate passes.
- Editable data: `state/routing/route-policy.json` holds effort levels as engines report them, cost class when the user states it, and overrides. Change only from engine-reported or user-given facts.

## 4. Limits: quota, session and context
- **Preflight before every dispatch:** check each candidate account's recent limit events and, where readable, its 5-hour and weekly usage windows. Skip candidates without headroom for the slice's size. Treat quota reads older than about 5 minutes as stale.
- **Limit signals:** typed errors, and CLI or engine output such as "usage limit", "5-hour limit", "session limit", "rate limit", HTTP 429, or 5xx. Record the signal verbatim with its time.
- **Context budget:** at about 70% of the window, compact or trim the context. At about 90%, write a **continuation packet** and continue in a fresh session.
- **Continuation packet** (`context.md` in the slice folder): goal and spec pointer, verified progress (revision, checks passed), the diff summary, remaining steps, open risks, and attempt history. The next session works from the packet plus the repository, not the old transcript.

## 5. Fallback
Classify the failure using gates-and-handoffs.md, then:
- **Limit before progress:** rotate to the next ranked candidate and start fresh.
- **Limit after progress:** write the continuation packet and resume on the next ranked candidate.
- **Transient:** retry once on the same route, with backoff. **Broken route:** mark it bad for this slice and use the next candidate. **Too big:** split the slice.
- If no candidate has headroom, mark the slice *waiting-for-quota* with the earliest known reset time and continue other slices. Do not stall the whole feature.
- Never silently move to a **paid** route the user has not authorised. A cost increase is a held decision.
- Record every fallback in the attempt history.

## Observed status (2026-11-04, historical; re-verify before relying on it)
OpenCode command: `opencode.cmd` in the user's npm global folder. Its run help confirms per-run `--model provider/model#variant`, `--file`, `--format json` and session options. The PowerShell .ps1 launcher was blocked by execution policy, and the .cmd launcher worked. In the sandbox, the CLI needed approved access to write its log outside the task workspace. Hattera setup controls exposed only Codex at that time, which was a catalog limit (above), not proof that OpenCode was unconfigured.

## Mentor and worker routing
Work kind and model tiers are owner-editable policy data in route-policy.example.json.
Orchestration, planning, review and explanation request premium; implementation and
routine verification request worker. These are policy defaults, not model assignments.
Dispatch intersects the requested tier with live owner-authorized configured catalog
choices. Unknown observations remain unknown. An empty tier falls back only within
existing authorization, with the reason recorded; discovery never grants permission.

Before dispatch the Lead writes shared/templates/slice-brief.md into the project.
Workers own separate threads/worktrees and ask mentors for bounded guidance from
those threads. Mentors do not take over implementation. Escalation to premium
requires the same check failing twice or a proven incorrect brief, with evidence.
Rooms carry status, decisions and blockers only. Link detailed explanations instead
of replaying them in every room turn. Native per-turn usage originates in Hattera's
usage ledger; a route request is not proof of accepted execution or reported usage.
