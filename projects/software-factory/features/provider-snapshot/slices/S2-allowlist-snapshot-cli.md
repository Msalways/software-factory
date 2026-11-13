# Slice S2: Reconcile old authorization CLI and snapshot assembly with schema 2, source fingerprints and dated evidence imports

Feature software-factory/provider-snapshot; PRD v2.2 (2026-11-12), **V2 APPROVED (reported by Atlas); DISPATCH REQUIRED**. Requirement/acceptance: R2/AC2. Dependency: S2A verified. No UI surface.

## Goal
Reconcile old authorization CLI and snapshot assembly with schema 2, source fingerprints and dated evidence imports.

## Project and revision
Repository: C:/Users/shant/SoftwareFactory. Known main baseline: 09d01c56bec990281eb40fa5391caffa2bf7af0a. Atlas must provide the exact approved dependency/integration SHA, isolated worktree path, branch and actual worker thread before dispatch. Record all in evidence.json; do not guess a future SHA or edit another active worktree. Integrator: Atlas. Current state is planning, never ready/running from this document alone.

Read companion ../prd.md v2.2 and ../research.md first, then named source files at the assigned revision. Candidate code commits are optional reusable material only after explicit approved reconciliation; old passes do not satisfy v2.

## Mentor and worker route
Mentor: Atlas (6f38b6d6-27e0-41c8-a654-8cf9e8ba4870), or assigned project Lead. Work kind: **implement**. Requirements profile: complexity medium because shared-contract and failure-path risk; budget free-first; needs {toolUse:true,imageInput:false,contextTokens:32000}; no browser or long transcript required. Expected duration 25 minutes, hard maximum30; checkpoint and split if exceeded. Worker-first per v2, no fixed model/tier by role. Premium only with documented need plus matching user approval; exhausted Claude route stays excluded.

Before dispatch Atlas supplies routing receipt, authorization/capability/cost evidence, actual recipient-route check and any approved bootstrap manual preflight. Record requested versus provider-acknowledged actual identity/effort separately; default or ledger attribution is not proof. If no accepted route, remain held. Native handoff has no per-task override: mismatched default is a routing blocker, not permission to change bots.

## Expected change surface
- tools/factory-route.cjs
- tools/provider-snapshot-cli.test.cjs

Only those product paths, plus slice evidence/context/check logs in the assigned external evidence folder. Evidence is not product implementation. No scope expansion without a corrected brief.

## Files and interfaces

**v2.2 INTERNAL CLARIFICATION (Atlas, 2026-11-12).** Use the same readCurrentSources helper and exact nine preimages, not a second hash implementation. Read session-bound sanitized route-identities attestation; validate native-only binding independently. Missing/stale/wrong-binding identity holds snapshot exit8 without writing a usable snapshot. Require complete catalog routes, preserve history/tombstones, no truncation to selected options or provider inference. Pass attested routeScopes to unchanged S1; cap injected maxAgeMinutes by capture remaining validity. Store source references/validity for diagnosis and persist only existing owned snapshot/history outputs; never write capture or inspect secrets. This supersedes conflicting source-authority/current-hash shorthand below; policy, scope and verified S1 stay unchanged. Concrete preimages and invalidation cases: ../artifacts/S2A-source-contract-fixtures.json.


**v2.1 CONTRACT CLARIFICATION (Atlas, 2026-11-12).** Read full cached options and explicit provider/route identities separately from lossy supply. Construct the complete retained retirementGenerations map; absent history never becomes fabricated generation0. Fingerprint raw content before loading/applying claims; preserve changed-binding captures as excluded until explicit re-attestation. Save both raw and resolved hashes; preserve every tombstone through history/snapshot writes. Use resolved fingerprints for project preferences and raw for captured evidence only. This supersedes any earlier conflicting input/hash shorthand in this brief. See PRD normative clarification for full projections.

Read PRD Snapshot schema 2 and CLI. Reuse reviewed ef331c7 allowlist/source scaffolding if present in assigned baseline. Keep add/remove/show authorization-only; validate project and key before writes, confirmedBy/user/confirmedAt/source as before. Never assign tier on allowlist add. Preserve requirement for configured selection; do not widen configuredModels to all cached IDs.

takeSnapshot(project,{teamSetupText,teamSetupPath,capturedAt,evidenceFile}) reads only allowed source fields (no credentials), uses existing supply with correct isolated STATE, resolves saved evidence and project decisions, writes schema-2 file atomically. --team-setup supports file or stdin; optional --captured-at must be valid nonfuture, otherwise use file mtime (stdin observed time); report capture trust limit. --evidence imports via S2A validator before assemble. Source fingerprints use normalized nonsecret config/bots selections and catalog/evidence/decision/limit/preference content, not full secret-bearing config. Retirements are persisted as decision invalidations/tombstones, without changing authorization. loadSnapshot/project snapshotPath keep safe IDs. Snapshot creation exits 0 even if models have held decisions, with structured questions; invalid inputs exit 2. No model or network call.

Normative schema/value/exit contracts are the named sections of ../prd.md v2.2. Do not replace absent evidence with invented fields. Reuse Node22.6+ built-ins/CommonJS and existing policy/source readers; no new dependencies.

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

1. `node --test tools/provider-snapshot-cli.test.cjs tools/provider-snapshot.test.cjs` exits0; record actual pass/fail/skip counts and log pointer.
2. Test temp-home allowlist metadata/removal/missing configured warning, snapshot file contract, no allowlist -> all authorization refused, unknown tiers -> structured held questions, bad capture/expired capture/no capture stale catalog, stdin, invalid time, invalid evidence atomic rejection. Same catalog content refresh does not invalidate; substantive change does. Literal policy/evidence data never treated as shell instructions.
3. `node C:/Users/shant/SoftwareFactory/tools/factory-gates.cjs brief C:/Users/shant/SoftwareFactory/projects/software-factory/features/provider-snapshot/slices/S2-allowlist-snapshot-cli.md` exits0.
4. Commit on the assigned branch with a clean product tree. Record diff against exact assigned dependency baseline (not moving main); files must equal claimed surface. Independent verifier runs `node C:/Users/shant/SoftwareFactory/tools/factory-gates.cjs check <worktree> <evidence.json> --run` using the exact builder baseline where appropriate; all artifacts_exist/diff_matches_claims/tests_pass gates pass or the slice stays changes-needed. A verification-only report records unchanged source separately rather than claiming a code diff.

Done-contract: evidence.json using shared/templates/evidence.json, specVersion v2.2, project/feature/slice IDs, full baseline/revision, exact changedFiles/expectedSurface, checks with observed codes/counts/logs, route receipt, actual thread/worktree, source of executed identity or explicit unknown, requested/applied effort, attempt/failure/fallback history, limitations, producedBy and recordedAt. screenshots is empty. Builder cannot self-certify independent acceptance.

## Stuck protocol
Ask the mentor in the owning worker thread with exact failure, attempts, evidence pointer and one bounded question. Mentor supplies guidance, never takes implementation over. Same check failed twice permits asking for escalation, never grants premium. Wrong brief -> request concrete correction. Limit after progress -> save context.md with SHA/checks/diff/remaining steps and next permitted route; no retry of exhausted Claude. Never change owner policy, live data or permissions to get unstuck.

## Context and reporting
Send concise revision, changed paths, observed checks, held decisions, actual identity confidence and next action to Atlas. Store long material in evidence/context files. Rooms carry status/decisions/blockers only. Approval of v1 does not satisfy v2 readiness.
