# Feature control
One concise record per project or active feature; link detailed evidence rather than duplicating it.

## Project/portfolio
- Project ID, purpose, actual source location and integration branch/revision:
- Priorities and active features:
- Shared contracts/components and cross-feature conflicts:
- Current execution/review capacity and supply snapshot (ready engines, limits observed, time):
- Design system (DESIGN.md location/version) and Designer:
- Last reconciliation, evidence source and next action:

## Requirements and R&D
- Feature ID, goal, users, constraints, scope and exclusions:
- Requirement IDs and acceptance criteria:
- Current capabilities, evidence and unknowns:
- Research question | finding/evidence | confidence/limits | decision:
- Architecture decision, alternatives, impact and revisit condition:
- Slice dependency edges and integration plan:

## Slice ledger
| Slice ID | Outcome / requirement IDs | Depends on | Profile (complexity / needs / budget) | Owner | Routed engine/model/effort (receipt) | Session/thread ID | Workspace / baseline | State | Attempts / fallbacks | Last checkpoint & source | Gates (artifacts / diff / tests) | Blocker / next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

## Slice brief (repeat only for dispatched slices)
- Parent feature and testable outcome:
- Relevant context/source pointers and baseline:
- Scope, contracts, shared-file ownership and exclusions:
- Prerequisites and acceptance checks:
- Selected engine/model, rationale and actual execution confirmation:
- Session/workspace and integration owner:
- Checkpoint / handoff / completion evidence:
- Attempt history, failure class (gates-and-handoffs.md) and next action:
- Continuation packet pointer, if handed off:

## Held decisions
| Question | Default | Consequence of default | Deadline | Status |
|---|---|---|---|---|

## Merge queue
| Order | Slice | Verified revision | Merged at | Combined checks after merge |
|---|---|---|---|---|

## Feature acceptance
- Integrated revision:
- Requirement -> slice -> verification evidence:
- Combined E2E/regression results and independent reviewer:
- Unresolved issues, excluded checks and user decisions:
- Release readiness, smoke/recovery evidence where applicable:


## Isolation and routing
- Native project room ID and scope:
- Feature room/session ID and verified members:
- Dedicated/shared workers and observed concurrency constraints:
- Actual project path, feature/slice IDs and workspace checked before dispatch:
- Memory namespace and last reconciled version:

