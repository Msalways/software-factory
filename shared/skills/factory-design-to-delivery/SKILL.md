---
name: factory-design-to-delivery
description: Coordinate a Software Factory feature from current-project analysis through design, slicing, routing, implementation, independent verification, integration and release readiness. Use for substantial factory delivery work across existing projects.
---

# Factory design to delivery
Use the actual project location. The factory coordination root is the folder where the software-factory repository is cloned (`FACTORY_ROOT`; your standing instructions name it). Read shared/standards/gates-and-handoffs.md first, which defines the pipeline and its gates. Then read only the relevant parts of project-understanding.md, requirements-and-slices.md, design-and-e2e.md and dynamic-execution.md. If they are unavailable, report the missing context and work from the task brief.

Pipeline: Intake -> Understand -> R&D -> Design (UI only) -> Slice -> Route -> Execute -> Verify -> Integrate -> Release -> Learn. Every gate fails by default and passes only on recorded evidence. An agent's "done" is a claim, not evidence.

Roles: the Lead/Atlas plans, slices, routes, handles fallback and integrates. **It never implements or designs.** The Designer owns DESIGN.md, the plan design review before build and the live screenshot review after build. Builders deliver one slice per session against its done-contract. The verifier is not the builder (preferably a different engine) and checks artifacts_exist, diff_matches_claims and tests_pass on the tested revision.

Before implementation: establish the current revision and local changes, a capability snapshot for this session (tools actually mounted, engines actually ready), the outcome, the acceptance criteria and the unknowns. Record a held decision (with a default and a deadline) instead of stalling on a user decision.

For user-facing work, request the Designer. Use DESIGN.md (template shared/templates/DESIGN.md) and the scored plan design review. Produce variants only for new surfaces. The live design review needs real screenshots at the agreed viewports. If no capture tool or image-capable engine is available, mark the review blocked with that reason.

Slice with shared/templates/slice-spec.md. Each slice has a requirements profile (complexity, needs, budget class; never a model name), a done-contract (commands, expected change surface, evidence.json, screenshots for UI) and a size that fits one session's context and one quota window.

Route each slice from live supply as dynamic-execution.md describes: filter by needs and quota headroom, rank cheapest-capable first, choose effort from the engine's advertised levels, spread parallel slices across engines and accounts, and write a routing receipt. Do not hardcode or remember a model as "free". On a limit, rotate before progress, or use a continuation packet after progress. At about 70% of the context window compact; at about 90% hand off. Classify every failure before retrying.

Integrate through the merge queue: one verified slice at a time under a merge lock, re-running the combined checks after each merge. Send shared-contract conflicts back to the slice owner.

Before release, prepare build/configuration, migrations when applicable, smoke checks and a rollback path. The PR body includes routing receipts, gate evidence and screenshots. Execute external release actions only within authorization.

Completion means the agreed acceptance criteria have evidence on the integrated revision, or an explicitly accepted limitation. Keep untested, blocked and skipped work visible.

Provenance: the user's Software Factory requirements, the Hattera trial review (docs/factory-review-2026-11-10.md) and the public-repo research (research/software-factory-rd-2026-11-10.md, docs/factory-steps-2026-11-10.md), 2026-11-10.
