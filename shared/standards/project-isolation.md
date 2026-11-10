# Project and feature isolation
Updated: 2026-11-06
User decision: projects must have separate groups and independently scoped feature work to avoid mixed context and enable parallel delivery.

## Structure
Use native project teams/sections as the top-level project boundary. Within each project section, its own Chief creates a project overview room and separate feature rooms. Feature rooms are the visible subgroups; slices are scoped execution sessions and memory records within a feature, not invented deeper UI nesting.

Software Factory (portfolio section)
  Atlas: priorities, cross-project dependencies, portfolio summaries
Project A (separate team/section)
  Project A Lead (Chief), project implementation and independent verification capacity
  Overview / Architecture room
  Feature / Authentication room -> scoped slice sessions
  Feature / Reporting room -> scoped slice sessions
Project B (separate team/section)
  Project B Lead (Chief), independent project execution capacity
  Overview / Architecture room
  Feature / Sync room -> scoped slice sessions

Names above illustrate the layout; no Project A/B teams have been created.
Keep project details, requirements, R&D, architecture decisions and feature evidence in their own project namespace. The portfolio receives concise summaries and explicit dependency contracts.
Create dedicated project leads and workers according to actual workload; feature specialists are added when parallel capacity/expertise requires them. Existing Forge/Verity remain factory resources and are not silently moved between projects. Roles do not hardcode execution models.
Discover existing teams/rooms first. Create new project teams and scoped specialists via native combined setup controls. Each project Chief manages rooms in its own section. Cross-team access is explicit: creating a section does not automatically authorize Atlas to coordinate it. Verify reachability and use an authorized Chief to relay scoped work when required; report missing access rather than claiming a hierarchy grants it.
Record actual team names, Chief/member IDs and room IDs after successful setup. A room creates no execution by itself.

## Onboarding
1. Obtain the real project name, absolute source path and requested outcome. Inspect local project instructions and actual source within permissions. Do not create fictional project groups or relocate code.
2. Register the project with tools/factory-memory.cjs. Choose a stable project ID and record the actual source path.
3. Discover authorized teams, rooms, reachable bots and live execution options. Create or reuse the project team/section with its project Chief and necessary workers through native setup. The project Chief creates the overview and feature rooms within its own section. Verify portfolio-to-project coordination access explicitly. Follow exact tool scopes, applied/pending results and permissions.
4. Record room IDs, actual member IDs, project baseline and evidence in the application record. Creation pending or failed is not configured. These files are not an automatic provisioning service.
5. Clarify requirements, do R&D and plan slices before implementation. For concurrent independent features create distinct scoped rooms/sessions and execution workspaces using supported controls, recording the returned identities.

## Workers and parallelism
Separate conversation rooms do not guarantee separate simultaneous worker capacity. Discover real runtime capacity and routing behavior. Outside a room the currently observed native handoff reuses a recipient's thread; do not dispatch unrelated parallel slices into that shared thread.
Use dedicated project/feature workers where shared workers serialize work, mix context or lack isolation. Create the smallest useful set according to the user's request and actual work, using one combined native setup plan for required specialists, scoped roles, working folders and live catalog defaults. Do not create permanent bots for every tiny slice. Default model settings bootstrap sessions; execution selection remains task-specific across supported Codex/OpenCode routes.
Each independent task gets project ID/path, feature/slice IDs, baseline, scope, dependencies, acceptance criteria and only relevant memory. Never send all projects' context to every worker. Resolve cross-project dependencies through an explicit contract/evidence summary.
Workers use isolated branches/workspaces for concurrent edits. Shared schema/interface changes are sequenced or explicitly coordinated. Verity checks the combined project revision and affected interactions independently.

## Memory and scope
Every record is keyed by project plus kind and ID in the memory store. Feature-associated records carry feature_id. Room/session IDs, provider/model and workspace are actual observed values, never inferred from display names.
Before each dispatch or resume, check project path, IDs, relevant local changes and memory version. Stop a mismatched dispatch before edits. Records are logical namespaces in a trusted local store, not a security boundary: access remains governed by native tools and filesystem permissions.
Atlas reconciles checkpoints, blockers and integration evidence into the project's feature records. Keep concurrent project summaries separate. No automatic background monitoring or provider routing is implied.

## Completion of setup
A project is configured only after its native team/section, project Chief, overview/feature rooms, memory registration and coordination access are confirmed; execution identities are recorded when work starts. Parallel capability is verified only after independent tasks are actually observed executing in isolated sessions/workspaces. Application acceptance still requires integrated evidence; group creation alone proves neither concurrency nor delivery.


