# Slice brief

## Goal
<One concrete outcome and the behavior that changes.>

## Project and revision
<Exact authorized repository/worktree path, baseline SHA, branch, and worker thread.>

## Mentor and worker route
<Mentor thread/bot identity; exact task profile/profileHash and schema-2 snapshot path/hash/freshness evidence; routing receipt and sourceRefs.
Separate authorization, provider tier evidence, hard capabilities and dispatch/cost permission; qualified worker first for every work kind, never a fixed tier by role.
Record requested engine/model/effort separately from provider-acknowledged actual identity/effort and its source; unavailable means unconfirmed.
List held questions and any exact premium need/user permission binding. Two failures justify asking only; timeout grants nothing. No fixed model identities or inferred approval.>

## Expected change surface
<Exact files/directories expected to change and why each is needed.>

## Files and interfaces
<Exact paths and existing/new interfaces, including function signatures, types,
inputs/outputs, callers and invariants. Enough detail to implement without room history.>

## Files not to touch
<Explicit exclusions: other active worktrees, project memory, owner configuration,
unrelated source and live data. Add project-specific excluded files.>

## Constraints
<Compatibility, permissions, dependencies, concurrency/recovery, performance and
visual constraints. State missing facts rather than guessing.>

## Example patterns
<Copy 1-2 short concrete patterns from this codebase, each with its exact path:line
and an explanation of how to reuse it. Include the copied code in fenced blocks.>

## Acceptance commands
<Exact commands, execution directory and expected result for each. State expected
pass counts or concrete assertions and evidence paths. Include failure/recovery checks.>

## Stuck protocol
Ask the mentor in this worker thread with what was tried, the exact failing output,
and one specific question. The mentor returns guidance, not an implementation takeover.
Escalate after the same check fails twice; record both attempts and the escalation
reason. If the brief is proven wrong, show that evidence and request a corrected brief.
Never change permissions, owner configuration or model authorization to get unstuck.

## Context and reporting
The Lead writes this filled brief into the project before dispatch. The worker owns
its thread/worktree and sends deltas on resume. Rooms carry status, decisions and
blockers only. Detailed work and mentor questions stay in the owning threads.
Run the brief gate before dispatch: node <factory>/tools/factory-gates.cjs brief <file>.
