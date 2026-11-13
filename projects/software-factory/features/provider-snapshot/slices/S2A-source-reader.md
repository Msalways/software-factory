# S2A-source: independently current source reader
Project software-factory; feature provider-snapshot; parent S2A; PRD v2.2. Atlas size split of approved work, 2026-11-12. R2/AC2. No UI.

## Goal
Implement and test readCurrentSources only. It must supply independently current nonsecret inputs and all nine fingerprints. Parent CLI wiring is deferred to S2A-commands after independent verification.

## Project and revision
Repository C:/Users/shant/SoftwareFactory. Exact baseline 29cd874b812c70c870d6a04ccab7e693ee2ae634. Resume existing owned forge/provider-snapshot-v2-S2A worktree; do not create another. Record full actual path/thread. Integrator Atlas, verifier Verity. Parent brief S2A-evidence-cli.md and PRD v2.2 remain normative except this narrower done-contract.

## Mentor and worker route
Atlas mentors; Forge implements; Verity verifies independently. Complexity medium, budget free-first, needs toolUse:true/imageInput:false/contextTokens:32000. Existing user-directed native setup; no fixed model tier or inferred price. Requested/actual identity separate. Expected25 minutes, maximum30; checkpoint remaining work if genuinely oversized, without repeating completed research.

## Expected change surface
tools/factory-route.cjs, tools/provider-snapshot-cli.test.cjs, package.json only. Evidence/logs external, not in product tree.

## Files and interfaces
Read PRD v2.2 source authority and exact nine preimages, plus S2A-source-contract-fixtures.json in feature artifacts. Implement/export readCurrentSources({project,sessionId,now}) with exact documented return. Strict JSON/JSONL duplicate and malformed handling; sanitized C/B/N/native binding; read-only route-identities capture, independent session, validity/native binding and full route coverage. Missing source markers distinct from corruption. Current source fingerprints are recomputed from files, never snapshot maps. Complete history/tombstones and source inputs for verified pure S1. Re-stat validation is exposed for callers before future mutation/dispatch. No CLI commands, evidence writes, record writes, ranking or snapshot writing. Existing route behavior remains unchanged. Add the source-reader test file once to npm test. No dependencies/provider framework.

## Files not to touch
Pure provider-snapshot module, other worktrees, live state/settings/config, project-memory DB, role/standard files and unrelated source. Tests use isolated temp home/state, never real credentials.

## Constraints
Approved v2 behavior unchanged; v2.2 is an internal source contract. Capture is operator attestation with undetectable external account-switch limitation, not authorization or authenticated source proof. No model calls/provider probes/default changes/paid fallback/push/merge/release/sync. No arbitrary model names or tier assumptions.

## Example patterns
Reuse node:test and node:assert/strict. Set FACTORY_HATTERA_HOME and FACTORY_STATE_DIR before requiring factory-route. Synthetic files provide config/bots/catalog metadata, session and route capture; no live reads. Use fingerprint from the verified pure module rather than invent another canonical hash.

## Acceptance commands
1. node --test tools/provider-snapshot-cli.test.cjs exits0; exercise reader positive/failure paths and no writes.
2. Test exact nine preimages/hash expectations, current native stat changes, capture renewal, wrong session/binding/expiry, missing vs malformed/duplicate JSON and invalid JSONL, complete route coverage, unrelated-project isolation, history and stale-source detection. Match synthetic fixture hashes separately from real temp filesystem metadata.
3. node --test tools/*.test.cjs and npm.cmd test exit0 with observed counts. Run this project-local brief gate.
4. git diff --check and exact baseline diff match only three expected paths. Commit with clean product tree. External evidence.json uses factory template, parent/child IDs, baseline/SHA/thread/worktree, actual identity unknown if no acknowledgement, commands/exits/counts/logs and no UI screenshots. Builder gate then independent Verity rerun with verifier-owned outputs must pass. No parent CLI completion claimed.

## Stuck protocol
Ask Atlas a bounded question with repro/evidence; do not reopen settled source authority. Routine helper naming choices may be decided and documented. Limits require continuation, no unauthorized fallback; same check twice permits asking, never automatic premium.

## Context and reporting
Record parent S2A sizing history and source sub-slice. Return SHA, exact path/thread, changed files, portable evidence/commands, helper interface/re-stat usage and remaining command wiring. Stop after this source reader.
