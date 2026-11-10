# R&D to PRD, slice specifications and task tracking
Updated: 2026-11-06

## Ownership and sequence
The project lead owns the feature PRD and slice plan. Atlas reconciles cross-project priorities and dependencies; workers implement bounded slice specifications; the independent verifier checks acceptance and combined behavior.
R&D produces an evidence-backed findings record: current state, uncertainties, experiments, alternatives and decisions. The lead turns this into one coherent feature PRD; do not create competing PRDs for each slice. Each slice gets an implementation specification linked to the PRD requirement and acceptance IDs.
Scale detail to the work while keeping the same traceability. A small correction can have a short PRD/spec in one document. Drafting a document does not mean its assumptions are resolved.

## Artifacts
Suggested coordination location: projects/<project-id>/features/<feature-id>/ under the factory root, with research.md, prd.md, decisions.md when needed, and slices/<slice-id>.md. Reuse the project's established spec convention when present and store actual document pointers in memory. This creates no source relocation requirement.
Every substantive requirement has an ID and observable acceptance. Every dispatched slice cites requirement IDs, a PRD/spec version, dependencies, baseline, scope, relevant contracts and tests. Maintain requirement -> slice -> evidence traceability. Do not duplicate the full PRD into each worker session.
Use shared/templates/feature-prd.md and slice-spec.md. These are authoring templates, not automatically generated project deliverables.

## Ready to dispatch
The lead checks that the slice's outcome and acceptance are clear, critical R&D questions resolved, interfaces settled enough, dependencies satisfied and workspace ownership unambiguous. Plan integration/verification work as explicit outcomes. Verifier review can expose missing cases before coding.
Routine decisions stay with the lead. Ask the user only when an unresolved product intent or material tradeoff requires them. Do not add an approval ceremony to every document.
Spec revisions identify affected tasks, contracts and evidence. Work based on superseded acceptance is re-evaluated; do not keep its ready/done claim unchanged. Existing memory storage does not enforce these domain gates; the lead must apply them explicitly.

## Tracking source of truth
Use state/memory.sqlite3 through tools/factory-memory.cjs. The feature record stores status, PRD/spec pointers and versions, requirement IDs, slice IDs and integration state. Each slice record stores feature_id, spec pointer/version, owner, dependencies, state, next action, blockers, actual session/workspace/engine/model and evidence references.
Execution records capture actual launches/checkpoints/results; evidence records capture revision/environment/commands/results; decisions capture R&D and architecture rationale. Set feature_id for feature-scoped retrieval.
Rooms discuss work and surface progress; database records are authoritative coordination state. A Markdown task table is a dated view, not another independently writable tracker.

## Updates and resumption
Before dispatch/resume, load feature context and relevant slice records, compare actual source/local changes and spec versions, then select a ready slice. Read the record version and write with that expected version; on conflict reread and reconcile.
After accepted dispatch, write actual session identity; after checkpoints, returned results, verification or blockers, update the owned record and feature summary. Preserve failed attempts and state reasons rather than overwriting history. Writes and history are atomic, but document edits plus database updates are not one transaction: reconcile document version/pointer changes before dispatch.
Retrieve with: node tools/factory-memory.cjs context PROJECT FEATURE REVISION
Inspect one task with: node tools/factory-memory.cjs get PROJECT slice SLICE
Update using a JSON payload file and its observed record version; see docs/project-memory.md for exact syntax.
The CLI does not automatically listen to room/agent events. Leads must invoke it explicitly today. It is not an existing GUI board, autonomous scheduler, dependency validator or automatic PRD generator.

## State and completion
Planned -> researching -> ready -> running -> review -> verified -> integrated; blocked/changes-needed carry reason, owner and next action. State names are conventions, not an enforced database state machine.
Completion requires accepted evidence for the current spec and tested implementation, followed by combined feature acceptance on the integrated revision. Finishing a session or marking every slice done cannot substitute for integration verification.
Portfolio summaries report per-project/feature state, blocked dependencies, stale evidence and next decisions. No actual application/tasks are populated until project intake.

