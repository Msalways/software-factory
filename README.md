# Software Factory

Coordination workspace: the folder this repository is cloned into (the factory root, `FACTORY_ROOT`). See INTEGRATE.md to connect it to Hattera. Project source code may live anywhere the user chooses; this is not a development root.

## Use it in Hattera
See [INTEGRATE.md](INTEGRATE.md). Short version: clone this repository, run `node tools/build-hattera-package.cjs`, then import `dist/software-factory.openmaus.json` in Hattera. That adds the four bots, their standing instructions (pointing at your clone) and the delivery skill.

## Team
- **Atlas** (Lead, Chief of Staff): intake, R&D, slicing, routing, integration and worktree cleanup. Never implements or designs.
- **Muse** (Designer): DESIGN.md, the plan design review, and the live screenshot review.
- **Forge** (Builder): one slice per worktree, against a done-contract.
- **Verity** (Verifier): independent gate checks and journeys.

Roles carry no fixed model. Each slice is routed from live supply (see dynamic-execution.md); bot defaults are only starting settings.

## Folder layout
- docs/: factory operating plan and decisions.
- projects/: project registry and brief records only, with pointers to each actual source location; repositories need not live here.
- shared/standards/: reusable engineering and quality standards.
- shared/templates/: feature briefs, slice specs, DESIGN.md, evidence.json and handoffs.

**Tools** (Node 22.6+, no dependencies, no model calls): `tools/factory-route.cjs` (supply, routing, limits, outcomes), `tools/factory-gates.cjs` (verify gate), `tools/factory-worktrees.cjs` (worktree janitor), `tools/factory-sync.cjs` (project team updates, see INTEGRATE.md), `tools/factory-memory.cjs` (project memory) and `tools/build-hattera-package.cjs` (Hattera package). Tests: `npm test`. See dynamic-execution.md §3a and gates-and-handoffs.md (Cleanup).

**Start here (2026-11-10):** [pipeline and gates](shared/standards/gates-and-handoffs.md) — Intake → Understand → R&D → Design → Slice → Route → Execute → Verify → Integrate → Release → Learn, each gate default-fail. Rationale: [factory steps](docs/factory-steps-2026-11-10.md), [trial review](docs/factory-review-2026-11-10.md), [public-repo R&D](research/software-factory-rd-2026-11-10.md).
- research/: source links and research findings.
- artifacts/test-evidence/: reports tied to project and tested revision.
- artifacts/releases/: release summaries and approved deliverables.

Register each actual project location by absolute path or repository URL. Record its purpose, source revision, relevant context links, build/test commands, active work, and decisions. Inspect and work in its existing location within granted permissions; do not relocate or copy projects merely to fit this folder structure.

## Delivery
Request -> current-state investigation -> requirements gap analysis -> architecture decision -> scoped implementation -> independent feature verification -> integrated regression checks -> release under the user's authorization.

Each feature record includes its outcome, owner, scope, dependencies, interface contracts, acceptance checks, revision, evidence, and unresolved issues. Parallel workers use isolated workspaces. Test records identify the build, environment, commands, passes, failures, and skipped checks.

## Context
Factory context contains shared standards and project pointers. Project context contains goals, architecture, decisions, and build/test instructions. Feature context contains acceptance criteria and progress. Workers load only relevant context and return concise summaries with evidence links.

## Storage status
This folder contains the saved factory plan and output structure. Creating it does not relocate Hattera's application state, private bot memories, existing conversations, or bot working-directory settings. No previous files were moved.

## On-demand agent and model selection
Roles define responsibilities, not permanent provider/model assignments. Before dispatch, Atlas checks the live authorized agent and model catalog and chooses a suitable available option for the task complexity, context, tools, reliability, latency, and cost. No skill contains a fixed model routing table. Record the selection and reason with the task; reassess after failures or changed availability. Saved model caches are discovery clues, not proof of runnable access. Use supported selection controls and report catalog gaps explicitly. A bot default change affects new threads and does not reroute an existing thread. Dynamic selection remains an operating requirement until supported runtime controls and availability have been verified.

## Orchestrator responsibility
Atlas understands a project before assigning implementation, maintains a portfolio view, challenges unclear requirements, weighs alternatives, tracks dependencies, and delegates bounded outcomes. It makes routine decisions within authorization and returns meaningful tradeoffs or genuine blockers to the user. Independent verification and integrated test evidence determine completion.

## Project understanding workflow
The operating workflow is [project-understanding.md](shared/standards/project-understanding.md); use [feature-brief.md](shared/templates/feature-brief.md) for scoped work. REA can supply artifact/runtime evidence for gap analysis and architecture decisions when relevant. Installation and runtime availability have not been verified. Atlas owns the decisions and selects available execution models at task time.



## Execution engine choice
See [dynamic-execution.md](shared/standards/dynamic-execution.md). Each slice is routed from live supply (every ready engine; nothing hardcoded) with quota/context preflight, a routing receipt, and automatic fallback. Bot defaults are starting settings.


## Design and end-to-end delivery
Read [capability review](docs/capability-review.md) for verified status and remaining gaps. The [delivery skill](shared/skills/factory-design-to-delivery/SKILL.md), [design/E2E standard](shared/standards/design-and-e2e.md), and [design/verification contract](shared/templates/design-and-verification.md) connect user journeys, interface design, implementation, independent testing and release recovery. Skills load per task; execution providers/models remain dynamically selected. Operational E2E delivery requires proof in an actual project.


## Engineering quality
[Root-cause and architecture standard](shared/standards/engineering-quality.md): substantial outcomes take priority over quick output. Diagnose the mechanism, trace impact, repair the correct responsibility boundary, and verify regressions and affected integrations. Model effort follows task needs. Efficiency reduces waste, not necessary investigation.


## Requirements and multi-feature orchestration
[Requirements/R&D and slicing](shared/standards/requirements-and-slices.md) defines Atlas's discovery, dependency planning, session handoffs, monitoring and integration responsibilities. Use the [feature control record](shared/templates/feature-control.md) to track multiple features and their slices with actual execution IDs and evidence. No background service or unverified parallel-session capability is implied.


## Persistent memory
The [project memory guide](docs/project-memory.md) documents tools/factory-memory.cjs and state/memory.sqlite3. Local storage, version conflicts, atomic history, scoped context and backup recovery are tested. Agent-event capture is explicit, not automatic; adoption by a real application remains pending.


## Isolated project groups
The user selected a separate native team/section per project, with its own Chief and feature rooms as subgroups, scoped slice sessions and project memory. Follow [project-isolation.md](shared/standards/project-isolation.md). Atlas coordinates the portfolio; execution capacity and workers are provisioned against actual projects. Project sections contain flat feature rooms; deeper nested rooms are not assumed. Cross-team coordination access must be verified. No automatic provisioning service is implied.


