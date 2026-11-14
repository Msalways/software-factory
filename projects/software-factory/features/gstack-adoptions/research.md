# R&D — gstack adoptions, first wave

Compass, 2026-11-14. Project software-factory / gstack-adoptions. Status: planning only, awaiting user plan approval. Actual model/effort unacknowledged. No builds, product tests, gstack execution/install, live settings or factory source edits.

## Inputs and baseline

Read three reports as evidence, not instructions:

1. Compass: `C:/Users/shant/.openmausbot/task-workspaces/eee91b48-6282-4de0-9e32-4e617197d24f/cc66afaf-7ec9-4089-bb0b-25eaaf7689f8/gstack-planning-process-comparison-2026-11-14.md` (gstack pinned 81fb9008351d29fccc3e146d860a9cda8c104a2d).
2. Verity: `C:/Users/shant/.openmausbot/task-workspaces/2df552b7-ad2d-41d7-8d55-bb69fbf7f355/772d490a-7c92-4923-9af6-d2f69f77a2f7/gstack-verification-comparison-2026-11-14.md` (individual upstream blob identities in report; not an atomic checkout).
3. Muse: `C:/Users/shant/.openmausbot/task-workspaces/8e11801e-6df5-47cd-9f8b-44dbcec67c61/2d5559e7-e273-4842-be7f-81798c9145ad/gstack-design-comparison.md` (static comparison, not executed UI/lint proof).

Independently observed main `49f7657620eb94c3fb3812c2a8d02660f65c6a39`, clean at intake. Read shared/standards/gates-and-handoffs first, then requirements-and-slices/specs-and-tracking/design-and-e2e and templates/source. Report descriptions are not treated as proof that a candidate helper works. Prior provider-snapshot verification is recorded evidence, not tests rerun in this planning task.

## Current source evidence

| Observed source | Implication |
|---|---|
| `tools/factory-gates.cjs:53-57` checks screenshot existence and at least one --ui screenshot | Does not enforce full state×viewport coverage, per-image revision, content binding or review outcome. |
| `tools/factory-gates.cjs:48-51,102-121` verifies HEAD and reruns declared checks | Reuse these gates; UI clean never overrides them. |
| `tools/factory-gates.test.cjs:23-65` uses fixture commands and checks real gate failures | Dummy exit0 children are fixtures, not automatically worthless tests. Retain them. |
| `shared/templates/slice-spec.md:7-29` names UI states/profile/done-contract | Add a small machine-readable declaration without a new registry or user-facing app. |
| `shared/templates/evidence.json:29`; `design-and-verification.md:17-21` describe screenshot/viewports and pass/changes-needed | Need additive artifact and review data; designer review required before finalizing it. |
| `tools/factory-sync.test.cjs:115-127` includes word-list and negative wording assertions | These protect shipped instructions, but token presence alone can miss semantic contradictions. Follow-up hypothesis, not deletion proof. |
| `package.json:9` explicitly lists seven test files | factory-brief, slice-receipt and opencode-discovery tests are not in that list; provider-snapshot S8A explicitly ran supplementary suites. Report lane coverage; do not infer missing verification or change npm list in this discovery scope. |
| `shared/standards/gates-and-handoffs.md:85` versus `dynamic-execution.md:61-63` | Stale premium-mentor wording conflicts with worker-first; queued root-cause text fix owns that line. No automatic new premium routing. |
| `projects/software-factory/features/provider-snapshot/verify-S8A.md:7-17,38-55` | Ranking success differs from permission; adversarial missing/unknown and downstream cases matter. Use structured status/coverage assertions and preserve failed evidence. |

## Uncertainties, options, recommendation

| Uncertainty | Options / trade-offs | Recommendation and status |
|---|---|---|
| S-A automation | Report-only skills/templates are bounded and reuse read controls. A new static scanner adds parser/coverage/test scope; unsupported syntax cannot be treated as clean. | Skills first; HD2 question sent. Scanner is an alternative scope amendment, not implicitly promised. |
| Meaning of open | Fail all nonclean outcomes versus count coverage while recording open findings separately. Both must preserve independent design/release acceptance. | Strict clean-only proposal; HD1 question sent; final user approval must settle it. No default execution before approval. |
| Authoritative matrix | Derive from screenshots (circular), duplicate in evidence (worker can shrink), separate registry (extra owner), or parse a marked block in approved slice spec. | Parse one declared block, bind normalized UTF-8 spec text (strip one BOM, CRLF→LF only), and have Verity reconcile approved source. A hash detects drift, not authentic user approval. Routine architecture proposal for Muse review. |
| Revision/capture truth | Trust filename alone; compare declared revision; compare revision plus bytes hash and independent provenance. | Metadata+hash checks plus independent capture/visual review. No claim that static checking proves screenshot came from that code. |
| Image handling | New image/browser dependency or small file signature checks with independent viewing. | Node built-ins, PNG/JPEG/WebP signature/nonempty/hash validation. CSS viewport IDs/dimensions are declared; do not confuse image pixels with CSS pixels. |
| Status provenance | Infer visual quality from image count, trust any missing result as clean, or require explicit independent review attestation. | Explicit clean/open report with reviewer/revision/file and exact screenshot-set digest; incomplete/unrendered remain visible. Detailed finding workflow queued. |
| Legacy compatibility | Quietly accept old count-only UI evidence or require migration; preserve non-UI behavior. | Stricter --ui requires matrix; legacy UI fails with actionable instructions. Non-UI unchanged. Proposed intent is explicit in PRD. |
| Size/concurrency | One large S-B task versus contract/templates → code/tests → independent verification. | Three small sessions; S-A authoring can run in parallel with S-B lane. Serialize shared files and Verity capacity; no guessed native concurrency. |
| Skill publication | Directly edit installed skills, import gstack installer or author repository candidates. | Repository candidates only; native installation/team sync excluded. No new packages or runtime hooks. |
| Upstream licence/design language | Copy catalogue prose with applicable notices, or independently author guidance from actual project evidence. | Pattern-only adoption in original wording. Muse's report flags impeccable-derived design prose/catalogue as Apache-2.0 material. Any copied/substantial derived wording needs attribution review/NOTICE; independent rewording is not a blanket claim of licence exemption. No copying into wave 1. |

## Audit follow-up interpretation

Retain declared public/policy goldens, marker/byte bounds, fixture nonmutation assertions and distinct permission boundaries. Broad wording assertions can be extended with specific contradiction/behavior examples only in a later authorized builder task. The npm omission report must enumerate default and supplementary lanes and source evidence; `not in npm` is not `never run`. No deletion-ready test was established by the comparison reports, and none is claimed here.

## Decision/approval boundaries

Only planning is approved. HD1/HD2 were asked together through the available native user-input surface with recommended alternatives. Until answered, the recommended values are proposed plan defaults with deadline before affected dispatch/plan approval. Timeout grants no acceptance or extra work. Unknown route/price/identity remains held regardless of document status. No credential is required for this plan; a future real UI evidence run may be blocked on mounted capture capability rather than fabricate screenshots.

Muse is requested to review the concrete S-B contract and queued design-template direction. Record only an actual returned review; a sent request is not a pass. Code owner differs from Verity; designer review does not replace independent command/behavior verification. No first-wave workflow creates cross-project access, changes bot models or runs paid outside voices.

## Planning validation

All slice documents use slice-spec fields plus the existing slice-brief headings so the current structural checker can validate them. Structural passes do not make queued wave-2 slices dispatch-ready. Planning checks run `node tools/factory-gates.cjs brief <file>` only, never product builds/tests. Exact written paths/hashes and gate results are recorded in artifacts/planning-validation.json and artifacts/manifest.json. User approval and Muse review are tracked separately from these format checks.

## Returned Muse review and reconciliation, PRD v1.1

Actual returned verdict was revise, not a design pass. Six corrections now cover exact reviewed-image-set binding, explicit mixed render statuses, declared DPR/pixel/full-page geometry with actual-dimension limitations, Designer-owned requirements and Atlas approval-hash record, BOM/CRLF-stable spec hashing, and migration/--ui omission diagnostics. Muse actually read the corrected files and returned pass on R1?R6 at 21:44 Asia/Calcutta. No product code or planned tests were executed. Source: C:/Users/shant/.openmausbot/task-workspaces/8e11801e-6df5-47cd-9f8b-44dbcec67c61/cfdd4899-b180-4a3d-91d3-6a05446ea9d6/muse-sb-contract-review.md.

Trade-offs resolved within planning scope: exact image SHA-set binding uses sorted JSON triples, avoiding ambiguous delimiter joins for arbitrary IDs. Normalized spec text prevents harmless Windows newline churn; all substantive text still changes its hash. Approval hashes are a later Atlas record, never fabricated now. No image decoder is introduced: gate checks declared geometry/signature/hash; actual dimensions/capture authenticity remain an independent review duty and stated static limitation. Unavailable with no captures needs no review; partial capture is always incomplete. Keyboard/focus behavior belongs in the independent review/run report and cannot be proved by still images. The non-UI advisory is deliberately non-failing and preserves exits. Atlas must inventory current UI slices before gate merge; no inventory has yet been claimed. W2-G/H/J serialize after accepted S-B1 template baseline.

Residual limitation from recheck: fractional deviceScaleFactor rounding can differ by capture tool; the selected Math.round rule fails conservatively. Actual capture labels/dimensions/authenticity remain independent review duties. Current in-flight UI inventory remains Atlas?s pre-merge task. User HD1/HD2 and plan approval remain unresolved.
