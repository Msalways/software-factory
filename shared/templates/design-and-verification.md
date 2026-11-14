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
- Screenshots (before / after, per required state; for a UI-surface slice the designated set is exactly one current screenshot per required state x viewport cell from the spec's UI evidence requirements, with before-images kept in this report only):
- Deviations from the design and fixes (each as its own commit):
- Result: pass / changes-needed:

### UI evidence handoff (UI-surface slices; verified with `factory-gates check --ui`)
- Spec binding: spec path, specVersion and normalized spec hash (utf8-bomless-lf-v1) that match the user-approved spec and Atlas's approval.uiSpecs record:
- Tested revision (full SHA, identical in evidence, every screenshot entry and this review):
- Reviewer attestation: independent reviewer identity (not the builder), review result `clean` or `open`, and screenshotSetSha256 recorded AFTER reviewing exactly those images. Digest: sort the designated cells by state then viewport (plain ordinal string comparison), map each to [state, viewport, lowercase SHA-256 of the actual file], JSON.stringify that array (compact, no trailing newline), UTF-8, SHA-256. Replacing an image invalidates a prior review even at the same revision.
- Per-cell record: state, viewport, path, revision, sha256, pixelWidth, pixelHeight, optional fullPage (default false). Declared pixel size must equal round(CSS size x deviceScaleFactor), or be at least that for fullPage captures. The gate checks declared geometry only; reviewer/Verity inspect actual dimensions and capture settings.
- Status meanings: **clean** = every required cell is present, current and valid and the independent review is clean (no open reviewed findings); **open** = all cells valid and current but the review reports open findings; **incomplete** = metadata/spec/hash mismatch, missing, stale or duplicate cells, absent or stale review, capture available but cells missing, or capture unavailable with some cells captured (an uncapturable cell needs a specific diagnostic reason and stays incomplete: capture it or re-approve the spec, never exempt it); **unrendered** = capture explicitly unavailable (with reason) and zero captures, no review required. Only clean passes the UI gate.
- Limitations to state in the report: image hashes, revision labels and review metadata are attestations and cannot authenticate that an image was actually rendered from the tested revision; Verity checks real capture/run provenance and the independent reviewer supplies visual judgment. Keyboard, focus and other interaction behavior cannot be proven by still images; record run or interactive evidence for them, or list them as unverified.
- Live-finding workflow (per-finding format and repair loop) is queued for wave 2 and not defined here.

## Verification
- Acceptance criteria -> check -> evidence location:
- Real integrations, stubs and excluded boundaries:
- Test environment, fixtures and cleanup:
- Commands, tested revision, results, failures and skips:
- Visual/interaction evidence:
- Release build/configuration and migrations if applicable:
- Smoke checks and recovery/rollback:
- Owner, independent verifier, readiness and blockers:
