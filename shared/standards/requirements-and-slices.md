# Requirements, R&D, slices and orchestration
Updated: 2026-11-10

Atlas owns the portfolio and feature/slice execution records. The pipeline, gates, done-contract, failure classes and merge queue are defined in gates-and-handoffs.md. Every step below passes its gate there. A coding session is an execution unit; the durable plan and evidence remain outside its context window. Projects keep their actual locations.

## Before building
For every request, establish the outcome, users, scope, constraints, acceptance criteria and current project state. Scale the record to the work: a small fix needs a short brief, while a substantial feature needs explicit discovery and architecture.
Do R&D against concrete uncertainties: questions, hypotheses, relevant code/runtime evidence, authoritative documentation where needed, alternatives and a decision. Use a bounded spike when feasibility cannot be established by inspection; separate experimental changes from delivery. Record evidence, limitations and conditions that would change the conclusion.
Do not dispatch implementation with unresolved requirements or architectural assumptions that materially affect that slice. Continue independent research or unaffected slices while a decision is blocked. Atlas resolves routine decisions; involve the user when intent or a material tradeoff cannot be inferred. Avoid repeated approval gates. Record a decision that waits on the user as a held decision (gates-and-handoffs.md), with a default and a deadline, so work does not stall.

## Slice the feature
Keep IDs scoped by project, feature and slice. Describe each slice as a testable outcome, preferably a small vertical path through relevant layers. A technical prerequisite can be its own slice when it enables dependent outcomes; document its consumers.
Each slice includes: parent goal, requirement/acceptance IDs, boundaries, dependencies, interface/data contracts, relevant source and baseline revision, owner, requirements profile (complexity, needs, budget class; never a model name), done-contract, routing receipt, session identity and integration target. Use shared/templates/slice-spec.md.
Size cap: a slice must fit one session's context and one quota window. A slice that is too big for that, or one that hit a room inactivity timeout, is split, not retried.
Do not slice merely by arbitrary file count or create tiny sessions whose handoff costs exceed their benefit. Group cohesive work; split genuinely independent outcomes. Plan the integration slice and combined feature acceptance before dispatch.
Use dependency edges and shared-file/interface ownership to identify safe parallel work. Cross-feature conflicts in schemas, shared modules and contracts must be sequenced or resolved explicitly. Cap active slices at actual execution and review capacity; no fixed universal concurrency count.

## Dispatch and session continuity
Dispatch the outcome to its owner before starting its external engine. Confirm the receiving room's scope and the worker's workspace, provider access and required dependencies. Keep installation and long-running process ownership with one thread; record durable status before a handoff. On rework, send the changed acceptance point and evidence pointers, then resume the same slice session where supported. Do not repeat discovery, dependency installation or a broad audit merely because a new handoff occurred.

Choose the available engine/model per slice using dynamic-execution.md. Consider every ready engine, with no fixed role-to-model mapping. Spread parallel slices across engines/accounts, and keep the verifier on a different engine from the builder where one is available. Quality and reasoning depth follow the task; avoid irrelevant context and redundant sessions.
Give each independent session a self-contained slice brief, relevant pointers, baseline, allowed scope, dependencies, acceptance checks and expected evidence. Record its actual returned thread/session ID and route. A fresh independent task must not accidentally resume another feature's session.
Use isolated workspaces for concurrent edits and name the integration owner. Native Hattera handoff currently reuses the recipient's thread outside a room and has no per-task model override; do not claim it creates independent slice sessions automatically. Use supported execution/session controls when available. If separation/concurrency is unavailable, serialize affected work and report the constraint rather than simulate it.
Workers report outcomes and checkpoints with revision, changed files, checks, blockers and next action. They do not self-certify integrated feature completion. A context-limit handoff records verified progress and pending work before continuing in a new supported session (continuation packet, dynamic-execution.md).
Atlas and project Leads never implement slices themselves. When a route fails, they re-route, split the slice or escalate. A root-cause fix under release pressure becomes a slice and is not patched directly.

## Monitor and adapt
Use shared/templates/feature-control.md, relative to the factory root, for the durable portfolio, feature and slice view. Update on accepted dispatch, actual progress evidence, completion, failures, changed requirements and integration results. Reconcile records against files/revisions and execution results after resuming.
A running state requires accepted execution identity. Keep status source and last-observed timestamp. Stale observations are unknown/stale, not proof of healthy progress. Consult returned results and supported incident/progress mechanisms; follow native coordination rules rather than poll unnecessarily.
Atlas handles dependency changes, blocked slices, conflicting edits, missing evidence, failed verification and rework. Preserve attempt history and avoid duplicate execution. Retry only after classifying the failure (gates-and-handoffs.md failure classes) and respecting tool-specific limits. Escalate external/user-only blockers with the precise missing input.
Monitoring is event-driven while the orchestrator is invoked or resumed by supported execution events. This document does not create a background daemon or scheduled routine. Any continuous service must be explicitly configured and verified before claiming continuous monitoring.

## Verify and close
Slice state: planned -> researching -> ready -> running -> review -> verified -> integrated. Blocked and changes-needed can interrupt any applicable state. State transitions require their supporting evidence; a research-only slice may close with its documented finding.
Feature state: discovery -> planned -> implementing -> verifying -> ready-for-release -> released. A feature is not complete because all worker sessions ended: verify its acceptance, combined revision, affected integrations and unresolved issues.
Verity independently verifies relevant slices and the assembled feature using the gate checks artifacts_exist, diff_matches_claims and tests_pass. Integration uses the merge queue: one slice at a time under a merge lock, re-running the combined checks after each merge. Code changes invalidate affected verification. Atlas closes only against the agreed outcome, with revision-specific evidence and explicit limits. Follow engineering-quality.md and design-and-e2e.md for root cause, impact, architecture and release readiness.

