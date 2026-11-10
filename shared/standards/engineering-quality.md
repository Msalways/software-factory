# Engineering quality: root cause, impact and architecture
Updated: 2026-11-04
Source: the user's explicit Software Factory quality preference in this conversation.

Substantial, maintainable outcomes take priority over quick output. Token efficiency means avoiding redundant sessions, repeated investigation and irrelevant context; it must not weaken diagnosis, implementation or verification. Choose reasoning depth and model capability according to the problem, using the live available Codex/OpenCode routes. Low effort is a starting setting, never a requirement to under-investigate.

## Diagnose before fixing
Establish the expected behavior and the actual failure. Reproduce where feasible and collect relevant code, logs, state, inputs and environment evidence. If reproduction is unavailable, record why and label hypotheses as hypotheses.
Trace the causal path through callers, state/data flow, shared logic and external boundaries until the mechanism explains the symptom. Evaluate plausible alternatives rather than choosing the first convenient explanation. Record the violated contract or invariant and the evidence supporting the cause.
Search sibling callers and related paths. Determine whether the defect belongs in a shared component, a boundary contract, data handling, lifecycle, concurrency, configuration or a local operation. Do not propagate a local workaround into each caller when the common mechanism is defective.

## Understand impact
Identify affected entry points and consumers, shared components, stored data/schema, interfaces, background tasks and relevant permissions. Consider compatibility, concurrency, performance and recovery when they are affected by this change. Separate confirmed effects from plausible risks. Record the inspected scope and unknowns without expanding into unrelated rewrites.

## Make a durable architecture decision
Explain where responsibility belongs and why. Compare meaningful alternatives when the choice affects boundaries, ownership, dependencies, compatibility or future maintenance. Favor cohesive responsibilities, explicit contracts, clear data ownership and maintainable dependencies.
The right change may be a small correction or a justified refactor. Neither line count nor speed is the success criterion. Avoid speculative frameworks and generic abstractions without a demonstrated need; preserve useful existing architecture and repair unsuitable boundaries when evidence warrants it.
Do not hide failures through blanket exception handling, arbitrary retries/sleeps, disabled checks, weakened assertions, hardcoded special cases or silent fallback. Validation, retries and fallbacks can be appropriate when they enforce a real contract and have explicit semantics and verification.
If urgent mitigation is explicitly needed, label its scope, remaining cause and follow-up; do not present mitigation as durable resolution.

## Verify the mechanism and affected behavior
For substantive bug fixes, use a regression case that exposes the original failure before the fix and passes afterward where feasible. Test the shared mechanism and relevant callers rather than merely restating the implementation. Exercise affected boundaries and integrated journeys at an appropriate level.
Run meaningful existing checks and targeted additional checks as needed. Record exact revision, environment, commands, results, failures and skips. Verify that errors remain observable and recovery behaves as intended. Changed code invalidates affected evidence.
Verity challenges the causal explanation, architectural fit, unintended effects and evidence. Atlas accepts completion only when the agreed outcome is supported; unresolved causal uncertainty or material untested impact remains visible.

## Required handoff
For substantive fixes or structural changes, include:
- Symptom and expected behavior, with reproduction or its limits.
- Root cause, supporting evidence and relevant contract.
- Affected paths and impact scope, including unknowns.
- Chosen change, architectural rationale and meaningful alternatives.
- Regression and integration evidence on the tested revision.
- Compatibility/migration/recovery considerations where applicable.
- Remaining limitations and follow-up.

Do not claim that documenting this standard proves any project has met it.

