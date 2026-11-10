# Persistent project memory
Implemented: 2026-11-06

## Architecture and scope
The local CLI tools/factory-memory.cjs stores project pointers, versioned JSON records and an ordered history in state/memory.sqlite3. It uses the installed Node runtime and built-in SQLite, with no external packages, inference calls, model assignments or background process. Node with node:sqlite is required; verified here on v24.21.0.
Each update commits the new record and its full history event in one transaction. Writers must supply the version they read; version 0 creates a new record. A stale write fails, so reread and reconcile instead of blindly retrying. SQLite serializes concurrent local writers. Use a local filesystem, not a network/sync folder with unverified SQLite locking.
Records are durable observations, not proof of truth or live execution. Kind names organize content, not an enforced feature state machine. The store does not grant permissions or check whether the named actor is the real caller; trusted local agents must follow their normal boundaries.
The database is the authoritative coordination state; Markdown briefs are readable planning references. Do not independently update two conflicting authoritative copies. JSON context/history outputs provide readable exports. Back up with the CLI; use a backup or explicit corrective version for recovery.

## Record kinds
application: architecture, purpose, interfaces, data ownership, build/test commands, current revision and source pointers.
feature: requirements, R&D, architecture decisions, slices, dependencies, status, blockers and next actions.
slice: parent feature_id, scope, contracts, owner, session/workspace, acceptance and progress.
execution: parent feature_id, slice ID, actual session/provider/model, timestamps, revisions and result pointers.
decision: alternatives, rationale, consequences, evidence and revisit conditions.
evidence: tested revision/local-change identity, commands, environment, result, skips and artifact pointers.
lesson: confirmed root cause, applicability, evidence and proposed improvement.
Every record requires summary. Additional fields are explicit JSON supplied by the caller. Use revision, feature_id, status, next_action, evidence and observed_at consistently. This is flexible storage; callers must validate domain claims and transitions. Never store credentials or unrelated private conversations.

## CLI
Run from any directory with absolute paths. Commands below use PowerShell and illustrative IDs; no user application has been registered.
```powershell
$memoryTool = "$env:FACTORY_ROOT\tools\factory-memory.cjs"
node $memoryTool projects
node $memoryTool register my-app 'D:\actual\project'
node $memoryTool put my-app feature checkout 'D:\briefs\checkout.json' 0 Atlas
node $memoryTool get my-app feature checkout
node $memoryTool context my-app checkout BASELINE_REVISION
node $memoryTool events my-app 0 50
node $memoryTool backup "$env:FACTORY_ROOT\artifacts\memory-backup.sqlite3"
```
Use expected version 1 for the next update only if that is the version actually read. Duplicate project registration is rejected; source relocation needs deliberate registry migration, not silent re-registration.
For slice/execution/decision/evidence/lesson retrieval within a feature, set feature_id. App-wide records should remain application records or be retrieved explicitly. The context command filters by this field, not a semantic graph. Use get for individual records. Revision comparison flags exact mismatches as stale and absent revisions as unknown; it cannot detect uncommitted changes or elapsed-time freshness automatically.
Events are paged by global sequence: pass the last returned seq as AFTER to continue. Context output is unbounded within its selected feature; keep summaries concise and link large evidence externally. No embeddings or semantic search has been added.

## Session protocol
1. Atlas registers the real project path and establishes the application baseline; projects remain wherever they already live.
2. On starting/resuming a slice, retrieve its feature context and specific relevant records. Reconcile revision, local changes, timestamps and actual execution state before acting.
3. Before dispatch, Atlas stores the ready slice and dependencies. After an accepted launch, store actual execution identity. Intended dispatch must not be recorded as confirmed running.
4. Workers return checkpoints/results. Atlas merges them using read-version/write-version; workers may write separate owned execution records within their granted access. Atlas owns shared feature summaries.
5. Verity records independent evidence for the exact revision; Atlas updates integrated state only after checking that evidence. Code changes invalidate affected results.
6. At handoff, record current state, blockers, next action and evidence pointers. A new session reconstructs from records, not an entire conversation.
7. Store lessons only when supported; recurring failures can propose a new research/architecture/test slice. Automated lesson mining and background monitoring are not implemented.

## Verification
Five automated tests passed: fresh-process retrieval with feature scoping/revision warnings; stale-write rejection without phantom events; injected event-write failure rolls back state; project isolation and backup restore; two competing writer processes permit one matching-version commit.
These tests establish local storage behavior. Automatic Hattera/Codex/OpenCode event capture, actual app adoption and an independent agent handoff have not been validated. The CLI must currently be invoked explicitly. No project source was moved.

## Acceptance for first application
Register an actual project, populate its baseline and one feature, dispatch a real slice, record returned evidence, then resume in another session and verify it selects the correct next action. This remains pending until an application is supplied.

