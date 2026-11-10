# Software Factory — improved steps (2026-11-10)

This document improves the factory's **process**. Hattera stays as the platform. Each step builds on what the current standards already say (`shared/standards/*`). It then adds a practice taken from the public repos reviewed in `research/software-factory-rd-2026-11-10.md`. Every step names its source repo and the 2026-11-06 trial failure it fixes.

Nothing names a specific model or assumes a model is free. Engines, models and effort are chosen per task from live data.

## Pipeline at a glance
```
0 Intake → 1 Understand → 2 R&D → 3 Design → 4 Slice → 5 Route → 6 Execute
   → 7 Limits & fallback → 8 Verify → 9 Integrate → 10 Release → 11 Learn
```
Each arrow is a **gate**. A gate fails by default and passes only on evidence. The Lead never moves work forward on an agent's word alone.

---

## 0. Intake and project registry
- **Do:** register every request against a project in a registry that records the path, default branch, test commands, design system location and owner. Give each project a budget class (free-first / balanced / best-quality) and a share of the global concurrency cap.
- **Gate:** the project is registered, and the request has an outcome plus acceptance criteria.
- **From:** Fusion (`project add`, global concurrency cap), Paperclip (per-project budgets).
- **Fixes:** the trial had no multi-project view, so one project could take every worker.

## 1. Understand the current project
- **Do:** keep the existing `project-understanding.md` practice: revision, local changes, existing capabilities. Also write a **capability snapshot** listing which tools are actually mounted (browser, screenshots, VM) and which engines are actually ready.
- **Gate:** the capability snapshot is no older than the session.
- **From:** the trial's own `execution-capabilities.md`, generalised.
- **Fixes:** the Verifier was sent work that needed browser tools it did not have.

## 2. R&D and decisions
- **Do:** keep the current question → evidence → decision practice. A decision blocked on the user becomes a **held decision**: it records a default and a deadline. If the user has not answered by the deadline, work continues on the default, and it is recorded as an assumption.
- **Gate:** no slice depends on an unresolved decision that would change it.
- **From:** outsourcerer (held decisions with a default and a deadline; idea only, because of its licence).
- **Fixes:** stalls while waiting on approvals.

## 3. Design (new dedicated step and role)
Required for any slice with a user-facing surface. A permanent **Designer** role owns this step. The Lead does not do design.
1. **Design system:** each project has a `DESIGN.md` covering tokens, components, tone, and a "don't" list. Create it on first UI work and update it afterwards.
2. **Plan design review:** score the PRD and slice specs 0–10 on hierarchy, states (loading, empty, error, permission, recovery), consistency with `DESIGN.md`, accessibility, and generic-AI patterns. Below the threshold, send it back.
3. **Variants (new surfaces only):** produce 3–5 directions and pick one with reasons. Ordinary fixes reuse existing patterns and skip this.
4. **Live design review after build:** capture screenshots at the agreed viewports, compare them with the design, and record fixes as their own commits. The before/after screenshots go into the PR.
- **Gate:** before build, the plan review passes. After build, the screenshots exist and the review passes.
- **From:** gstack (`design-consultation` → `plan-design-review` → `design-shotgun` → `design-review`).
- **Fixes:** the design looked like "AI slop", the design bot was never created, and PRs had no screenshots.

## 4. Slice with a done-contract
- **Do:** keep the current slice rules (vertical, testable, dependency edges). Each slice spec adds:
  - **Requirements profile, not a model:** complexity (spec clarity, files touched, shared-contract risk), needs (tool use, image input, long context), size estimate.
  - **Done-contract:** the exact commands that must pass, the files expected to change, and the artifacts required (`evidence.json`, screenshots for UI).
  - **Size cap:** a slice must fit within one session's context and one quota window. Split it if not.
- **Gate:** every slice has a profile, a done-contract and dependencies. The integration slice is planned.
- **From:** outsourcerer (done-contract and `evidence.json`), Bernstein (role and tier labels), Super Simple Software Factory (envelope handoff).
- **Fixes:** room timeouts on oversized slices, and "done" claims that had no evidence behind them.

## 5. Route: live supply → choose engine, model and effort
Run this for every dispatch. Do not use a fixed mapping.
1. **Discover supply:** ready engines, their current model lists (re-probe when stale), effort levels each one advertises, image input, context size, price or free status as reported now, and quota headroom (step 7). Every value carries `observedAt`. Unknown stays unknown and is never shown as $0.
2. **Filter** to candidates that meet the slice's needs and have headroom.
3. **Rank cheapest-capable first** for the complexity. Choose effort only from that engine's advertised levels.
4. **Spread:** parallel slices go to different engines or accounts where possible. The **verifier runs on a different engine from the builder**.
5. **Record** a routing receipt: the candidates, the choice, the reason, the requested effort vs the effort actually applied, and the supply snapshot time.
- **Gate:** a routing receipt exists, and the chosen route was confirmed by the engine (it actually started), not just found in a catalog.
- **From:** Bernstein (cascade router, abstract tiers), Claudexor (headroom preflight, `EffortResolution`, unknown ≠ $0), Fusion (per-task → project → global precedence), Gas City (provider resolution chain).
- **Fixes:** the Lead had to be told to use OpenCode, and there was no complexity-based or parallel provider choice.

## 6. Execute in isolation
- **Do:** give each slice its own worktree, branch and fresh session, with a self-contained brief (envelope: spec, baseline, allowed scope, done-contract). Use an **atomic claim with a lease**, so no slice runs twice. Workers send **heartbeats** (checkpoint, files changed, last command). A missed heartbeat means the slice is *stale*, not running.
- Long commands stream visible progress so rooms do not time out.
- **The Lead never implements.** If no route works, the Lead fixes the routing or escalates. It does not take over the work.
- **Gate:** the slice moves to *running* only after the execution identity (thread or session ID, engine, model) has been accepted.
- **From:** LoopX (leases with TTL and compare-and-swap), Paperclip (heartbeats, atomic checkout), Fusion and Gas Town (worktree per task).
- **Fixes:** the 20-minute room timeouts, and the Lead absorbing the work.

## 7. Limits and fallback (session, quota, context)
**Before dispatch (preflight):** check the quota ledger. It covers each account's 5-hour and weekly windows from vendor usage reads (short TTL, about 5 minutes) and recent limit events. Skip any candidate below the headroom threshold.

**During the run:**
- **Context budget:** at 70% used, compact. At 90%, write a **continuation packet** (`context.md`: goal, verified progress, diff summary, next steps, open risks) and continue in a fresh session.
- **Limit detection:** recognise typed signals and the known CLI phrases ("usage limit", "5-hour limit", 429/5xx). Treat them as signals, not as agent text.

**On failure, classify it, then act:**
| Class | Signal | Action |
|---|---|---|
| Transient | timeout, 5xx, one 429 | retry same route with backoff |
| Limit | quota or window exhausted | **before progress:** rotate to the next ranked candidate with a fresh start. **After progress:** pass the continuation packet to the next candidate. |
| Broken route | engine or model errors or bad output | mark the route bad for this slice, then use the next candidate |
| Too big | context overflow, room timeout | split the slice (back to step 4) |
| Repeated | same failure twice | escalate effort one step or change engine. A third time goes to the Lead, then the user. |

- **Gate:** every fallback is recorded in the slice history, and no slice silently restarts from zero.
- **From:** Claudexor (ledger, preflight, rotate before or after progress), opencode-swarm (70/90 context budget, handoff `context.md`, fallback list), outsourcerer (failure taxonomy), agent-yes (limit-phrase detection), LoopX (`should-run` / `spend-slot`).
- **Fixes:** the Builder and Verifier both stopped on one Codex usage limit, and the room stopped.

## 8. Verify independently
- **Do:** a separate Verifier on a different engine checks the done-contract against the **tested revision**. It runs the commands, checks that the diff matches the claims, exercises the primary journey and one failure or recovery path, and captures UI screenshots. A **janitor check** confirms concrete signals: the commit exists, the tree is clean, the checks pass, and the evidence files exist.
- **Gate:** `artifacts_exist`, `diff_matches_claims` and `tests_pass` are all true. Any later code change invalidates the result.
- **From:** Super Simple Software Factory (default-fail gates), Bernstein (janitor), outsourcerer ("finished is a claim").
- **Fixes:** the missing PR evidence, and the band-aid fix that skipped the root-cause slice.

## 9. Integrate
- **Do:** run a merge queue with a merge lock. Merge one slice at a time into the integration worktree and re-run the combined checks after each merge. If a conflict touches a shared contract, return it to the slice owner. Never hand-patch it at integration.
- **Gate:** combined acceptance passes on the integration revision.
- **From:** Gas Town (Refinery merge queue), outsourcerer (merge lock plus recheck).

## 10. Release readiness
Keep the current `design-and-e2e.md` rules: build/config requirements, migrations, smoke checks, rollback. The PR body includes the routing receipts, verification evidence, screenshots, and what remains untested.

## 11. Learn and remember
- **Do:** record each slice's route, its outcome, any fallbacks, and the actual cost/usage observed. Store them in factory-memory as durable work items. Over time this gives evidence for which kind of route succeeds at which complexity. The data is advisory only; live supply still decides.
- **Budgets:** warn at 80% of a project's budget and pause new dispatch for that project at 100%.
- **From:** Gas City (beads, i.e. durable work items), Paperclip (budget warn/pause), the existing `tools/factory-memory.cjs`.

---

## Roles after these changes
| Role | Owns | Never |
|---|---|---|
| Lead | intake, slicing, routing receipts, fallback decisions, integration | implements, designs, self-verifies |
| Designer | `DESIGN.md`, plan design review, variants, live design review | merges code |
| Builders (any engine) | one slice per session, done-contract evidence | certify the integrated feature |
| Verifier (different engine) | independent gates, screenshots, combined checks | fixes what it verifies |

## What needs a tool, not just a document
Steps 5 and 7 need small deterministic tools. A document cannot enforce them:
1. **Supply probe:** reads Hattera's engine catalogs, re-probes stale entries, and writes the supply snapshot.
2. **Quota ledger and preflight:** reads `usage/*.jsonl` and vendor usage, and detects limit signals.
3. **Router:** takes a slice profile plus the supply snapshot and returns ranked candidates with a receipt.
4. **Gate checker / janitor:** verifies the done-contract signals.

The Hattera improvement is still needed so routing can work natively through bots: the Chief catalog should list every ready engine, and delegation should accept a per-task model and effort.

## Suggested order of adoption
1. **Process only (no code):** steps 3, 4, 8 and 9. Add the Designer role and `DESIGN.md`, done-contracts, default-fail gates and the merge lock to the standards and templates.
2. **Small tools:** the gate checker, then the supply probe with the router, then the quota ledger with fallback.
3. **Hattera feature:** a per-task model and effort in delegation, and a full engine catalog for Chiefs.
