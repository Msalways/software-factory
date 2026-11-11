# Slice brief

Goal: <one concrete outcome>
Project and revision: <authorized path, baseline SHA, branch/worktree>
Mentor: <reachable mentor thread and bot identity>
Worker route: <workKind implement or routine-verify; configured worker tier; requested and confirmed route receipt>

## Files and interfaces
<Expected change surface, inputs/outputs, ownership and invariants. Link source rather than copying room history.>

## Pitfalls
<Known failure cases, permission boundaries, concurrency and recovery requirements.>

## Acceptance commands
<Exact native checks and expected results. Evidence path and limitations.>

## Mentor-question protocol
The worker asks from its own thread: goal, relevant interface, exact failing check,
observed result, attempted fix and one bounded question. The mentor returns guidance
and any corrected brief. The worker retains implementation ownership; a question
does not transfer the worktree or authorize a provider/default change.

## Escalation rule
Request a premium execution only after the same check fails twice or evidence proves
the brief wrong. Record both attempts or the disproven assumption, the escalation
reason and requested/confirmed route. Use only owner-authorized configured supply.
An empty worker tier is an explicit fallback/blocker, never permission to buy a route.

## Context and reporting
The Lead writes this brief in the project before dispatch. The worker uses its own
thread and worktree and sends deltas on resume. Rooms contain status, decisions and
blockers only; detailed planning, explanations, code and mentor questions stay in
the owning threads and linked artifacts. Record handoffs, questions and escalations.
