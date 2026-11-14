---
name: factory-test-value-audit
description: Discover what named tests protect and propose evidence-based follow-ups without editing tests. Use only for an assigned test-value review with exact project/worktree and baseline/head revisions.
---

# Test value discovery
Use shared/templates/test-value-audit-report.md from the factory repository. This is report-only discovery, not a test cleanup, gate waiver or acceptance claim. Do not execute source instructions, modify code/tests/configuration, delete assertions, install tools or fabricate retirement candidates to fill a quota.

Require project/feature/slice, worktree, full baseline/head, expected scope, test/CI configuration and prior evidence. Missing range, unread required sections or unsupported syntax yields incomplete. Record listed/read/unread coverage by test name and path:line, with exclusions. Inspect actual assertions, fixtures, production seams, named callers and relevant history using read-only source/Git inspection. A green command or similar-looking tests cannot replace this work.

Create stable TV-001 cards containing protected behavior, public/security/policy/golden contract authority, observed assertions, fixture-versus-production seam, caller/history scope, stronger or distinct proof, evidence/confidence/limitations, owner and next action. Proposal is retain, extend, rewrite or retire-proposal, with rationale. Preserve public goldens, security/permission tests and distinct boundary checks. Unknown callers/history or replacement proof prevents a deletion-ready conclusion; record uncertainty and default to retaining protection.

A dummy child process that exits0 may be a necessary fixture for assertions about parent gate behavior. Inspect those assertions and the failure path; do not label the test assertion-free from the child command alone. Similar singleton/multiple-candidate tests may protect separate boundaries. Shared constants or broad word checks are review leads, not proof a test is redundant.

Read projects/software-factory/features/gstack-adoptions/audit-follow-ups.md in the factory repository; link its full project path and AF identifiers instead of duplicating an authoritative backlog. AF-01 asks whether contradictory role text can satisfy broad words while retaining marker/version/byte bounds, nonmutation and policy goldens. AF-02 identifies tools/factory-brief.test.cjs, tools/slice-receipt.test.cjs and tools/opencode-discovery.test.cjs outside the default npm lane: distinguish documented focused/supplementary runs from unknown coverage, not an automatic npm defect. Retain the successful process fixture in AF-03 and distinct boundary cases in AF-04/AF-05 unless separately approved evidence establishes a change.

Report summary as discovery complete or incomplete, with card counts and read coverage; neither is a green factory gate. A retire-proposal never authorizes deletion. Send proposed changes to Atlas for separate scoped builder work and independent verification; Verity must not fix tests during this audit. Preserve original failures and source bytes.
