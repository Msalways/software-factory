# Slice S2A: Add evidence-import and model-record CLI commands with atomic validation and project-scoped answers, without changing authorization

Feature software-factory/provider-snapshot; PRD v2.2 (2026-11-12), **V2 APPROVED (reported by Atlas); DISPATCH REQUIRED**. Requirement/acceptance: R2/AC2. Dependency: S1 verified. No UI surface.

## Goal
Add evidence-import and model-record CLI commands with atomic validation and project-scoped answers, without changing authorization.

## Project and revision
Repository: C:/Users/shant/SoftwareFactory. Known main baseline: 09d01c56bec990281eb40fa5391caffa2bf7af0a. S2A supplied dependency baseline inspected as Git object: 29cd874b812c70c870d6a04ccab7e693ee2ae634; do not confuse it with main. Atlas must provide the exact approved dependency/integration SHA, isolated worktree path, branch and actual worker thread before dispatch. Record all in evidence.json; do not guess a future SHA or edit another active worktree. Integrator: Atlas. Current state is planning, never ready/running from this document alone.

Read companion ../prd.md v2.2 and ../research.md first, then named source files at the assigned revision. Candidate code commits are optional reusable material only after explicit approved reconciliation; old passes do not satisfy v2.

## Mentor and worker route
Mentor: Atlas (6f38b6d6-27e0-41c8-a654-8cf9e8ba4870), or assigned project Lead. Work kind: **implement**. Requirements profile: complexity medium because shared-contract and failure-path risk; budget free-first; needs {toolUse:true,imageInput:false,contextTokens:32000}; no browser or long transcript required. Expected duration 25 minutes, hard maximum30; checkpoint and split if exceeded. Worker-first per v2, no fixed model/tier by role. Premium only with documented need plus matching user approval; exhausted Claude route stays excluded.

Before dispatch Atlas supplies routing receipt, authorization/capability/cost evidence, actual recipient-route check and any approved bootstrap manual preflight. Record requested versus provider-acknowledged actual identity/effort separately; default or ledger attribution is not proof. If no accepted route, remain held. Native handoff has no per-task override: mismatched default is a routing blocker, not permission to change bots.

## Expected change surface
- tools/factory-route.cjs
- tools/provider-snapshot-cli.test.cjs
- package.json

Only those product paths, plus slice evidence/context/check logs in the assigned external evidence folder. Evidence is not product implementation. No scope expansion without a corrected brief.

## Files and interfaces

**v2.2 INTERNAL CLARIFICATION (Atlas, 2026-11-12).** Use PRD v2.2 exact readCurrentSources helper and nine JSON preimages. Import reads (never creates) independent STATE/route-identities.json, verifies externally supplied session ID and native-only config/bots/catalog binding, then validates evidence against routes from that attestation, not evidence or old snapshots. Complete target-engine raw option route coverage is required, even for unselected options; this grants no authorization. Evidence captures bind v2.1 raw hash; user answers bind resolved/model+generation hashes. Invalid identity preflight exits2/no writes. Strict corrupt/missing handling follows PRD; no readJson fallback. Recompute shared source map after atomic owned import. Add source-contract fixture expectations to CLI tests when implementing; do not edit verified S1. This supersedes conflicting source-authority/current-hash shorthand below; policy, scope and verified S1 stay unchanged. Concrete preimages and invalidation cases: ../artifacts/S2A-source-contract-fixtures.json.


**v2.1 CONTRACT CLARIFICATION (Atlas, 2026-11-12).** At import unwrap the persisted envelope once. Compute v2.1 rawProjection using fingerprint(rawProjection) before evidence exists. Evidence.catalogFingerprint binds rawCatalogFingerprint, never resolved hash. Reject mismatches without rewriting/rebinding; explicit fresh capture or re-attestation is required. Record/compare model-scoped answers against modelFingerprint plus target generation; catalog/comparative/OpenCode answers against resolved catalogFingerprint with complete retained generation map. Reject duplicate evidence (key,field,sourceRef) in an import; merge matching identities with previously saved records only at the existing import boundary. This supersedes any earlier conflicting input/hash shorthand in this brief. See PRD normative clarification for full projections.

Read PRD CLI, Evidence envelope, and Fingerprints and user overrides. evidence-import --file file validates schema 1 and every record before writes; merge key is (key,field,sourceRef), conflicts retained. model-record project --file file validates schema 1 envelope kinds model-decision|premium-approval|opencode-preference. Require actual user confirmation metadata/sourceRef and current fingerprints, not a guessed default. Validate object shapes, ISO times, source strings, finite values, exact key membership and project boundaries. Premium approval keys must already be authorized; evidence/decisions never add allowlist entries. Store decisions in raw.projects[p] only. Import never updates engine config or bots.

Use fs write-temp/rename to preserve old policy/evidence on any validation failure; no shell-built model command. Export small callable helpers if tests need them. Preserve unrelated policy fields. Record retired/reappeared state in project decision metadata when supplied by snapshot/import rather than reviving an old answer. Old global tiers/preferences may be displayed as legacy but do not satisfy schema-2 decisions. Add CLI test file once to npm test. No snapshot assembly or route ranking in this slice.

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

1. `node --test tools/provider-snapshot-cli.test.cjs` exits0; record actual pass/fail/skip counts and log pointer.
2. Spawn temp-home CLI: valid evidence import and every record kind round-trip; malformed JSON, future timestamp, unsupported kind, stale fingerprint, missing user reference, prototype/traversal IDs all exit 2 and preserve bytes. Two projects keep distinct answers. Tier/price/approval record cannot enlarge either allowlist or configured models. Retired/reappearing metadata invalidates old record; replacement preserves unrelated records. No filesystem outputs outside isolated state.
3. `node C:/Users/shant/SoftwareFactory/tools/factory-gates.cjs brief C:/Users/shant/SoftwareFactory/projects/software-factory/features/provider-snapshot/slices/S2A-evidence-cli.md` exits0.
4. Commit on the assigned branch with a clean product tree. Record diff against exact assigned dependency baseline (not moving main); files must equal claimed surface. Independent verifier runs `node C:/Users/shant/SoftwareFactory/tools/factory-gates.cjs check <worktree> <evidence.json> --run` using the exact builder baseline where appropriate; all artifacts_exist/diff_matches_claims/tests_pass gates pass or the slice stays changes-needed. A verification-only report records unchanged source separately rather than claiming a code diff.

Done-contract: evidence.json using shared/templates/evidence.json, specVersion v2.2, project/feature/slice IDs, full baseline/revision, exact changedFiles/expectedSurface, checks with observed codes/counts/logs, route receipt, actual thread/worktree, source of executed identity or explicit unknown, requested/applied effort, attempt/failure/fallback history, limitations, producedBy and recordedAt. screenshots is empty. Builder cannot self-certify independent acceptance.

## Stuck protocol
Ask the mentor in the owning worker thread with exact failure, attempts, evidence pointer and one bounded question. Mentor supplies guidance, never takes implementation over. Same check failed twice permits asking for escalation, never grants premium. Wrong brief -> request concrete correction. Limit after progress -> save context.md with SHA/checks/diff/remaining steps and next permitted route; no retry of exhausted Claude. Never change owner policy, live data or permissions to get unstuck.

## Context and reporting
Send concise revision, changed paths, observed checks, held decisions, actual identity confidence and next action to Atlas. Store long material in evidence/context files. Rooms carry status/decisions/blockers only. Approval of v1 does not satisfy v2 readiness.
