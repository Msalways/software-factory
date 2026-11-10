# REA review for Software Factory
Date: 2026-11-04
Repository: https://github.com/morluto/rea
Observed main commit: c3647ade1e557c4179a8b825a37e0c2193cd2526
Observed package version: 6.8.0

## Verdict
REA is a specialist reverse-engineering tool layer exposed through MCP and CLI. It is not a portfolio manager, chief-of-staff agent, feature-team coordinator, or Codex/OpenCode model router. Keep Atlas responsible for understanding projects, planning outcomes, allocating work, and accepting evidence. Consider REA only when a task needs shipped-artifact, decompilation, or runtime evidence.

Its own skill explicitly excludes ordinary architecture analysis of a complete source repository. Installing REA is unnecessary for reviewing REA's source.

## Scope and confidence
Reviewed README/package metadata, architecture and capability documentation, MCP contracts, evidence schema, composition and entry code, provider-selection contracts, result delivery, reconstruction ledger evaluation, readiness and testing documentation, and workflow inventory. Some reads used main; targeted follow-up reads used the commit above. This is a targeted architecture and integration assessment, not an exhaustive line-by-line security audit. No package was installed, target executed, tests run, or CI success independently verified.

## How it works
External agent (such as Codex or OpenCode)
-> MCP tools or CLI
-> composition layer
-> application services
-> domain contracts and evidence
-> analysis adapters and controlled process/filesystem resources.

The external agent supplies reasoning and chooses investigative operations. REA supplies analysis capabilities and structured results. Native deep-analysis adapters include Hopper, Ghidra, IDA, and Kuna. Other capabilities cover JavaScript/Electron, browser observation, managed code, Android, firmware, and other artifact types, with separate prerequisites.

Capability declarations are distinct from current runtime availability. Providers are lazily constructed. A binary target receives an immutable deep-provider binding. The inspected binding contract records request/environment/auto-single-candidate as selection sources. This is not evidence of an optimizing AI-model router.

Source: https://github.com/morluto/rea/blob/main/docs/architecture.mermaid
Source: https://github.com/morluto/rea/blob/main/docs/capability-composition.md
Source: https://github.com/morluto/rea/blob/c3647ade1e557c4179a8b825a37e0c2193cd2526/src/application/binary/AnalysisProviderRegistry.ts
Source: https://github.com/morluto/rea/blob/main/src/composition/binary.ts

## Patterns worth adopting

### 1. Evidence with provenance
Evidence records carry subject identity, provider/version, analysis profile, operation/parameters, raw and normalized result, confidence (observed/derived/inferred), authority, environment, limitations, locations, and evidence links. Semantic digests identify records and detect mismatches; they do not prove a conclusion is true.

Factory adaptation: attach project path, repository revision, changed files, exact check command, result, environment, limitations, and unresolved questions to every feature handoff. Keep observations separate from inference.

Source: https://github.com/morluto/rea/blob/main/src/domain/evidence.ts

### 2. Retrieve context in small views
MCP delivery supports bounded responses, retained evidence, summaries/pages, and continuation views. Full evidence remains available for consumers that require it. Compact schemas reduce tool-description overhead without relaxing validation.

Factory adaptation: Atlas retains a project map and decision record; workers receive a task brief, relevant paths, acceptance criteria, dependencies, and retrieval pointers. Avoid sending the full portfolio history to every bot. A summary must retain links to underlying evidence and identify omissions.

Source: https://github.com/morluto/rea/blob/main/docs/mcp-contracts.md
Source: https://github.com/morluto/rea/blob/main/src/server/toolResult.ts

### 3. Completion requires matched proof
Reconstruction obligation ledgers tie closure to an owner, fixtures/cases, verifier results, evidence, implementation digest, and obligation revision. Missing evidence, contradictions, and unmet dependencies prevent closure. An empty input is not readiness.

Factory adaptation: each feature has one accountable owner and explicit acceptance criteria. Verity verifies the exact implementation revision. A later code change invalidates affected verification. Integration checks cover interactions between features, beyond isolated worker checks.

Source: https://github.com/morluto/rea/blob/main/docs/reconstruction-obligation-ledgers.md
Source: https://github.com/morluto/rea/blob/main/src/application/ReconstructionObligationLedgerEvaluation.ts

### 4. Separate availability from catalog entries
Declared capability and live provider readiness are different concepts. Discovery should explain unavailable or unsupported candidates rather than turn configuration into assumed capability.

Factory adaptation: choose Codex/OpenCode models from the live authorized controls at task time. Record why a model fits the task and whether it actually ran. Cached model lists do not establish runnable availability. REA does not implement this LLM routing for us.

Source: https://github.com/morluto/rea/blob/main/docs/capability-composition.md
Source: https://github.com/morluto/rea/blob/main/src/domain/providerSelection.ts

## Testing assessment
The repository describes source, boundary, compiled acceptance, Python, live-provider, and mutation-testing lanes, plus static/documentation/catalog guards. This is a substantial verification structure, but the presence of tests or workflows is not evidence they passed.

The readiness documentation explicitly distinguishes static CLI/MCP parity and a synthetic nine-stage evaluator from real end-to-end proof. Synthetic readiness does not establish runtime equivalence, cleanup, or reconstruction closure.

Windows uses curated coverage; broad Linux-oriented tests may rely on POSIX assumptions. Native workflows also depend on engines, compatible runtimes, and Windows native support. Inspect the prerequisites for the chosen capability before attempting a pilot.

Source: https://github.com/morluto/rea/blob/main/docs/testing-lanes.md
Source: https://github.com/morluto/rea/blob/main/docs/reconstruction-readiness.md
Source: https://github.com/morluto/rea/blob/main/package.json

## Recommended factory design
Atlas: portfolio understanding, project registry containing arbitrary absolute project paths, outcome planning, dependencies, task-time model selection through supported controls, and final acceptance.
Forge: bounded implementation tasks in the actual project workspace, with relevant context and reproducible checks.
Verity: independent acceptance and integration verification of the exact revision.
REA: optional investigative capability called by an assigned worker when packaged artifacts, binary analysis, or observed runtime behavior require it.

Create feature workgroups only for substantial independent work. A feature packet should contain: goal, repository path/revision, scope, acceptance criteria, relevant code and decisions, dependencies, owner, chosen execution provider/model and rationale, evidence location, and completion status.

Do not mirror REA's full engine registry or reconstruction subsystem just to manage ordinary projects. Start with project/task records and evidence links; add machinery only where repeated work demonstrates a need.

## Suggested pilot, not performed
Choose one authorized concrete investigation involving an Electron package, native artifact, or behavior unavailable from source. Select the smallest applicable capability and existing prerequisites. Require an evidence-backed answer with explicit unknowns and compare its usefulness and cost with ordinary source/browser tools. Only then decide whether to install/register REA for specific agents.

No installation or model/team configuration changes were made during this review.

Skill source: https://github.com/morluto/rea/blob/c3647ade1e557c4179a8b825a37e0c2193cd2526/.agents/skills/reverse-engineer-anything/SKILL.md

