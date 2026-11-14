# Gate-integrity discovery report

Report-only; does not pass a gate, waive a finding or authorize edits.

## Identity and range
- Project / feature / slice:
- Worktree and expected surface:
- Full baseline / head; local changes separate:
- Auditor, observed time and evidence sources:
- Summary: no findings in inspected scope | findings | incomplete
- Coverage justification and exclusions (missing range/unread/unsupported means incomplete):

## Inspection inventory
One row per named gate change; listed is not read.

| Path:line / test or check | Change category | Before / after semantics | Listed/read/unread | Context and evidence read | Protected contract | Benign/finding/uncertain | Proposed disposition / owner |
|---|---|---|---|---|---|---|---|
| <item> | <deletion/skip/todo/only/timeout/retry/threshold/snapshot/golden/suppression/ignore/swallowed failure/discovery/CI/addition> | <semantics> | <coverage> | <reference> | <authority> | <classification> | <proposal> |

## Findings
Repeat without renumbering existing findings.
- ID: GI-001
- Status: unresolved | justified | needs-investigation
- Named check and path:line:
- Before/after evidence and protected contract:
- Observed impact versus inference:
- Uncertainty / unread context:
- Proposed disposition, owner, required owner/user decision and next action:
- Justification evidence (does not waive independent acceptance):

## Lane coverage and local leads
Default npm / documented focused / supplementary / CI / unknown lanes, each with source reference:
Cite projects/software-factory/features/gstack-adoptions/audit-follow-ups.md and AF IDs. AF-01 broad role words and AF-02 three omitted default lanes are investigation leads, not deletion-ready tests or an automatic npm defect. Name tools/factory-brief.test.cjs, tools/slice-receipt.test.cjs and tools/opencode-discovery.test.cjs and distinguish documented runs from absent evidence.

## Limitations and handoff
Unread sections, unsupported syntax, exclusions and confidence:
Original tests and failures retained; no execution, fixes or test mutations performed:
Atlas-owned follow-up reference / owner / next action (no duplicate task store):
Independent Verify/Release gates remain required regardless of summary.
