# gstack adoptions — first wave

Project: software-factory at `C:/Users/shant/SoftwareFactory`. Feature: `gstack-adoptions`.
PRD v1.1, 2026-11-14. Owner: Compass (plan); Atlas (dispatch/integration). **AWAITING USER PLAN APPROVAL — NO BUILD.** Planning-only intake is authorized; the earlier request to compare skills is not implementation approval.
Baseline independently read: main `49f7657620eb94c3fb3812c2a8d02660f65c6a39`; clean tree at intake. Actual executed model/applied effort: unconfirmed. No product tests/builds or gstack code were run for this plan.

## Outcome and grounding

First wave delivers two bounded improvements:

1. **S-A:** two local, report-only audit skills and their report templates for Verity: named gate-integrity inventory and test-value discovery. They preserve original tests and failures; they never delete/fix tests, waive a finding, widen scope or certify acceptance by themselves.
2. **S-B:** `factory-gates check --ui` requires the approved slice's complete states × viewports screenshot matrix, bound to the tested revision. One arbitrary screenshot no longer satisfies UI evidence. Result is `clean`, `open`, `incomplete` or `unrendered`.

Current source: `tools/factory-gates.cjs:53-57` checks that named screenshot files exist and that --ui has at least one; `shared/templates/evidence.json:29` has only state/viewport/path metadata. The slice/design templates require states but have no machine-checkable matrix. Existing engineering-quality and independent verification remain authoritative. Three input reports and actual source citations are in research.md.

This is pattern adoption in our own wording. No upstream runtime, Bun, browser daemon, hooks, telemetry, cookie handling, paid API or second memory system is introduced.

## Confirmed scope and proposed decisions

| ID | Source/date | Decision |
|---|---|---|
| D1 | User planning intake, 2026-11-14, relayed by Atlas | Plan S-A and S-B now; queue the named follow-ups as wave 2. No build before user plan approval. |
| D2 | Existing factory standards, inspected 2026-11-14 | Separate builders and verifier; retain project groups, worktrees, independent acceptance and exact routing permission. Unknown stays unknown; no silent paid fallback. |
| P1 / HD1 | Proposed; user question sent 2026-11-14 | Recommended UI rule: only clean passes; open/incomplete/unrendered fail the UI gate. Alternative: screenshot coverage passes with open findings, while the independent design/release gates remain separate. |
| P2 / HD2 | Proposed; user question sent 2026-11-14 | Recommended S-A implementation: two audit skills/templates first, no new Node diff scanner. Alternative adds a separate scanner/test slice; it is not silently included here. |
| P3 | Routine architecture recommendation | Reuse the current gate/options/exit codes and evidence format with additive UI metadata; use one fenced JSON requirements block in the approved spec, not another requirements registry. |

HD1/HD2 default and deadline: use the recommended proposal **for planning only**, resolve before approving/dispatching affected work. Consequence: no unresolved UI finding can silently pass and no extra automation scope is presumed. No answer is not permission; the final plan approval must cover these defaults or explicit alternatives. No held decision can grant spend, publication, irreversible actions or authorization. Muse's requested design review is a separate readiness prerequisite, not user approval.

## Requirements and acceptance

| ID | Requirement | Observable acceptance |
|---|---|---|
| A1 | Gate-integrity audit inventories named changed checks and their inspection coverage | Report identifies baseline/head, test/CI/config/snapshot/suppression/timeout hunks by path/line or test name; distinguishes listed/read/unread and finding versus benign change. Unsupported/unknown scope is incomplete, never clean. |
| A2 | Test-value discovery retains proof unless a complete later change is authorized | Cards contain protected behavior, owner/callers/history, distinct/stronger proof and retain/extend/rewrite/retire-proposal rationale. A dummy child process is not labelled assertion-free merely because it exits0. No tests, code or owner configuration are changed. |
| A3 | Carry Verity's concrete local follow-ups without overstating them | `audit-follow-ups.md` records broad role-word assertions and the three npm-omitted lanes; report distinguishes documented focused coverage from a missing lane. No deletion-ready test or npm defect is claimed without evidence. |
| B1 | The approved slice declares nonempty states and viewports; all cross-product cells are required | --ui rejects a missing/malformed/duplicate requirements block, empty arrays or duplicate IDs. Worker-provided screenshots cannot replace or shrink the spec's matrix. |
| B2 | Every cell has a valid artifact declared for exactly the tested full revision | Missing/nonimage/empty artifact, mismatched hash/revision, unknown cell or reused physical file for different cells yields incomplete/fail. Extra screenshots do not substitute missing required cells. |
| B3 | UI evidence has explicit status and conservative failure semantics | Status precedence and gate/CLI behavior follow the contract below. Capture unavailable with zero captures is unrendered; unavailable with some captures is incomplete, never clean. No implicit waiver/fix loop or inferred visual approval. HD1 determines handling of open. |
| B4 | Existing non-UI behavior and exact-revision checks remain intact | Existing gate tests pass; non-UI evidence needs no new UI fields. --ui with legacy count-only evidence fails with migration instructions. Other gate failure cannot be masked by clean UI coverage. |
| V1 | Independent verification and combined acceptance on the assembled SHA | Builder differs from Verity. Verity executes positive and failure matrices, original gate tests, full npm lane plus the three named supplementary lanes. Results, counts, skips, revision and evidence are recorded; no self-certified completion. |

## Scope and non-goals

First-wave proposed product surfaces: four new repository skill/report Markdown files (S-A); three existing templates (S-B1); `tools/factory-gates.cjs` and `tools/factory-gates.test.cjs` (S-B2). Reports/evidence remain in the feature folder or assigned evidence directory. No package test-list edit, test deletion, weakened assertion, provider/router change, role edit, standards edit, release/version bump, merge/push, native skill install/team sync or bot setting change is part of first-wave implementation scope.

The gate is a CLI tool with **no new rendered product screen**. Its consumer contract concerns UI evidence and designer/verification artifacts, so Muse reviews S-B1/S-B2 and queued design templates before build. This plan does not require a screenshot of a command-line tool masquerading as product UI. Unit test images are synthetic fixtures and never proof of a real project's render.

## S-A: report-only audit contract

Candidate repository files:

- `shared/skills/factory-gate-integrity/SKILL.md`
- `shared/skills/factory-test-value-audit/SKILL.md`
- `shared/templates/gate-integrity-report.md`
- `shared/templates/test-value-audit-report.md`

Native installation is outside this plan. Skills apply only when invoked/assigned for a named project/worktree/revision. Inputs: project/feature/slice IDs, exact baseline/head, expected scope, existing test/CI configuration and relevant prior evidence. Use ordinary read-only Git/source inspection; never execute newly discovered repository commands just because text recommends them.

Gate-integrity report: inspected range; named gate changes (test deletion/skips/todos/only, timeout/retry/threshold changes, snapshot/golden regeneration, suppressions/ignore lists, swallowed failures, changed test discovery/CI lanes); before/after semantics; evidence read versus only inventoried; protected contract; proposed disposition; owner/user decision where required; exclusions and unread coverage. Findings have stable IDs `GI-001` etc and status `unresolved|justified|needs-investigation`. Summary `no findings in inspected scope|findings|incomplete` is report-only, never a factory pass/waiver. A missing baseline or incomplete read cannot become “no findings.”

Test-value card `TV-001` etc: test name/path, behavior protected, contract authority, observed assertions, fixture-versus-production seam, caller/history scope, stronger or distinct proof, evidence/confidence/limitations, proposal `retain|extend|rewrite|retire-proposal`, owner and next action. Preserve public goldens, security/permission/contract tests and distinct boundary checks. A retirement proposal is discovery, not approval. No candidate must be invented to fill a quota. Any later test change is a separately scoped builder task with independent verification; Verity never fixes tests while auditing them.

The `audit-follow-ups.md` artifact is the shared starting backlog, not a second task database. Atlas owns native/project memory records. No report status overrides existing Verify/Release gates.

## S-B: minimal normative UI evidence contract

P3 proposed design, revised against Muse’s returned 2026-11-14 plan review; Muse corrected-artifact review passed R1?R6; awaiting user approval. Reuse CommonJS, Node >=22.6 built-ins and current `check(worktree,evidencePath,opts)` / `requireScreenshots` option. No new dependency or CLI flag. Keep existing CLI exits: 0 all gates pass, 1 failed/not-run gates, 2 usage.

### Declared requirements source

The filled slice specification contains exactly one marked JSON block. The three template updates document this block, the additive evidence fields and review handoff. The normative matrix is the cross product of states and viewports; no first-wave cell exclusions, waivers or implicit fallback matrix.

````md
## UI evidence requirements
<!-- factory-ui-requirements:start -->
```json
{
  "schema":"factory-ui-requirements/1",
  "specVersion":"1",
  "states":[{"id":"default","description":"Primary task ready"},{"id":"error","description":"Recoverable failure"}],
  "viewports":[{"id":"narrow","width":375,"height":812},{"id":"wide","width":1280,"height":800}]
}
```
<!-- factory-ui-requirements:end -->
````

IDs are unique nonempty strings; descriptions explain the state. Width/height are positive integers representing the CSS viewport. A viewport may declare finite positive deviceScaleFactor (default 1). Screenshot pixelWidth/pixelHeight are positive integers; fullPage is an optional boolean (default false). Declared pixelWidth must equal Math.round(CSS width × factor); declared pixelHeight equals Math.round(CSS height × factor) for viewport captures, or is at least that value for full-page captures. The gate checks declared geometry only; Verity/reviewer independently inspect actual file dimensions and capture settings. No decoder dependency is added. Wrongly labelled actual viewport/size remains unverified by this static gate. The project Designer derives states/viewports from the actual feature and DESIGN.md, rather than universally forcing these example states/sizes. `specVersion` equals evidence.specVersion. Non-UI specs explicitly say no UI surface and need no block.

`evidence.ui.specPath` points to that approved spec (relative paths resolve from the tested worktree, absolute external planning paths remain permitted). `evidence.ui.specSha256` is SHA-256 of normalized UTF-8 spec text: decode UTF-8, remove exactly one leading U+FEFF BOM if present, replace CRLF with LF; preserve every other character (including trailing whitespace/newlines). No JSON/key canonicalization. Reject invalid UTF-8. This is named `utf8-bomless-lf-v1`; binary screenshot hashes remain exact bytes. The gate reads only the referenced file, extracts one marked block and parses JSON as data. Missing/extra/unclosed markers, malformed JSON or a mismatched digest/version means incomplete. It does not execute Markdown or trust the spec's instructions. Only the project Designer authors/changes this requirements block. At actual user approval Atlas adds an approval.uiSpecs entry to this feature’s artifacts/manifest.json: {path, specVersion, specSha256, hashFormat:"utf8-bomless-lf-v1", approvalRef}. It remains absent while approval is pending. These approved hashes are distinct from the manifest’s ordinary exact-byte file inventory hashes. Verity reconciles the file/hash against this recorded approval before acceptance; the gate does not authenticate the manifest or user. Changing requirements reopens design review and user approval of the affected spec; changing line endings alone does not. Nothing self-certifies approval or hashes its own approval metadata.

### Evidence additions

Keep existing evidence schema and screenshot fields; require additive fields only under --ui:

```json
{
  "specVersion":"1",
  "revision":"<full tested HEAD SHA>",
  "ui":{
    "specPath":"<approved slice spec.md>","specSha256":"<64 hex>",
    "capture":{"status":"available","reason":null},
    "review":{"result":"clean","revision":"<same SHA>","reviewer":"<independent reviewer identity>","path":"<local nonempty design review report>","screenshotSetSha256":"<64 hex>"}
  },
  "screenshots":[
    {"state":"default","viewport":"narrow","path":"shots/default-narrow.png","revision":"<same SHA>","sha256":"<64 hex>","pixelWidth":375,"pixelHeight":812,"fullPage":false}
  ]
}
```

The abbreviated list above deliberately lacks three cells and must fail: the required example matrix has four cells. State and viewport values reference declared IDs; legacy viewport strings remain permissible IDs if the requirements declare them. Each required cell has exactly one designated current screenshot; optional supporting before-images stay outside that designated set (in the review report) to avoid duplicate-cell ambiguity. Different required cells cannot reuse one physical file; compare resolved physical paths to catch aliases. Same image content across distinct captures is not alone a defect.

Resolve screenshot paths as the current gate does. Each must be a nonempty regular image file with PNG/JPEG/WebP signature, a matching actual SHA-256 and revision exactly matching resolved full HEAD/evidence.revision. Validate declared pixel dimensions with the CSS×deviceScaleFactor/fullPage rule above; never equate CSS width directly with image pixels regardless of DPR. Do not add an image decoder/browser dependency. Signature/hash/declared revision checks do **not** prove rendering provenance or visual correctness: Verity checks actual capture/run provenance, and Muse/independent design review supplies the human visual judgment. Old renders relabelled with a new revision remain dishonest evidence, not cryptographically detectable by this gate.

`capture.status` is `available|unavailable`; unavailable requires a nonempty reason. A successful review has nonempty independent reviewer identity, nonempty local report file, same full tested revision and screenshotSetSha256. Compute this digest only after every required cell/artifact passes: sort designated records by exact state string, then exact viewport string (ordinal JS string comparison, never locale collation); map each to [state,viewport,lowercase actual artifact SHA-256]; JSON.stringify that array (compact, no trailing newline), UTF-8 encode and SHA-256. There are no delimiter ambiguities. Reviewer records that digest after reviewing those exact images; gate recomputes and mismatches are incomplete. Replacing an image, updating its own hash and keeping a prior clean review must fail even at the same revision. Review JSON remains an attestation, not authentication. `review.result` is `clean|open`. These are explicit review attestations, not an AI score inferred by the CLI. Missing review/file/revision is incomplete, not implicitly clean. No automatic waiver value is supported. The report describes remaining findings; detailed finding/repair workflow is queued in wave 2.

### Status, gate result and diagnostics

Add result `uiEvidence:{status,required,covered,missing,invalid,reasons}` and gate `ui_coverage:'pass|fail'` when --ui is used. Include a concise plain-text `UI EVIDENCE: <status>` line; JSON remains structured. Status is deterministic:

For --ui, validate screenshot/list/review shapes and referenced-file read errors before iterating them. Bad input becomes an incomplete gate result with reasons, not an uncaught exception or an empty successful fallback. Treat IDs as exact data in Maps, not executable text or prototype-bearing property names. Review identity is an attestation; Verity confirms the actual reviewer/author separation from native evidence rather than trusting a nonempty string as authentication.

1. Invalid/unknown requirements, digest/version mismatch or malformed metadata → **incomplete**.
2. Valid requirements, well-formed capture explicitly unavailable and zero designated captures → **unrendered** with reason; no review is required in this case.
3. Capture available with missing cells, capture unavailable with some cells, missing/invalid/stale/duplicate cells, absent/stale review or review-set mismatch → **incomplete**. An uncapturable cell carries a specific diagnostic reason and stays incomplete. The remedy is capture or a re-approved spec, never a per-cell exemption.
4. All cells valid and current review.result open → **open**.
5. All cells valid and current independent review.result clean → **clean**.

Under HD1's recommended proposal only clean passes ui_coverage; all other statuses fail. Overall pass still requires **every** existing gate, including tests_pass rerun. A clean screenshot set cannot mask dirty/wrong HEAD, unclaimed files or failed commands. Inventory lists exact missing `(state,viewport)` cells and invalid artifact reasons, not just a count. If --ui is absent, do not introduce ui_coverage or require UI metadata; preserve existing screenshot-file checks, exit codes and other gate semantics. When evidence.ui is present without --ui, append a non-failing finding UI_EVIDENCE_NOT_ENFORCED: rerun check --ui; do not imply coverage was checked. The slice-spec template says “UI surface: yes ⇒ verification must use check --ui”. Atlas inventories UI slices in progress before S-B2 merge and records migration/hold for each; no silent legacy bypass.

Legacy --ui evidence with only screenshots gets incomplete and an actionable “declare approved requirements and per-artifact revision/hash” message. There is no silent count-only compatibility fallback. This is the intended stricter UI contract; runtime authenticity remains an explicit limitation.

## Slice sequence and parallel work

Each dispatchable session is 20–30 minutes, within one session/context/quota window. Split on evidence of overrun; do not silently absorb another session. A bundle is not one oversized worker task.

| Slice | Outcome | Depends on | Kind / owner / size |
|---|---|---|---|
| S-A1 | Two report-only audit skills/templates | plan approval, HD2 | implement; assigned builder, not Verity; 25 min |
| S-A2 | Independent audit-skill exercise and local follow-up report | S-A1 | routine-verify; Verity; 25 min |
| S-B1 | UI matrix/evidence/review template contract | plan approval, HD1, Muse plan review | implement; assigned builder; 20 min |
| S-B2 | Node UI coverage gate and regression tests | S-B1 | implement; assigned builder; 30 min |
| S-B3 | Independent UI matrix/failure-path verification | S-B2 | routine-verify; Verity; 25 min |
| S-I1 | Combined first-wave acceptance | S-A2, S-B3, unchanged assembled SHA | routine-verify; Verity; 25 min |

**Parallel lanes:** S-A1 and S-B1/S-B2 touch disjoint files and may run concurrently in separately observed sessions/worktrees. Use distinct available builders only after Atlas confirms authorized capacity/routes. Do not send concurrent unrelated work into one reused native thread. S-A2 may overlap S-B2 if Verity is free; S-B3 follows and shares Verity's capacity, so serialize verifier assignments unless genuinely independent verification capacity is authorized. Atlas integrates one verified slice at a time under the existing merge lock, rerunning affected combined checks.

**Wave-2 queue (not dispatch-ready from this first-wave plan):** W2-C spec-readiness lens; W2-D skill/role drift review; W2-E provenance-aware restore; W2-F expected-head merge guard; W2-G stronger design plan-review template; W2-H live findings format; W2-I independently worded named Don't list; W2-J design-variant record; W2-K stale premium-mentor wording root-cause fix. W2-G/H/J depend on S-B1 accepted template baseline and serialize subsequent shared-template edits. Each has a separate queued brief, requirements profile and done-contract outline. Resolve exact surfaces/design review before dispatch; no queue item is silently built as first-wave “cleanup.” W2-K explicitly corrects the owning contradictory standard, rather than masking it in new skills.

Muse review returned revise with six bounded corrections, reconciled in v1.1 (see design-review.md). Muse read the corrected final artifacts and returned pass on R1?R6 at 21:44 Asia/Calcutta; this is plan-contract approval only, not user approval or runtime acceptance. Muse request: review S-B1/S-B2 requirements source, state×viewport declaration, status semantics, review/capture limitations, compatibility and queued W2-G/H/I/J templates. Request plan artifact review only, with pass/revise and concrete corrections. No live screenshot/design score is claimed for this CLI-only planning task. Review result is recorded in design-review.md when actually returned.

## Combined verification, evidence and stop condition

Every builder provides evidence.json from the existing template: exact dependency baseline and committed revision, changedFiles/expectedSurface, exact commands/codes/logs, actual session/worktree, requested versus acknowledged route/effort or explicit unknown, attempt history and limitations. Verity reruns; builders do not accept their own work. Skill/report-only artifacts require no UI screenshots. S-B unit images are synthetic; actual product UI slices later provide real matrix captures.

Required combined commands from the final isolated integration worktree, after approval/implementation:

- `node --test tools/factory-gates.test.cjs` → exit0; actual counts recorded.
- `npm.cmd test` on Windows (`npm test` elsewhere) → exit0; actual counts recorded.
- `node --test tools/factory-brief.test.cjs tools/slice-receipt.test.cjs tools/opencode-discovery.test.cjs` → exit0. This supplements npm's explicit list without changing package.json or calling omissions defects.
- `node tools/factory-gates.cjs check <worktree> <builder-evidence.json> --run` at the builder's exact revision/baseline; independent gate results all pass. --ui applies only to genuinely UI-bearing product slices with real evidence; S-B's CLI/tests themselves do not require a fictional UI.

UI failure cases: four-cell complete clean success; missing one cell; duplicate cell/file alias; wrong screenshot revision/hash; missing/empty/nonimage file; malformed/empty requirements; changed spec digest/version; unavailable with zero captures and no review; unavailable with some captures; available partial render; missing/stale/open review; same-revision image replacement after review; LF/CRLF/BOM equivalence and substantive spec-change rejection; DPR/fullPage declared geometry; --ui omission advisory; non-UI legacy compatibility; existing dirty/revision/diff/test failures remain failures. Assert structured values and exact missing cells, not only broad word presence. Preserve original tests and prior failures.

No deployment, live native sync, skill installation, price/model calls, generated screenshot claims, force cleanup or memory DB changes occur in planning. Atlas reconciles project/feature memory before dispatch using its normal version-aware workflow. End this planning task with concrete saved artifacts, Muse review result/pending state, unresolved user choices and a short approval request. **Do not call the plan ready or build until the user approves it.**
