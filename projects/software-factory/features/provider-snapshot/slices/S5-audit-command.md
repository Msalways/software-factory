# Slice S5: Audit authorization and premium use without promoting current guesses to historical facts

Feature software-factory/provider-snapshot; PRD v2.1 (2026-11-12), **V2 APPROVED (reported by Atlas); DISPATCH REQUIRED**. Requirement/acceptance: R5/AC5. Dependency: S4 verified. No UI surface.

## Goal
Audit authorization and premium use without promoting current guesses to historical facts.

## Project and revision
Repository: C:/Users/shant/SoftwareFactory. Known main baseline: 09d01c56bec990281eb40fa5391caffa2bf7af0a. Atlas must provide the exact approved dependency/integration SHA, isolated worktree path, branch and actual worker thread before dispatch. Record all in evidence.json; do not guess a future SHA or edit another active worktree. Integrator: Atlas. Current state is planning, never ready/running from this document alone.

Read companion ../prd.md v2.1 and ../research.md first, then named source files at the assigned revision. Candidate code commits are optional reusable material only after explicit approved reconciliation; old passes do not satisfy v2.

## Mentor and worker route
Mentor: Atlas (6f38b6d6-27e0-41c8-a654-8cf9e8ba4870), or assigned project Lead. Work kind: **implement**. Requirements profile: complexity medium because shared-contract and failure-path risk; budget free-first; needs {toolUse:true,imageInput:false,contextTokens:32000}; no browser or long transcript required. Expected duration 30 minutes, hard maximum30; checkpoint and split if exceeded. Worker-first per v2, no fixed model/tier by role. Premium only with documented need plus matching user approval; exhausted Claude route stays excluded.

Before dispatch Atlas supplies routing receipt, authorization/capability/cost evidence, actual recipient-route check and any approved bootstrap manual preflight. Record requested versus provider-acknowledged actual identity/effort separately; default or ledger attribution is not proof. If no accepted route, remain held. Native handoff has no per-task override: mismatched default is a routing blocker, not permission to change bots.

## Expected change surface
- tools/factory-route.cjs
- tools/provider-snapshot-cli.test.cjs

Only those product paths, plus slice evidence/context/check logs in the assigned external evidence folder. Evidence is not product implementation. No scope expansion without a corrected brief.

## Files and interfaces
Implement PRD audit p --section name [--since ISO] --json. Read section bot IDs via bots.json section; ledger may contain removed bots: mark attribution unknown and count separately rather than silently omit. Use last-two-file ledger scope from existing helper, report covered dates and missing earlier history. Emit saved audits/p-timestamp.json with schema:2, project, observedAt, coveredRange, filters, rows/groups and separate authorizationAtRun/currentPolicyComparison/tierAtRun/costSources totals.

Only explicit session/receipt links to contemporaneous snapshots establish at-run authorization/tier; current snapshot readiness is irrelevant to history. Missing historical proof -> unknown, not unauthorized by inference. Known-exception match records its reason separately and never grants dispatch or clears unknown proof. Cost and tokens aggregate only measured data: reported versus estimated versus unreported cost separated; tokensReported:false excluded from measured-share denominator. Unknown tier/actual identity excluded from premium share with explicit coverage. Group premium usage only where historic tier proof exists; do not assert a numerical cap or retroactively classify based on new catalog. Exit 7 for unknown/refused/mismatch findings, 0 clean, 2 invalid input. Audit writes only isolated state in tests.

Normative schema/value/exit contracts are the named sections of ../prd.md v2.1. Do not replace absent evidence with invented fields. Reuse Node22.6+ built-ins/CommonJS and existing policy/source readers; no new dependencies.

## Files not to touch
Other active worktrees; unrelated source; project-memory DB; live C:/Users/shant/SoftwareFactory/state/**; C:/Users/shant/.openmausbot/** (read only approved fields); Hattera product code; bot/routine/model settings. No merge/push/release/team-sync application or model execution. Do not change files outside the expected surface.

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

1. `node --test tools/provider-snapshot-cli.test.cjs` exits0; record actual pass/fail/skip counts and log pointer.
2. Fixture ledger includes contemporaneously allowed and unauthorized runs, no historical snapshot, stale current catalog, changed tier since run, removed bot, known exception with no proof, unknown actual execution, reported/estimated/null cost and tokensReported false. Assert exact separate counts/totals and exit 7; clean fully evidenced fixture exits 0; malformed since exits 2. No policy mutation to clear findings.
3. `node C:/Users/shant/SoftwareFactory/tools/factory-gates.cjs brief C:/Users/shant/SoftwareFactory/projects/software-factory/features/provider-snapshot/slices/S5-audit-command.md` exits0.
4. Commit on the assigned branch with a clean product tree. Record diff against exact assigned dependency baseline (not moving main); files must equal claimed surface. Independent verifier runs `node C:/Users/shant/SoftwareFactory/tools/factory-gates.cjs check <worktree> <evidence.json> --run` using the exact builder baseline where appropriate; all artifacts_exist/diff_matches_claims/tests_pass gates pass or the slice stays changes-needed. A verification-only report records unchanged source separately rather than claiming a code diff.

Done-contract: evidence.json using shared/templates/evidence.json, specVersion v2.1, project/feature/slice IDs, full baseline/revision, exact changedFiles/expectedSurface, checks with observed codes/counts/logs, route receipt, actual thread/worktree, source of executed identity or explicit unknown, requested/applied effort, attempt/failure/fallback history, limitations, producedBy and recordedAt. screenshots is empty. Builder cannot self-certify independent acceptance.

## Stuck protocol
Ask the mentor in the owning worker thread with exact failure, attempts, evidence pointer and one bounded question. Mentor supplies guidance, never takes implementation over. Same check failed twice permits asking for escalation, never grants premium. Wrong brief -> request concrete correction. Limit after progress -> save context.md with SHA/checks/diff/remaining steps and next permitted route; no retry of exhausted Claude. Never change owner policy, live data or permissions to get unstuck.

## Context and reporting
Send concise revision, changed paths, observed checks, held decisions, actual identity confidence and next action to Atlas. Store long material in evidence/context files. Rooms carry status/decisions/blockers only. Approval of v1 does not satisfy v2 readiness.
