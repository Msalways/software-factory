# Design and verification contract
- Project path, revision/local-change identity and task:
- Designer (owner of this section) and DESIGN.md version used:
- Target user and primary outcome:
- Existing design system/components and relevant references:
- Primary journey (entry -> action -> observable result):
- Required states and recovery:
- Relevant narrow/wide layouts and keyboard/accessibility behavior:
- Design decisions and affected interfaces:

## Plan design review (before build)
| Dimension | Score 0-10 | Finding / required change |
|---|---|---|
| Hierarchy and clarity of the primary task | | |
| States covered (loading, empty, error, permission, recovery) | | |
| Consistency with DESIGN.md (tokens, components, tone) | | |
| Accessibility (keyboard, focus, labels, contrast) | | |
| Generic-AI patterns avoided (see DESIGN.md "Don't") | | |
| Real content, no invented claims or placeholder metrics | | |
Result: pass (every dimension >= 7) / revise. Variants considered (new surfaces only) and the chosen direction with reasons:

## Live design review (after build)
- Tested revision and viewports:
- Screenshots (before / after, per required state):
- Deviations from the design and fixes (each as its own commit):
- Result: pass / changes-needed:

## Verification
- Acceptance criteria -> check -> evidence location:
- Real integrations, stubs and excluded boundaries:
- Test environment, fixtures and cleanup:
- Commands, tested revision, results, failures and skips:
- Visual/interaction evidence:
- Release build/configuration and migrations if applicable:
- Smoke checks and recovery/rollback:
- Owner, independent verifier, readiness and blockers:
