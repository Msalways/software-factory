# Pipeline, gates and handoffs
Updated: 2026-11-10. Source: docs/factory-steps-2026-11-10.md. Patterns adapted from Super Simple Software Factory (default-fail gates), outsourcerer (done-contract and merge lock; ideas only), Bernstein (janitor checks), Gas Town (merge queue).

## Pipeline
Intake -> Understand -> R&D -> Design (UI work only) -> Slice -> Route -> Execute -> Verify -> Integrate -> Release -> Learn.
Each arrow is a gate. **A gate fails by default** and passes only on recorded evidence. An agent saying "done", "fixed" or "verified" is a claim, not evidence. Small fixes go through the same gates in a short form; they do not skip them.

| Gate | Passes when |
|---|---|
| Intake | The project is registered in factory memory (path, default branch, test commands, location of `DESIGN.md`) and the request has an outcome and acceptance IDs. |
| Understand | A session capability snapshot and a fresh schema-2 project provider snapshot exist (default maximum 60 minutes, catalog stale threshold 24 hours with valid live capture required). Authorization, provider tier, task capability and exact dispatch/cost permission are checked separately. Current source fingerprints/hash/expiry must match; captures are attestations and cannot add models. Actual engine/model/effort is provider-acknowledged or explicitly unconfirmed, never inferred from defaults or ledger. Unknown required choices stay held. Run the session-start audit. |
| R&D | No slice depends on an unresolved decision that would change it. Held decisions record evidence, a conservative defer/hold option and a deadline; absence of an answer never grants authorization or spend. |
| Design | For UI slices, the plan design review passes (design-and-e2e.md). Other slices record "no UI surface". |
| Slice | Each slice has a requirements profile, a done-contract and dependency edges, and fits the size cap. The integration slice is planned. |
| Route | The exact profile and current schema-2 preflight/check permit the dispatch; its receipt records snapshot/profile bindings and any exact user premium permission. No held choice proceeds. Requested identity and provider-acknowledged actual identity are separate; unconfirmed execution remains explicit. |
| Verify | A verifier other than the builder, preferably on a different engine, confirms every done-contract item on the tested revision. |
| Integrate | Combined acceptance passes on the integration revision after each merge. |
| Release | design-and-e2e.md release items are present, and the PR body contains the evidence. |

## Held decisions
Record the question, evidence, conservative defer/hold option, consequence and deadline. Unknown authorization, tier, capability, price comparison or dispatch/cost permission stays held if the user declines or does not answer. A timeout never grants consent, premium tier or spend. Only ordinary reversible choices that do not cross these boundaries may use a previously authorized default.

## Done-contract (every slice)
Written in the slice spec before dispatch:
1. **Commands** that must pass (exact, using the project's own test stack).
2. **Expected change surface:** the files or modules expected to change. Anything outside it must be explained.
3. **Required artifacts:** `evidence.json` (shared/templates/evidence.json), plus screenshots at the agreed viewports for UI work.
4. **Revision:** a commit on the slice branch with a clean working tree.

## Verify gate checks (janitor)
Run `node tools/factory-gates.cjs check <worktree> <evidence.json> --run` (add `--ui` for UI slices). The verifier checks concrete signals and does not take the worker's summary on trust:
- `artifacts_exist`: the commit exists, the tree is clean, and `evidence.json` plus any required screenshots are present.
- `diff_matches_claims`: the actual diff matches the claimed changes and stays within the expected change surface.
- `tests_pass`: the verifier re-runs the done-contract commands itself on the tested revision.
- For behaviour: the primary journey and one failure or recovery path, through real product boundaries.
Any code change after verification invalidates the affected results.

## Handoffs (envelope only)
Before the first dispatch in a room, and after a phase or authorization change, check that the receiving bot and room bulletin permit the current work. Resolve stale scope through the native authority before sending a worker run. A kickoff message does not override a narrower standing scope.

The worker that runs an external provider owns its launch, session, process observation and checkpoint in its own thread/worktree. Do not launch a process in the Lead's thread and hand its process handle to a worker: handles may be thread-local. Hand off durable session IDs, file paths, logs and verified status instead. Use a supported engine command before building a custom launcher; obtain required permissions through the normal controls.

Between steps and sessions, pass an envelope rather than the whole conversation history: slice spec pointer and version, baseline revision, allowed scope, done-contract, relevant source pointers, prior attempt summary, and continuation packet if one exists. The receiver works from the envelope plus the repository.

## Failure classification
Classify every failed attempt before acting. Retrying without diagnosis is not allowed.
| Class | Typical signal | Action |
|---|---|---|
| Transient | timeout, 5xx, one 429 | Retry the same still-valid permitted route once with backoff; if its preflight or permission expired, hold and recheck. |
| Limit | usage, session or quota window exhausted | Checkpoint progress and exclude the blocked route. A replacement requires the full fresh preflight and applicable permission; otherwise hold. No automatic premium/paid fallback. |
| Broken route | engine or model errors, unusable output | Mark the route bad for this slice; any next candidate needs the same authorization/evidence/capability/permission guard. |
| Too big | context overflow, room inactivity timeout, partial output | Split the slice (back to the Slice gate). |
| Spec problem | contradictory or missing requirement | Return to R&D or the Lead. Do not guess. |
| Repeated | same class twice | Ask for bounded guidance, a corrected brief or specific permission. Two failures alone never approve premium, effort/account changes or spend. A third failure goes to the Lead, then the user. |
Every attempt, its class and the action taken stay in the slice history.

## Integration: merge queue
- One slice merges at a time into the integration worktree. Hold a merge lock while merging and re-checking.
- After each merge, re-run the combined checks before taking the next slice.
- A conflict touching a shared contract goes back to the slice owner as rework. Do not hand-patch it during integration.
- Feature acceptance runs on the final integration revision.

## Role boundaries
- **Lead:** intake, slicing, routing, fallback decisions, integration. **Never implements and never designs.** When routes fail, it fixes routing, splits work or escalates. It does not take over the slice. Under release pressure, a root-cause fix returns to a slice and is not patched directly.
- **Designer:** `DESIGN.md`, the plan design review, variants for new surfaces, and the live design review.
- **Builders:** one slice per session, delivering the done-contract evidence.
- **Verifier:** the gate checks and screenshots. Independent of the builder, and does not fix what it verifies.

## Cleanup: worktrees (Integrate, Release and Learn)
Slice worktrees are temporary. Each one holds a full checkout and often `node_modules` and build output, so they pile up fast.
- **One worktree per running slice.** Create it at dispatch, record its path in the slice ledger, and never reuse it for another slice.
- **After Integrate:** once a slice is merged into the integration branch and the combined checks pass, the Lead removes that slice's worktree.
- **After Release** (PR merged): remove the integration and release worktrees, then delete merged branches with the safe delete.
- **Janitor sweep** at every Learn step, and at the start of each new feature: `node tools/factory-worktrees.cjs clean <repo> --gh`, which is a dry run. Review the output, then add `--apply --delete-branch`.
  - **remove:** merged (an ancestor of the base branch, or a merged PR) with a clean tree and nothing unpushed. These are removed automatically.
  - **stale:** pushed, unmerged and idle for at least 7 days. Not removed automatically: the Lead asks the slice owner, or the user if it is unowned, then runs with `--include-stale`.
  - **keep:** uncommitted changes, unpushed commits, or locked. Never removed by the janitor. Report them as follow-ups: commit and push, or the owner abandons them explicitly.
- Never use `git worktree remove --force` or `git branch -D` on factory work without the user's explicit OK. Removing a worktree keeps its branch and commits.
- The Learn step records in the feature ledger which worktrees were removed and which were kept, and why.

## Mentor/worker handoff
The Slice gate requires a project-local slice-brief.md with goal, interfaces,
pitfalls, exact acceptance checks, mentor-question protocol and escalation rule.
The Lead prepares the brief; a worker executes in its own thread/worktree on an
owner-authorized worker route. Premium orchestration and review remain mentor work.
The worker asks bounded questions in its own thread; guidance is not a takeover.
Only two failures of the same check or a disproven brief justify a premium
escalation request. Record the reason and actual execution. Rooms contain status,
decisions and blockers; detailed reasoning and implementation stay in owned threads.

Before worker dispatch, run node tools/factory-gates.cjs brief <project-brief>. The gate rejects missing or unfilled required sections. Record the brief path as evidence.brief so verification checks it too. This is a structural gate; the Lead still reviews whether examples, signatures and expected results are sufficient.
