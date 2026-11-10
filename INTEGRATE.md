# Integrating the Software Factory into Hattera

The factory has two parts:
- **The repository** (this folder): standards, templates, skills and Node tools. Bots read these files at run time, so a clone has to exist on the computer where the bots work.
- **A Hattera package** built from it: `dist/software-factory.openmaus.json`, in Hattera's own `openmaus.package` v2 format. It adds the four bots, their standing instructions (pointing at your clone) and the `factory-design-to-delivery` skill.

## Requirements
- Hattera on the same computer as the clone, with bots that can run shell commands (git and node) in project workspaces.
- Node 22.6 or later (the memory tool uses `node:sqlite`), and git.
- Optional: the GitHub CLI (`gh`). The worktree janitor uses it to detect merged PRs. Set `FACTORY_GH` if `gh` is not on PATH.

## 1. Clone and check
```sh
git clone https://github.com/Msalways/software-factory.git
cd software-factory
npm test          # runs the tool tests; no dependencies to install
```
The clone folder is the **factory root**. Runtime data (`state/`, `artifacts/`, `backups/`) is created there and is git-ignored.

## 2. Build the package
```sh
node tools/build-hattera-package.cjs
# options: --root <factory root>   (default: this clone)
#          --hattera <Hattera source dir>   validates with Hattera's own package parser
#          --souls   also writes dist/souls/<key>.SOUL.md
```
The package is built per computer because the instructions name the factory root. `dist/` is git-ignored.

## 3. Add it to Hattera
**New setup.** In Hattera, import `dist/software-factory.openmaus.json` as a team package. You get:

| Bot | Role | Skill |
|---|---|---|
| Atlas | Lead and team Chief | factory-design-to-delivery |
| Muse | Product Designer | factory-design-to-delivery |
| Forge | Implementation Engineer | factory-design-to-delivery |
| Verity | Verifier | factory-design-to-delivery |

Imported bots start on Ask approval. The package sets **no models**: pick each bot's default in Hattera. The Lead routes each slice from live supply anyway (`shared/standards/dynamic-execution.md`). Spreading the bots across engines helps, because Hattera's handoff runs on the receiving bot's own model.

**Bots already exist** (for example from an earlier setup). Don't import a second copy. Run the build with `--souls` and update each existing bot's standing instructions from `dist/souls/<key>.SOUL.md` (lead = Atlas, designer = Muse, builder = Forge, verifier = Verity). You can ask your Chief of Staff to apply them. Add the skill to each bot from `shared/skills/factory-design-to-delivery`.

## 4. Point the factory at a project
Tell Atlas the project path or repository and the outcome you want. Atlas registers the project in factory memory (`tools/factory-memory.cjs`), writes the capability snapshot, and asks Muse for `DESIGN.md` on the first UI work. Each slice then runs through the gates in `shared/standards/gates-and-handoffs.md`.

Recommended: allow these read-mostly commands for the factory bots, so routing and gate checks don't prompt every time:
`node <factory root>/tools/factory-route.cjs *`, `node <factory root>/tools/factory-gates.cjs *` and `node <factory root>/tools/factory-worktrees.cjs list *`.
Keep `factory-worktrees.cjs clean ... --apply` behind approval.

## 5. Keep worktrees clean
Each running slice gets its own worktree, and they add up quickly (full checkout, `node_modules`, build output). The Lead's instructions include the cleanup rules (gates-and-handoffs.md, "Cleanup"). You can also run the janitor yourself:
```sh
node tools/factory-worktrees.cjs list  <repo> --gh            # classify: remove / stale / keep
node tools/factory-worktrees.cjs clean <repo> --gh            # dry run
node tools/factory-worktrees.cjs clean <repo> --gh --apply --delete-branch
```
- **remove:** merged, clean and pushed. Removed by `--apply`.
- **stale:** pushed and unmerged, but idle for at least 7 days (`--stale-days`). Removed only with `--include-stale`.
- **keep:** uncommitted or unpushed work, or locked. Never removed.

The janitor never force-removes a worktree and only uses `git branch -d` (safe delete).

## Configuration
| Setting | Default | Purpose |
|---|---|---|
| `FACTORY_HATTERA_HOME` | `~/.openmausbot` | Hattera data folder (engine catalogs, usage) read by `factory-route` |
| `FACTORY_STATE_DIR` | `<root>/state/routing` | Routing state: supply snapshots, limit events, outcomes, receipts |
| `FACTORY_GH` | `gh` | GitHub CLI executable used by the worktree janitor |
| `state/routing/route-policy.json` | none | Optional. Copy `shared/templates/route-policy.example.json` and keep only engine-reported or user-given facts |

## Updating
```sh
git pull
npm test
node tools/build-hattera-package.cjs --souls
```
Then re-apply `dist/souls/*` to the factory's own bots, as in step 3. The release number is in `hattera/package.json`, and `CHANGELOG.md` lists what changed in each release. Bump the release whenever bot instructions or skills change.

## Keep project teams up to date (factory sync)
For each project, Atlas creates a project team: a Lead, a Builder and a Verifier, with their own rooms. These bots also need factory updates. Sync gives them updates without touching anything the project has built up.

| Factory-owned (replaced on update) | Project-owned (never changed) |
|---|---|
| The block between `<!-- factory:begin -->` and `<!-- factory:end -->` in each project bot's instructions and room bulletin | All other text in those instructions and bulletins (the project notes) |
| Skills whose folder is in `shared/skills` (`factory-*`) | All other skills, bot MEMORY.md and conversations |
| The `application/factory` record in factory memory | All other memory records, DESIGN.md, ledgers, evidence, branches and worktrees |

```sh
node tools/factory-sync.cjs status                 # which version each project last synced; "legacy" = never
node tools/factory-sync.cjs plan <project>         # read-only; writes state/sync/<project>/<version>/
node tools/factory-sync.cjs record <project> state/sync/<project>/<version>/plan.json
node tools/factory-sync.cjs render lead --project <id> --path <dir>   # instructions for a new project bot
```
1. `plan` reads Hattera's data (bots, rooms, skills) and the project's memory. It writes nothing to Hattera. For each bot it renders the new instructions (`<role>.SOUL.md`) and the room bulletins, and lists the skills to install or update. It finds the bots from the `application/factory` record, then from `application/native-setup`, then by name in the project's section.
2. Apply the plan through Hattera's native setup (approval card), via the project section's Chief or Atlas. Never edit Hattera's files by hand.
3. `record` checks that the live bots, rooms and skills now match the plan. It then backs up factory memory and writes `application/factory` (version, hashes, bot IDs). This is the only memory record it changes.

**Projects set up before sync** have no markers and no `application/factory` record, so `status` shows them as `legacy`. `plan` adopts them: the new factory block goes first, and the bot's whole old text is kept word for word below it as project notes. After the first sync, only the block changes.

**Hand edits inside the block** are a conflict. `plan` exits with code 4 and puts the edited block in `plan.json`. Move project-specific rules below the block, then re-run, or run with `--accept-edits` to overwrite them. A bot that would go over Hattera's 24,000-byte limit is also a conflict.

## What lives where
| Path | What |
|---|---|
| `hattera/agents/*.md` | Bot standing instructions. `{{FACTORY_ROOT}}` is filled in at build time |
| `hattera/package.json` | Package metadata, team brief, bot list |
| `shared/skills/*` | Skills packaged into Hattera |
| `shared/standards/*`, `shared/templates/*` | What the bots read while working |
| `tools/*.cjs` | Routing, gates, worktree janitor, memory, package builder |
| `docs/`, `research/` | Rationale, trial review, public-repo R&D |
