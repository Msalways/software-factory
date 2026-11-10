# Software Factory review — Hattera trial (2026-11-06 → 11-07)

Sources: Hattera Lead/Builder/Verifier threads in `~/.openmausbot/messages.db`, Lead's `execution-capabilities.md`, Hattera source (`server/runtime.ts`), `~/.openmausbot/config.json`, live team-setup catalog (2026-11-10).

## What worked
- R&D → PRD → slices → isolated worktrees (`hattera/dp01-plan-preview`, `hattera/usage-visibility`) → draft PRs #2/#3.
- Independent checks found real defects (UTF-8 byte cap, stale usage cache, dialog keyboard hook, locale copies).
- OpenCode (`opencode/iceman-free`) did produce working code once it was launched.

## What failed, and the root cause
| Symptom | Root cause |
|---|---|
| You had to repeatedly tell the Lead to use OpenCode | OpenCode was never a *bot*. The team-setup catalog only lists models already chosen on some bot/task/default (`configuredBotModels`, runtime.ts:12664). No OpenCode model had ever been chosen, so `opencodeGo` was invisible to Chiefs, and every Builder/Verifier stayed on Codex. The Lead could only reach OpenCode by shelling out to the CLI. |
| OpenCode runs blocked / "approval timed out" / ACP "Internal service failure" | Shelling out to the CLI needs shell + log-file approvals each time, plus hand-built ACP launchers. A native OpenCode bot would use Hattera's own driver with no ad-hoc approvals. |
| No complexity-based or parallel provider routing | Delegation tools have **no per-task model override**: routing = choosing which bot. With only Codex bots, there was nothing to route between. The standards said "choose dynamically" but gave no rubric and no pool. |
| Builder + Verifier stopped together on "usage limit" | All execution was on one Codex account. No fallback pool on another provider. |
| Rooms stopped after "no activity for 20 minutes" | Slices too large for a single room turn; long CLI runs produced no visible activity. |
| Design looked like "AI slop"; design bot never appeared | Design was done by the Lead (Codex) with image generation. The Design Researcher bot was proposed mid-task; creation needed an in-app card approval while bots were busy, so it never got created. |
| No PR screenshots | Verifier ran in rooms where browser actions were not mounted; the free OpenCode model has no confirmed image input. Nobody owned "capture evidence". |
| Band-aid fix (`PlanUsageWindows.tsx`) | Lead edited directly under release pressure instead of returning to root-cause slice. |
| Lead ended up doing the work itself | When routes failed, the Lead absorbed the implementation instead of fixing routing, and lost the orchestration view. |

## Reference models (from earlier research)
- **Paperclip**: an org chart of agents running *different adapters* (Claude Code, Codex, OpenCode…). Each agent has a role, budget and heartbeat. Work is a ticket assigned to an agent, not a model flag. → Routing = assign to the right bot.
- **Gas Town**: a Mayor coordinates a pool of interchangeable workers ("polecats"). Work is put on a worker's hook and persists until done; batches ("convoys") are tracked as a unit. → Persistent pool + work queue, not ad-hoc spawning.
- **Spec Kit / BMad**: spec → plan → tasks, with role-specific agents (incl. UX designer) and gates. → A dedicated design role *before* implementation.

## Target model — nothing hardcoded
Roles are permanent. **Engines, models and effort are chosen per task from live data.** No document, SOUL or skill names a specific model or assumes something is free.

**Roles:** Lead (plans, routes, integrates; never implements), Builders (implementation), Designer (UX and design system, before and after every UI slice), Verifier (tests, browser evidence, PR screenshots).

**Per-dispatch selection loop:**
1. **Describe the slice as requirements, not a model:** complexity (spec clarity, files, shared-contract risk), needs (tool use, image input, long context), budget class (free-first / balanced / best-quality).
2. **Discover live supply:** ready engines and their current model lists (Hattera refreshes `~/.openmausbot/providers/engine-models/*.json`; re-probe the engine when stale), current price/free status reported by the engine itself, recent usage-limit and failure events (`usage/*.jsonl`, run history).
3. **Rank** candidates that meet the needs: the cheapest one capable enough for the complexity; exclude anything that hit a limit or already failed this slice; prefer a different engine from the verifier's.
4. **Set effort** from complexity, using only the levels that engine advertises: simple → low, cross-cutting/risky → high, repeated failure → escalate one step or switch engine.
5. **Dispatch and record** the choice, reason, and observed price/limit state with a timestamp. **Fall back automatically** to the next-ranked candidate on usage-limit or unavailable errors.
6. Spread parallel slices across engines/accounts so one limit does not stall everything.

**Mechanism gap:** Hattera's delegation tools cannot set a model per task (the receiving bot uses its default), and the Chief catalog only lists models already chosen on some bot (runtime.ts:12664).
- *Short-term:* a `factory-dispatch` tool that runs steps 2–5 and launches the chosen engine CLI with its model and effort inside the slice worktree, pre-allowlisted so it never waits on approvals.
- *Root fix (a Hattera feature):* (a) the Chief catalog lists every ready engine and model; (b) delegation accepts an optional per-task model and effort. The Lead then routes natively through bots and the CLI path becomes unnecessary.

## Open decision
Build the short-term dispatcher now, and/or deliver the root fix as a Hattera feature through the factory.
