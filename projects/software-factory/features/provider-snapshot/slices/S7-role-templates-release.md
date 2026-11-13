# Slice S7: Reconcile role text and prepare release/render tests without applying live configuration

Feature software-factory/provider-snapshot; PRD v2.1 (2026-11-12), **V2 APPROVED (reported by Atlas); DISPATCH REQUIRED**. Requirement/acceptance: R7/AC7. Dependency: S6 and S4 verified. No UI surface.

## Goal
Reconcile role text and prepare release/render tests without applying live configuration.

## Project and revision
Repository: C:/Users/shant/SoftwareFactory. Known main baseline: 09d01c56bec990281eb40fa5391caffa2bf7af0a. Atlas must provide the exact approved dependency/integration SHA, isolated worktree path, branch and actual worker thread before dispatch. Record all in evidence.json; do not guess a future SHA or edit another active worktree. Integrator: Atlas. Current state is planning, never ready/running from this document alone.

Read companion ../prd.md v2.1 and ../research.md first, then named source files at the assigned revision. Candidate code commits are optional reusable material only after explicit approved reconciliation; old passes do not satisfy v2.

## Mentor and worker route
Mentor: Atlas (6f38b6d6-27e0-41c8-a654-8cf9e8ba4870), or assigned project Lead. Work kind: **implement**. Requirements profile: complexity low because bounded documentation/verification surface; budget free-first; needs {toolUse:true,imageInput:false,contextTokens:32000}; no browser or long transcript required. Expected duration 25 minutes, hard maximum30; checkpoint and split if exceeded. Worker-first per v2, no fixed model/tier by role. Premium only with documented need plus matching user approval; exhausted Claude route stays excluded.

Before dispatch Atlas supplies routing receipt, authorization/capability/cost evidence, actual recipient-route check and any approved bootstrap manual preflight. Record requested versus provider-acknowledged actual identity/effort separately; default or ledger attribution is not proof. If no accepted route, remain held. Native handoff has no per-task override: mismatched default is a routing blocker, not permission to change bots.

## Expected change surface
- hattera/project/lead.md
- hattera/project/builder.md
- hattera/project/verifier.md
- hattera/agents/lead.md
- hattera/package.json
- CHANGELOG.md
- tools/factory-sync.test.cjs

Only those product paths, plus slice evidence/context/check logs in the assigned external evidence folder. Evidence is not product implementation. No scope expansion without a corrected brief.

## Files and interfaces
Rework seven-file S7 diff from e3a6298..354f880 only; baseline main diff contains S6 and is unsuitable for S7 claims. Replace existing role premium mandates (lead:13/verifier:7) and old OpenCode global preference instructions, not merely append new rules. Lead/Atlas: capture readiness where mounted, snapshot+audit at session start/pre-dispatch; route with project+profile; check recipient exact identity/profile before handoff. Ask uncertain classification/preference using actual current candidates; conservative option defer, no timeout permission. Escalation only requests premium with need; every work kind defaults worker. Native model override unavailable: if recipient default differs from approved choice, report routing blocker; no bot change by worker.

Builder: obey assigned profile/receipt, precheck CLI, report actual provider acknowledgement separately from planned/default selection, stop on mismatch. Verifier: check actual identity with purpose verify and report unknown effort; no inference from configured model or ledger fallback; independent failure checks. Document snapshot/evidence/authorization separation and no unapproved cost fallback in every affected role. Prepare hattera release 1.4.0 and changelog with v2 behavior and trust limitations; preparation is not release. factory-sync test should assert absence of old premium-by-role/fallback text, presence of profile/need/held/actual rules, size <24000 and fixture settings unchanged.

Normative schema/value/exit contracts are the named sections of ../prd.md v2.1. Do not replace absent evidence with invented fields. Reuse Node22.6+ built-ins/CommonJS and existing policy/source readers; no new dependencies.

## Files not to touch
Other active worktrees; unrelated source; project-memory DB; live C:/Users/shant/SoftwareFactory/state/**; C:/Users/shant/.openmausbot/** (read only approved fields); Hattera product code; bot/routine/model settings. No merge/push/release/team-sync application or model execution. Do not change files outside the expected surface.

## Constraints
V2 approval/implementation instruction is recorded from Atlas; only Atlas dispatch with accepted route starts this slice. This internal clarification is not a new permission grant. Preserve owner authorization independently of tier/cost/preference. Unknown stays unknown. No timeout grants premium or spend. No provider inference probes, no secret capture. No screenshot/design stage because there is no UI. Serial ownership for factory-route.cjs/provider-snapshot.cjs/package.json; dependencies cannot be simulated by copying another worker active tree.

## Example patterns
Existing fixture-plan nonmutation check, tools/factory-sync.test.cjs:104-115:

```js
const before = JSON.stringify(bots());
const p = sync.plan('demo');
assert.equal(JSON.stringify(bots()), before, 'plan must not apply settings');
```
Retain this invariant while adding v2 content assertions. This is a fixture, never live sync.

Existing pure test imports, tools/factory-route.test.cjs:1-2:

```js
const {test} = require('node:test');
const assert = require('node:assert/strict');
```
Use strict assertions for actual values/exit paths, not output-substring-only happy paths.

## Acceptance commands
From the assigned isolated worktree after implementation/verification, never during planning:

1. `node --test tools/factory-sync.test.cjs` exits0; record actual pass/fail/skip counts and log pointer.
2. Read-only render lead/builder/verifier with --project hattera --path C:/Users/shant/Videos/opendots-agent/OpenMausBot-main. Exact first marker: <!-- factory:begin role=lead version=1.4.0 --> for lead. All renders contain check with --profile and held/refuse behavior; record UTF-8 bytes <24000. Assert no mandatory premium plan/review rule, no fixed model lists, one 1.4.0 changelog section. Diff exactly seven files vs assigned dependency baseline. Never run sync record/apply or change bots.
3. `node C:/Users/shant/SoftwareFactory/tools/factory-gates.cjs brief C:/Users/shant/SoftwareFactory/projects/software-factory/features/provider-snapshot/slices/S7-role-templates-release.md` exits0.
4. Commit on the assigned branch with a clean product tree. Record diff against exact assigned dependency baseline (not moving main); files must equal claimed surface. Independent verifier runs `node C:/Users/shant/SoftwareFactory/tools/factory-gates.cjs check <worktree> <evidence.json> --run` using the exact builder baseline where appropriate; all artifacts_exist/diff_matches_claims/tests_pass gates pass or the slice stays changes-needed. A verification-only report records unchanged source separately rather than claiming a code diff.

Done-contract: evidence.json using shared/templates/evidence.json, specVersion v2.1, project/feature/slice IDs, full baseline/revision, exact changedFiles/expectedSurface, checks with observed codes/counts/logs, route receipt, actual thread/worktree, source of executed identity or explicit unknown, requested/applied effort, attempt/failure/fallback history, limitations, producedBy and recordedAt. screenshots is empty. Builder cannot self-certify independent acceptance.

## Stuck protocol
Ask the mentor in the owning worker thread with exact failure, attempts, evidence pointer and one bounded question. Mentor supplies guidance, never takes implementation over. Same check failed twice permits asking for escalation, never grants premium. Wrong brief -> request concrete correction. Limit after progress -> save context.md with SHA/checks/diff/remaining steps and next permitted route; no retry of exhausted Claude. Never change owner policy, live data or permissions to get unstuck.

## Context and reporting
Send concise revision, changed paths, observed checks, held decisions, actual identity confidence and next action to Atlas. Store long material in evidence/context files. Rooms carry status/decisions/blockers only. Approval of v1 does not satisfy v2 readiness.
