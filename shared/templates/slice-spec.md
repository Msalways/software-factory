# Slice specification
Project/feature/slice IDs and actual source path:
PRD version and requirement/acceptance IDs:
Spec version / owner / baseline and local changes:

## Outcome and readiness
Testable outcome and acceptance:
Relevant R&D/architecture evidence:
Dependencies and readiness evidence:
Scope/exclusions; affected callers, contracts, data and shared-file ownership:
Root cause and impact for fixes:
UI surface? (yes -> DESIGN.md section + plan design review result / no). UI surface: yes => verification MUST use `factory-gates check --ui`; UI surface: no => state "no UI surface" here and omit the requirements block below:

## Requirements profile (describe needs; never name a model)
Complexity (low / medium / high) and why: spec clarity, files touched, shared-contract risk, novelty:
Needs: tool use / image input / long context / browser / other:
Budget class (free-first / balanced / best-quality):
Size check: fits one session's context and one quota window? If not, split:

## Done-contract (gates-and-handoffs.md)
Commands that must pass:
Expected change surface (files/modules):
Required artifacts: evidence.json (shared/templates/evidence.json); screenshots + viewports if UI:
Branch / worktree:

## UI evidence requirements
Fill this section only when UI surface is yes; otherwise delete the block and write "No UI surface" under Outcome and readiness. Exactly ONE marked block per spec. Only the project Designer authors or changes it, deriving states and viewports from the actual feature and DESIGN.md. Declare only the feature states and viewports that apply; the required matrix is the FULL cross product of states x viewports. v1 has no cell exclusions, waivers or fallback matrix: a cell that cannot be captured stays incomplete until captured or the spec is re-approved. IDs are unique nonempty strings. Width/height are positive integers in CSS pixels; deviceScaleFactor is optional (finite, positive, default 1). specVersion must equal evidence.specVersion. Changing the requirements reopens design review and user approval; changing line endings alone does not. Example data below (2 states x 2 viewports = 4 required cells; replace with the real matrix):

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

Evidence binding for this block: evidence.ui.specPath points at this approved spec; evidence.ui.specSha256 is the SHA-256 of the spec text normalized as `utf8-bomless-lf-v1` (decode UTF-8, strip exactly one leading BOM, convert CRLF to LF, preserve everything else; invalid UTF-8 fails). At user approval Atlas records {path, specVersion, specSha256, hashFormat:"utf8-bomless-lf-v1", approvalRef} under approval.uiSpecs in the feature manifest, separate from the manifest's exact-byte file hashes; no record exists before approval, and Verity checks that external anchor. CSS pixels (width/height here) differ from image pixels: screenshot pixelWidth = round(CSS width x deviceScaleFactor), pixelHeight likewise (>= for fullPage captures).

## Implementation contract
Inputs/outputs, interfaces, data rules, failure/recovery behavior:
Architecture decision and meaningful alternatives:
Relevant source/context pointers:
Integration target and owner:

## Execution and verification
Routing receipt (candidates, choice, reason, effort requested/applied, supply snapshot time):
Actual session/thread and isolated workspace:
Attempt history (route -> result / failure class -> action):
Continuation packet pointer (if handed off):
Verifier (not the builder; engine used):
Tested revision; gate results (artifacts_exist / diff_matches_claims / tests_pass); evidence references; failures/skips:
State, blockers, next action and last checkpoint:
Spec changes and evidence invalidated:
