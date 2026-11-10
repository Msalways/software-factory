# Software Factory capability review
Date: 2026-11-04
Scope: saved coordination files, applied team roles/defaults from this conversation, local skill sources and previously observed execution controls. No product repository or deployed application was supplied for this review.

## Improvements delivered
Added a design-to-delivery skill, practical design/E2E standard and a combined design/verification contract. Linked them into the existing Atlas workflow. Added explicit user journeys, state coverage, visual/keyboard review, real-versus-stubbed boundaries, combined-revision checks, release smoke checks and recovery. Kept skills and model selection on demand. Reused installed design skill sources; did not install packages or create extra bots.

## Current limits
- Atlas, Forge and Verity have applied workflow instructions and Sol defaults. Runtime task-specific provider switching is not proven.
- OpenCode's saved model catalog contains 191 entries and default opencode/beam-free; CLI model enumeration previously returned no output. These are different observations. Successful model execution remains unverified.
- Native team controls previously exposed only Codex; the catalog can change. Inspect again when dispatching.
- REA was reviewed as optional artifact/runtime evidence tooling. Its installation and execution are unverified.
- Design skill files are available to Sage locally; this does not establish they are enabled or readable in every teammate.
- No actual application E2E run, integration pipeline, release or rollback was executed. A design-to-delivery procedure is not evidence of operational E2E capability.

## Next operational proof
Use a concrete project at its existing location and deliver one small vertical feature through its real UI/API/storage boundaries where applicable. Record the dynamically chosen engine/model and confirmed execution, design/acceptance contract, implementation, independent evidence and combined tests. Prepare release/recovery material and deploy only within authorization. If an engine or environment is unavailable, record the blocker without silently changing the requested cost constraints.

## Verification of these changes
Local file presence and Markdown link validation are appropriate for these documentation changes. No product test result is implied. Existing files were edited in place; project source and provider settings were not changed.

