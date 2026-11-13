# Slice S8: Verify combined regression, role rendering and read-only live behavior with complete evidence and no live configuration change

Feature software-factory/provider-snapshot; PRD v2.1 (2026-11-12), **V2 APPROVED (reported by Atlas); DISPATCH REQUIRED**. Requirement/acceptance: R8/AC8. Dependency: S8A pass at unchanged assembled SHA. No UI surface.

## Goal
Verify combined regression, role rendering and read-only live behavior with complete evidence and no live configuration change.

## Project and revision
Repository: C:/Users/shant/SoftwareFactory. Known main baseline: 09d01c56bec990281eb40fa5391caffa2bf7af0a. Atlas must provide the exact approved dependency/integration SHA, isolated worktree path, branch and actual worker thread before dispatch. Record all in evidence.json; do not guess a future SHA or edit another active worktree. Integrator: Atlas. Current state is planning, never ready/running from this document alone.

Read companion ../prd.md v2.1 and ../research.md first, then named source files at the assigned revision. Candidate code commits are optional reusable material only after explicit approved reconciliation; old passes do not satisfy v2.

## Mentor and worker route
Mentor: Atlas (6f38b6d6-27e0-41c8-a654-8cf9e8ba4870), or assigned project Lead. Work kind: **routine-verify**. Requirements profile: complexity low because bounded documentation/verification surface; budget free-first; needs {toolUse:true,imageInput:false,contextTokens:32000}; no browser or long transcript required. Expected duration 25 minutes, hard maximum30; checkpoint and split if exceeded. Worker-first per v2, no fixed model/tier by role. Premium only with documented need plus matching user approval; exhausted Claude route stays excluded.

Before dispatch Atlas supplies routing receipt, authorization/capability/cost evidence, actual recipient-route check and any approved bootstrap manual preflight. Record requested versus provider-acknowledged actual identity/effort separately; default or ledger attribution is not proof. If no accepted route, remain held. Native handoff has no per-task override: mismatched default is a routing blocker, not permission to change bots.

## Expected change surface
- projects/software-factory/features/provider-snapshot/verify-S8.md
- projects/software-factory/features/provider-snapshot/artifacts/S8/

Only those product paths, plus slice evidence/context/check logs in the assigned external evidence folder. Evidence is not product implementation. No scope expansion without a corrected brief.

## Files and interfaces
Use exact S8A integration SHA in detached worktree. Product source remains unchanged. Run npm test once and all 12 brief gates; render role text read-only, record bytes/marker and v2 semantics. First hash every existing file plus sorted path membership under C:/Users/shant/SoftwareFactory/state/routing, and read-only Hattera config/bots/catalog/usage inputs; after dry run compare hashes AND paths, report any concurrent change without claiming this task caused it.

Create a new unique temp directory (never recursive delete a computed directory) and set FACTORY_STATE_DIR before loading router module or any CLI call. Leave FACTORY_HATTERA_HOME unset for real read-only input. Copy current authorization/decisions/evidence into temp state only where actually present; never seed old v1 model IDs, invent user answers or widen authorization to get green. Capture Chief live readiness if actually supplied; otherwise mark absent and expect stale-catalog refusals under D2. supply, snapshot, route, check and audit in isolated state may truthfully return held/no route/findings. No model calls/discovery probes or bot/sync actions. Report which contracts are proved by synthetic fixtures versus current live limitations. Never require empty state paths as proof; compare existing tree before/after.

Normative schema/value/exit contracts are the named sections of ../prd.md v2.1. Do not replace absent evidence with invented fields. Reuse Node22.6+ built-ins/CommonJS and existing policy/source readers; no new dependencies.

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

1. `npm test` exits0; record actual pass/fail/skip counts and log pointer.
2. npm test exits0, exact count recorded; all filled brief gates exit0. Roles under24000 bytes and version1.4.0 prepared marker. Isolated live snapshot allowed is subset of current actual allowlist/configured set; unknown tier/price does not create dispatch permission; native unavailable route recorded as blocker, not changed. Audit unknowns preserved. Live before/after hashes and path sets identical or concurrency limitation explicitly reported. No release claim or implementation fix. Overall requires code/fixture checks pass; live unmet readiness/decision prerequisites are rollout blockers, not a fabricated passing execution.
3. `node C:/Users/shant/SoftwareFactory/tools/factory-gates.cjs brief C:/Users/shant/SoftwareFactory/projects/software-factory/features/provider-snapshot/slices/S8-integration-verify.md` exits0.
4. Record exact tested SHA and clean product tree; evidence files stay outside the detached worktree. No product commit. Independent verifier runs `node C:/Users/shant/SoftwareFactory/tools/factory-gates.cjs check <worktree> <evidence.json> --run` using the exact builder baseline where appropriate; all artifacts_exist/diff_matches_claims/tests_pass gates pass or the slice stays changes-needed. A verification-only report records unchanged source separately rather than claiming a code diff.

Done-contract: evidence.json using shared/templates/evidence.json, specVersion v2.1, project/feature/slice IDs, full baseline/revision, exact changedFiles/expectedSurface, checks with observed codes/counts/logs, route receipt, actual thread/worktree, source of executed identity or explicit unknown, requested/applied effort, attempt/failure/fallback history, limitations, producedBy and recordedAt. screenshots is empty. Builder cannot self-certify independent acceptance.

## Stuck protocol
Ask the mentor in the owning worker thread with exact failure, attempts, evidence pointer and one bounded question. Mentor supplies guidance, never takes implementation over. Same check failed twice permits asking for escalation, never grants premium. Wrong brief -> request concrete correction. Limit after progress -> save context.md with SHA/checks/diff/remaining steps and next permitted route; no retry of exhausted Claude. Never change owner policy, live data or permissions to get unstuck.

## Context and reporting
Send concise revision, changed paths, observed checks, held decisions, actual identity confidence and next action to Atlas. Store long material in evidence/context files. Rooms carry status/decisions/blockers only. Approval of v1 does not satisfy v2 readiness.
