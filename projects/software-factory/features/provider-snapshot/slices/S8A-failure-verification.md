# Slice S8A: Independently verify denial, unknown and fallback paths at the assembled revision; return failures without implementing fixes

Feature software-factory/provider-snapshot; PRD v2.2 (2026-11-12), **V2 APPROVED (reported by Atlas); DISPATCH REQUIRED**. Requirement/acceptance: R8/AC1–AC7. Dependency: S1A–S7 on exact assembled revision. No UI surface.

## Goal
Independently verify denial, unknown and fallback paths at the assembled revision; return failures without implementing fixes.

## Project and revision
Repository: C:/Users/shant/SoftwareFactory. Known main baseline: 09d01c56bec990281eb40fa5391caffa2bf7af0a. Atlas must provide the exact approved dependency/integration SHA, isolated worktree path, branch and actual worker thread before dispatch. Record all in evidence.json; do not guess a future SHA or edit another active worktree. Integrator: Atlas. Current state is planning, never ready/running from this document alone.

Read companion ../prd.md v2.2 and ../research.md first, then named source files at the assigned revision. Candidate code commits are optional reusable material only after explicit approved reconciliation; old passes do not satisfy v2.

## Mentor and worker route
Mentor: Atlas (6f38b6d6-27e0-41c8-a654-8cf9e8ba4870), or assigned project Lead. Work kind: **routine-verify**. Requirements profile: complexity medium because shared-contract and failure-path risk; budget free-first; needs {toolUse:true,imageInput:false,contextTokens:32000}; no browser or long transcript required. Expected duration 30 minutes, hard maximum30; checkpoint and split if exceeded. Worker-first per v2, no fixed model/tier by role. Premium only with documented need plus matching user approval; exhausted Claude route stays excluded.

Before dispatch Atlas supplies routing receipt, authorization/capability/cost evidence, actual recipient-route check and any approved bootstrap manual preflight. Record requested versus provider-acknowledged actual identity/effort separately; default or ledger attribution is not proof. If no accepted route, remain held. Native handoff has no per-task override: mismatched default is a routing blocker, not permission to change bots.

## Expected change surface
- projects/software-factory/features/provider-snapshot/verify-S8A.md
- projects/software-factory/features/provider-snapshot/artifacts/S8A/

Only those product paths, plus slice evidence/context/check logs in the assigned external evidence folder. Evidence is not product implementation. No scope expansion without a corrected brief.

## Files and interfaces

**v2.2 INTERNAL CLARIFICATION (Atlas, 2026-11-12).** Independently verify PRD v2.2 source-contract fixtures and all nine hashes at exact implementation SHA: capture must be separate from evidence and old snapshots; same-session freshness <=60m; native config/bots rewrite invalidates via stat even if selected safe fields unchanged; raw/substantive hashes do not change on identity-only renewal; stale identity cannot authorize import/snapshot/check. Corrupt/missing sources fail per exact markers; no masked JSON/JSONL errors. Other-project decisions do not affect project hash; evidence observations/binding metadata do. External account switch without native observation cannot be detected: limitation/renewal requirement, not a synthetic passing account verification. Preserve all v2.1 lifecycle/array and independent failure tests. This supersedes conflicting source-authority/current-hash shorthand below; policy, scope and verified S1 stay unchanged. Concrete preimages and invalidation cases: ../artifacts/S2A-source-contract-fixtures.json.


**v2.1 CONTRACT CLARIFICATION (Atlas, 2026-11-12).** Independently exercise v2.1 raw versus resolved projection equality, generic ordered arrays versus explicit set sorting, first capture bootstrap, raw mismatch with no auto-rebind, unchanged refresh, expiry with stable content hash, exact evidence-array subset and duplicates, missing route/generation rejection, target and unrelated retirement lifecycle non-revival. Run ../artifacts/S1A-contract-fixtures.cjs against the exact implemented module and retain logs; fixture pass is not approval or provider evidence. This supersedes any earlier conflicting input/hash shorthand in this brief. See PRD normative clarification for full projections.

No product modifications. Use a detached isolated worktree at Atlas-provided full integration SHA; external temp home/state and evidence directory. Read PRD normative contracts and builder logs, then independently create synthetic data fixtures outside product source using arbitrary opaque identities. Do not rely only on builder assertions. Exercise route/check subprocesses with current invalid/valid snapshots and all supported purposes. Check selected candidates in every fallback, not only first choice. Every route/check refusal preserves authorization and emits correct reason/exit, no model launch. Save sanitized command inputs/stdout/stderr and hashes under artifacts/S8A.

Verify unknown resolution and price holds, catalog addition/retirement/reappearance, comparative answer invalidation, same-content refresh/no spurious prompt, changed same-ID evidence, wrong access mode, hidden premium fallback, active account limit despite ready, expired/scope-mismatched approval, no-profile and legacy advisory bypass, actual-model mismatch/default-only acknowledgement, broken log writes and malformed imports atomicity. Independent fixture setup is verification material only. No tests added to product files here.

Normative schema/value/exit contracts are the named sections of ../prd.md v2.2. Do not replace absent evidence with invented fields. Reuse Node22.6+ built-ins/CommonJS and existing policy/source readers; no new dependencies.

## Files not to touch
Other active worktrees; unrelated source; project-memory DB; live C:/Users/shant/SoftwareFactory/state/**; C:/Users/shant/.openmausbot/** (read only approved fields); Hattera product code; bot/routine/model settings. No merge/push/release/team-sync application or model execution. Do not fix product code; return concrete failures to Atlas.

## Constraints
V2 approval/implementation instruction is recorded from Atlas; only Atlas dispatch with accepted route starts this slice. This internal clarification is not a new permission grant. Preserve owner authorization independently of tier/cost/preference. Unknown stays unknown. No timeout grants premium or spend. No provider inference probes, no secret capture. No screenshot/design stage because there is no UI. Serial ownership for factory-route.cjs/provider-snapshot.cjs/package.json; dependencies cannot be simulated by copying another worker active tree.

## Example patterns
Existing isolated filesystem pattern, tools/factory-route.test.cjs:6-7:

```js
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hh-')), state = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
process.env.FACTORY_HATTERA_HOME = home; process.env.FACTORY_STATE_DIR = state;
```
Set these before requiring factory-route; it reads env at load time. For a pure module test inject inputs rather than reading files. For live read-only S8, set only state and retain the real home.

Existing pure test imports, tools/factory-route.test.cjs:1-2:

```js
const {test} = require('node:test');
const assert = require('node:assert/strict');
```
Use strict assertions for actual values/exit paths, not output-substring-only happy paths.

## Acceptance commands
From the assigned isolated worktree after implementation/verification, never during planning:

1. `node --test tools/provider-snapshot.test.cjs tools/provider-snapshot-cli.test.cjs tools/factory-route.test.cjs tools/opencode-discovery.test.cjs tools/slice-receipt.test.cjs` exits0; record actual pass/fail/skip counts and log pointer.
2. All suite checks exit0, concrete count reported. Fixture subprocess negative commands must produce PRD exits (2/3/5/6/7/8 as applicable); assertion wrapper exits0 only if observed codes/data match. Run factory-gates check for each builder evidence against its actual baseline/revision with --run. Reject source/diff/identity gaps; record unknown engine/effort, do not substitute planned values. A failed scenario returns changes-needed to Atlas and blocks S8.
3. `node C:/Users/shant/SoftwareFactory/tools/factory-gates.cjs brief C:/Users/shant/SoftwareFactory/projects/software-factory/features/provider-snapshot/slices/S8A-failure-verification.md` exits0.
4. Record exact tested SHA and clean product tree; evidence files stay outside the detached worktree. No product commit. Independent verifier runs `node C:/Users/shant/SoftwareFactory/tools/factory-gates.cjs check <worktree> <evidence.json> --run` using the exact builder baseline where appropriate; all artifacts_exist/diff_matches_claims/tests_pass gates pass or the slice stays changes-needed. A verification-only report records unchanged source separately rather than claiming a code diff.

Done-contract: evidence.json using shared/templates/evidence.json, specVersion v2.2, project/feature/slice IDs, full baseline/revision, exact changedFiles/expectedSurface, checks with observed codes/counts/logs, route receipt, actual thread/worktree, source of executed identity or explicit unknown, requested/applied effort, attempt/failure/fallback history, limitations, producedBy and recordedAt. screenshots is empty. Builder cannot self-certify independent acceptance.

## Stuck protocol
Ask the mentor in the owning worker thread with exact failure, attempts, evidence pointer and one bounded question. Mentor supplies guidance, never takes implementation over. Same check failed twice permits asking for escalation, never grants premium. Wrong brief -> request concrete correction. Limit after progress -> save context.md with SHA/checks/diff/remaining steps and next permitted route; no retry of exhausted Claude. Never change owner policy, live data or permissions to get unstuck.

## Context and reporting
Send concise revision, changed paths, observed checks, held decisions, actual identity confidence and next action to Atlas. Store long material in evidence/context files. Rooms carry status/decisions/blockers only. Approval of v1 does not satisfy v2 readiness.
