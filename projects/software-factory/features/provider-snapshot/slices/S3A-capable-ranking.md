# Slice S3A: Rank only task-qualified candidates by comparable cost, without role-based premium or empty-tier promotion

Feature software-factory/provider-snapshot; PRD v2.1 (2026-11-12), **V2 APPROVED (reported by Atlas); DISPATCH REQUIRED**. Requirement/acceptance: R3/AC3. Dependency: S2 verified. No UI surface.

## Goal
Rank only task-qualified candidates by comparable cost, without role-based premium or empty-tier promotion.

## Project and revision
Repository: C:/Users/shant/SoftwareFactory. Known main baseline: 09d01c56bec990281eb40fa5391caffa2bf7af0a. Atlas must provide the exact approved dependency/integration SHA, isolated worktree path, branch and actual worker thread before dispatch. Record all in evidence.json; do not guess a future SHA or edit another active worktree. Integrator: Atlas. Current state is planning, never ready/running from this document alone.

Read companion ../prd.md v2.1 and ../research.md first, then named source files at the assigned revision. Candidate code commits are optional reusable material only after explicit approved reconciliation; old passes do not satisfy v2.

## Mentor and worker route
Mentor: Atlas (6f38b6d6-27e0-41c8-a654-8cf9e8ba4870), or assigned project Lead. Work kind: **implement**. Requirements profile: complexity medium because shared-contract and failure-path risk; budget free-first; needs {toolUse:true,imageInput:false,contextTokens:32000}; no browser or long transcript required. Expected duration 30 minutes, hard maximum30; checkpoint and split if exceeded. Worker-first per v2, no fixed model/tier by role. Premium only with documented need plus matching user approval; exhausted Claude route stays excluded.

Before dispatch Atlas supplies routing receipt, authorization/capability/cost evidence, actual recipient-route check and any approved bootstrap manual preflight. Record requested versus provider-acknowledged actual identity/effort separately; default or ledger attribution is not proof. If no accepted route, remain held. Native handoff has no per-task override: mismatched default is a routing blocker, not permission to change bots.

## Expected change surface
- tools/factory-route.cjs
- tools/factory-route.test.cjs

Only those product paths, plus slice evidence/context/check logs in the assigned external evidence folder. Evidence is not product implementation. No scope expansion without a corrected brief.

## Files and interfaces

**v2.1 CONTRACT CLARIFICATION (Atlas, 2026-11-12).** Use resolved catalogFingerprint for comparative/preference validity, modelFingerprint plus target generation for model answers. rawCatalogFingerprint is capture identity only and never authorizes a route or comparative ordering. Retained unrelated tombstones prevent old comparative answers reviving after disappearance/reappearance. A model answer may still match while its provider claim has stale raw binding: evaluate those checks separately. This supersedes any earlier conflicting input/hash shorthand in this brief. See PRD normative clarification for full projections.

Read PRD Task profile and premium policy. For opts.project, enumerate snapshot.allowed instead of the default/usage/policy-only pool; run shared evaluateTask first. Route(profile,opts) retains advisory legacy behavior without project, labels dispatchAuthorized:false, and does not change those callers to new authorization semantics. Project profile requires slice,workKind,complexity,budget,needs; unknown hard metadata holds and no model ID/label/effort rules assign tier. Existing outcome min/success thresholds are the hard capability history, not the price proof.

Cost comparison uses matching scope/basis/unit/currency/context/service vectors only; dominance first, complete estimated-token cost if profile provides counts, otherwise valid project comparative ordering. Missing components are unknown, not zero. If a unique winner or equal-cost tied group cannot be determined, receipt has no choice and needsUserChoice with held reason. Retain relevant candidates held only for tier/price/preference in the comparison; do not drop them to falsely choose a cost-known dearer route. Assert unknown alongside otherwise qualified known worker causes held unless evidence rules it out. Known workers are evaluated before premium. Premium requires shared need/permission guard even with --budget best-quality or a plan/review work kind. Existing reliability/latency/avoid scoring breaks equal-cost ties only; key is final tie-break. Remove project-mode inTier-empty fallback at existing lines 304–320. Preserve rejected candidates and cost source/calculation in receipt. Do not add CLI project preflight here (S3).

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

1. `node --test tools/factory-route.test.cjs tools/provider-snapshot.test.cjs` exits0; record actual pass/fail/skip counts and log pointer.
2. Add independent arbitrary-ID fixtures: cheaper capable worker wins despite premium role and balanced weights; expensive worker loses on cost; cheaper incapable route excluded; unknown image/context held; crossing price vectors held; complete estimates resolve crossing rates; incomplete estimate and unlike billing basis held; project user order resolves unknown price without claiming dollar cost; no worker/limit/two failures/best-quality never auto-premium; valid exact approval can permit justified premium; legacy no-project receipt advisory.
3. `node C:/Users/shant/SoftwareFactory/tools/factory-gates.cjs brief C:/Users/shant/SoftwareFactory/projects/software-factory/features/provider-snapshot/slices/S3A-capable-ranking.md` exits0.
4. Commit on the assigned branch with a clean product tree. Record diff against exact assigned dependency baseline (not moving main); files must equal claimed surface. Independent verifier runs `node C:/Users/shant/SoftwareFactory/tools/factory-gates.cjs check <worktree> <evidence.json> --run` using the exact builder baseline where appropriate; all artifacts_exist/diff_matches_claims/tests_pass gates pass or the slice stays changes-needed. A verification-only report records unchanged source separately rather than claiming a code diff.

Done-contract: evidence.json using shared/templates/evidence.json, specVersion v2.1, project/feature/slice IDs, full baseline/revision, exact changedFiles/expectedSurface, checks with observed codes/counts/logs, route receipt, actual thread/worktree, source of executed identity or explicit unknown, requested/applied effort, attempt/failure/fallback history, limitations, producedBy and recordedAt. screenshots is empty. Builder cannot self-certify independent acceptance.

## Stuck protocol
Ask the mentor in the owning worker thread with exact failure, attempts, evidence pointer and one bounded question. Mentor supplies guidance, never takes implementation over. Same check failed twice permits asking for escalation, never grants premium. Wrong brief -> request concrete correction. Limit after progress -> save context.md with SHA/checks/diff/remaining steps and next permitted route; no retry of exhausted Claude. Never change owner policy, live data or permissions to get unstuck.

## Context and reporting
Send concise revision, changed paths, observed checks, held decisions, actual identity confidence and next action to Atlas. Store long material in evidence/context files. Rooms carry status/decisions/blockers only. Approval of v1 does not satisfy v2 readiness.
