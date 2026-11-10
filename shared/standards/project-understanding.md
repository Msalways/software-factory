# Project understanding and delivery
Updated: 2026-11-04

Atlas owns this workflow across projects wherever their repositories live. The factory root (`FACTORY_ROOT`) stores coordination records and evidence pointers.

1. Understand the request: outcome, users, constraints, acceptance criteria, and unresolved decisions. Resolve routine choices from project evidence; ask only when missing information materially affects the outcome.
2. Establish the current state: inspect relevant source, documentation, dependencies, interfaces, architecture, existing tests, build commands, revision, and working-tree changes. Follow project instructions. Record evidence locations and distinguish observed, inferred, and unknown.
3. Compare requirements with reality: mark capabilities present, partial, absent within the inspected scope, or unknown. Missing search results alone do not prove absence. Explain reuse opportunities and affected components.
4. Investigate uncertainty: use ordinary repository tools for source understanding. Consider REA when shipped artifacts, packages, decompilation, or requested runtime observations can resolve a specific open question. Check actual tool availability and prerequisites; report limitations. REA availability is not established by this document.
5. Decide the architecture: record the decision, relevant evidence, alternatives, tradeoffs, constraints, affected interfaces, verification plan, and conditions for revisiting. Prefer an extension of suitable existing architecture.
6. Delegate bounded work: give one accountable owner the outcome, scope, project path and revision, relevant context links, dependencies, acceptance criteria, and evidence expectations. Create temporary feature workgroups only when useful. Isolate concurrent edits using supported project workspaces.
7. Select execution at task time: inspect live authorized agents, providers and models; match reasoning, tools, context, reliability, latency and cost to the work. Record the choice and reason. Use supported controls and distinguish requested selection from confirmed execution. Cached catalogs do not prove availability. Skills do not contain fixed model assignments.
8. Verify and integrate: Forge supplies implementation and reproducible checks. Verity independently evaluates acceptance and integrated regressions on the exact revision, recording environment, commands, results, failures and skips. Changed code invalidates affected previous verification. Unexecuted or synthetic checks do not establish runtime correctness.
9. Close with evidence: Atlas checks acceptance, unresolved issues and dependencies; reports the actual outcome and limitations. Release actions follow existing user authorization.

## Context
Maintain a concise project map and decision history. Load only task-relevant context. Each summary links to underlying evidence, identifies scope and omissions, and records revision/date. Refresh affected records after changes. Unknowns remain visible until resolved.

## REA's role
REA informs requirements gap analysis and architecture decisions through concrete artifact/runtime evidence. Atlas interprets that evidence against user goals and project constraints. REA's analysis-engine selection does not select Codex/OpenCode models.
Reference: ../../research/rea-review.md


## Execution across engines
Follow dynamic-execution.md in this directory. Consider both Codex and OpenCode for each task. Native bot defaults do not determine the coding engine. OpenCode CLI exposes per-run model selection; its live model catalog and an inference run remain unverified after empty catalog responses on 2026-11-04. Report this gap rather than silently equating the native catalog with all configured engines.


## Design through release
For substantial delivery work, read ../skills/factory-design-to-delivery/SKILL.md and the relevant parts of design-and-e2e.md. Use ../templates/design-and-verification.md to connect product design, acceptance criteria, real user journeys and release evidence. Existing skills are selected only when relevant and available to the executing bot.



## Engineering quality
Follow [engineering-quality.md](engineering-quality.md) for substantive fixes and architecture work. Establish the causal mechanism, trace affected callers and data/contracts, select the durable fix at the correct responsibility boundary, and supply regression and integration evidence. Quality takes priority over quick output. Token economy reduces duplication; it must not shorten necessary reasoning or verification.


## Requirements, R&D and slice orchestration
Follow [requirements-and-slices.md](requirements-and-slices.md) before dispatching development. Atlas maintains a durable portfolio/feature/slice record with acceptance mapping, R&D findings, dependency edges, actual session IDs, revisions, evidence and next actions. Use [feature-control.md](../templates/feature-control.md). Parallelize independent slices only with supported session/workspace isolation. Monitor actual execution events and reconcile on resume; continuous background monitoring is not established by these files.


## Persistent application and feature memory
Use [project-memory.md](../../docs/project-memory.md) for the local versioned memory CLI and session protocol. Store real project pointers, concise application knowledge, feature/slice state, actual execution identities, decisions, evidence and confirmed lessons. Read before writing; reconcile version conflicts and stale evidence. Atlas owns shared state; event capture currently requires explicit CLI calls. Do not claim automatic synchronization or background monitoring.


## Project and feature isolation
Follow [project-isolation.md](project-isolation.md): separate native project rooms, distinct feature rooms/sessions for concurrent work, project-scoped memory and isolated execution workspaces. Atlas holds the portfolio overview. Discover real capacity and use dedicated workers where shared recipients would serialize or mix work. Record actual native IDs and confirm setup; no project-specific group exists until a real project is supplied and creation succeeds.


## PRDs, slice specifications and tracking
Follow [specs-and-tracking.md](specs-and-tracking.md): R&D findings feed a feature PRD, versioned slice specs map requirements to implementation and verification, and local memory records track actual task state. Use ../templates/feature-prd.md and ../templates/slice-spec.md. Document authoring, readiness gates and event updates currently require explicit lead actions; they are not automatic services.

