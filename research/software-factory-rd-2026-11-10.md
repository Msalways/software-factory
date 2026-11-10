# Software factory R&D — public repos (2026-11-10)

Source list: https://github.com/varun1505/awesome-software-factories (~400 entries). Shortlisted 17 against the requirements below and read their READMEs and key docs. **This is documentation review only. Nothing was installed or benchmarked.** Several long docs were partly summarised; unverified points are marked.

## Requirements
1. Route each task to a provider/model/effort by complexity, discovered live (nothing hardcoded; free today ≠ free tomorrow).
2. Be aware of session/quota windows (5-hour, weekly) and context-window usage; fall back to another available provider automatically.
3. Parallel execution with isolation; multi-project; durable tracking.
4. A dedicated design role that is requested for UI work.

## Headline finding
**No single repo meets all four.** Complexity-based routing with live quota fallback is the gap nearly every project leaves open. The best pieces are spread across a handful of repos:

| Need | Best reference | What to take |
|---|---|---|
| Quota/session-limit awareness + auto fallback | **Claudexor** (MIT) | Per-account quota ledger with 5-min TTL from vendor usage reads; *headroom preflight* before dispatch; typed limit signals (`vendor_limit_rejected`, `subscription_window_exhausted`); **rotate before progress = retry fresh elsewhere, after progress = continuation packet**; pinned vs auto-pool; `EffortResolution` receipt (requested vs actually applied effort); unknown cost is never shown as $0. |
| Context-window budget | **opencode-swarm** (MIT) | `context_budget` warn 0.7 / critical 0.9, prune to 0.7, keep last N turns; `/swarm handoff` writes `context.md` for the next session; `fallback_models` (≤3) on 429/503/timeout, sticky per session. |
| Failure taxonomy + done contract | **outsourcerer** (ideas only — PolyForm Noncommercial license) | Transient → retry same model; broken model → next candidate; too big → split; same failure twice → human. "A worker saying it's finished is a claim": done = commit + clean tree + passing check + `evidence.json`; merge lock + recheck on integration worktree. Held decisions with a default and deadline. |
| Cheap-first escalation, deterministic scheduler | **Bernstein** (Apache-2.0, beta) | LLM-free scheduler over file state with atomic claims; role → model+effort policy with abstract tiers (`coding-worker`, `coding-manager`); cascade router: try cheaper, escalate on failure; janitor verifies concrete signals, not agent claims; 429 tracker. |
| Workflow owned by code, agents as bounded nodes | **Super Simple Software Factory** (MIT) | Deterministic graph; gates (`artifacts_exist`, `diff_matches_claims`, `tests_pass`), default-fail; envelope-only handoff between phases. |
| Multi-project + per-task model lanes | **Fusion** (MIT, early preview) | `fn project add`; per-task → project → global model precedence; separate lanes for planning/execution/validation/merge; dependency graph runs independent tasks in parallel, worktree per task; global concurrency cap so one project cannot starve others. |
| Org, budgets, heartbeats | **Paperclip** (MIT, ~113k★) | Agents with adapters (incl. `opencode_local`); budgets per company/agent/project (warn 80%, pause scope at 100%); DB-backed wakeup/heartbeat queue; atomic ticket checkout with blocker dependencies; approval for new hires. *No routing or fallback.* |
| Stage → backend mapping | **oh-my-symphony** (Apache-2.0) | `agent.stage_kinds` maps stages to CLIs; `agent.fallback_kinds`; SQLite leases; per-ticket worktrees; verify commands per lane. (Fallback trigger logic unverified.) |
| Quota gate + claims | **LoopX** (Apache-2.0) | `should-run` before work, idempotent `spend-slot` after; leases with TTL + compare-and-swap; worktree required for writes. |
| Durable work items | **Gas City / Gas Town** (MIT) | Work as durable "beads"; provider resolution chain agent → workspace → auto-detect, presets incl. OpenCode; merge queue (Refinery). |
| **Design role** | **gstack** (MIT, ~141k★) | `/design-consultation` writes **DESIGN.md** (the project design system); `/plan-design-review` scores plans 0–10 per dimension with AI-slop detection; `/design-shotgun` 4–6 variants with taste memory; `/design-review` live audit with before/after screenshots and atomic fix commits. |
| Rate-limit detection regexes | **agent-yes** (MIT) | Anchored patterns on the CLI's own output (`hit your usage limit`, `(session|5-hour) limit reached`, 429/5xx); `needs_input` state. Heuristic only. |

Also reviewed, lower fit: OpenAI Symphony (single Codex runner, in-memory state, prototype); Mastra factory template (no routing/fallback); agent-teams-ai (rate-limit auto-resume and context monitor are good ideas; AGPL); great_cto (spend caps with refuse semantics, "unmeasured ≠ $0"; currently not installable); LoopTroop (council planning, Ralph retries; alpha, unsandboxed).

## How this is used
These repos are a source of **practices to bring into the factory's own steps**. They are not candidates to replace anything. The step-by-step result is in `docs/factory-steps-2026-11-10.md`.

## Proposed design
1. **Supply registry (live, no hardcoding).** Per engine/account: available models (Hattera's `providers/engine-models/*.json`, re-probed when stale), advertised effort levels, capabilities (tools, image input, context size), price class reported by the engine, and quota state. Every entry carries `observedAt` and a TTL; unknown is shown as unknown.
2. **Quota and context ledger.** Read vendor usage where available (Claude/Codex 5-hour and weekly windows), parse typed limit errors from CLI output, track context use per session. Headroom preflight before every dispatch.
3. **Router.** Input = slice requirements (complexity score, needs, budget class). Output = ranked candidates (engine, model, effort) with a reason. Cheapest capable first; escalate on failure; spread parallel slices across engines/accounts; the verifier uses a different engine from the builder.
4. **Fallback rules.**
   - Before progress: rotate to the next candidate.
   - After progress: write a continuation packet (state, diff, next steps) and resume on the next candidate.
   - Context ≥ 70%: compact. At 90%: hand off to a fresh session with the packet.
   - Transient → retry; broken → next; too big → split; repeated → escalate to Lead/user.
5. **Deterministic workflow.** Code owns the stages and gates; agents are bounded nodes. Done = evidence (commit, checks, `evidence.json`), not a claim. Merge lock and integration re-check.
6. **Design role.** A permanent Designer bot owns `DESIGN.md` per project and runs the gstack-style sequence (consultation → plan design review → variants → live design review with screenshots) for every UI slice, before and after build.
7. **Multi-project.** Project registry, per-project rooms/feature rooms, global concurrency cap, budgets per project (warn 80% / pause 100%).
8. **Hattera feature (root fix).** Delegation accepts per-task model + effort; the Chief catalog lists every ready engine. Then the router routes natively through bots instead of shelling out to CLIs.

## Open questions to verify before building
- Claudexor's 5-hour/7-day window representation and its API-key fallback rule (parts of its 674 KB architecture doc were not read).
- Which usage endpoints Hattera already reads (its `usage/*.jsonl` and the usage-visibility PR from Nov 7 are the starting point).
- OpenCode model capability/price metadata (`opencode models --verbose`).
