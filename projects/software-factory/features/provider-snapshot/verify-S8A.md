# S3B rework2 and S8A re-verification #4

Tested assembled revision **1c8525f126dfd27965e2de744d24398d6d014a0d**, parent/baseline **2472ac29db15a0f5020c7169c80590cd9995d838**, in own detached checkout `../S8A-reverification3`. Exact three changed paths: tools/factory-route.cjs, tools/factory-route.test.cjs, tools/provider-snapshot-cli.test.cjs. Whitespace check0, clean exact HEAD. No implementation edits. Previous FAIL evidence folders preserved. New report and artifacts are external under this folder for Atlas to place after final acceptance.

Windows PowerShell / Node v24.21.0. Verity in Codex runtime, requested gpt-6.1-sol/medium. Actual provider-acknowledged model/applied effort/cost/quota unknown. Builder metadata reports Claude, actual model/effort unconfirmed. No provider/model call, live home/state/settings, merge, push, release or sync. All identities/answers/acknowledgements/costs used below are synthetic fixture data, not actual provider execution evidence.

## Contract judgment

The revised behavior correctly separates **ranking** from **dispatch permission**. A valid bound owner comparative order may produce a ranked choice, null price and route exit0 under PRD v2.2/S3A. That is not a launch permit. The selected candidate's own evaluateTask decision now controls dispatchAuthorized. When it is held, stdout and persisted receipt say dispatchAuthorized:false, advisory:true, include the unresolved advisoryReasons, and the reason explicitly says ADVISORY/no dispatch until check passes.

The additive advisory fields are compatible with the generic receipt format. Existing fields/profile/snapshot binding and planned-vs-actual distinctions are preserved; slice-receipt.load retains the false permission/advisory/reasons fields. The extra fields create no new authorization. Exit0 remains the documented successful **choice/ranking** outcome; callers must use the explicit permission flag and mandatory project check before executing. This resolves the previous contradictory positive permission claim without removing legitimate comparative ranking or inventing dollar costs.

## Old repros and original assertions

Original repro-holds.cjs passes both unknown-tier/unknown-price singleton cases: route8/check8, no choice, false stdout and receipt permission, correct unresolved reasons. Cheaper/ranked unknown tier stays held rather than selected or dropped in favor of a dearer known worker. Partial input/output rates, crossing vectors and zero-token estimates remain conservative. Complete dominating price evidence recovers route/check0. Known premium needs exact current need/approval; fallback/exclude cases preserve those refusals.

The original saved pairs.cjs assertions were rerun with only checkout location retargeted. It still contains `saved.choice.price.output` from the old defective partial-price selection; correct null choice now makes that diagnostic fail. The log is retained as pairs-original.log, not counted as a product failure. The original owner-ordering block in that actual saved file asserts ranking, price and check8; **it does not assert a positive permission flag**, so there is no such original assertion to silently flip. The narrowly contract-corrected partial-price assertion requires null choice/false permission/route8; pairs-corrected.cjs passes all8 controls. The previous systematic permission-invariant assertion is unchanged and now passes because the persisted flag is false.

## Independent coverage

| Check | Initial observed result | Evidence under artifacts/S8A |
|---|---|---|
| Prescribed combined5-file suite | exit0,286/286;0 fail/cancel/skip/todo | focused.log |
| npm.cmd test | exit0,293/293;0 fail/cancel/skip/todo | npm.log |
| Original29-scenario matrix | exit0,29/29;129 CLI subprocesses | independent.log, independent-results.json |
| Original single/multiple unknown guards and extra controls | exit0 | repro-holds.log, extra.log |
| Contract-corrected original pair controls | exit0,8 controls | pairs-corrected.log, pairs-results.json |
| All9 systematic route/check probes | exit0,9/9;84 CLI calls including reused pair controls | systematic.log, systematic-results.json |
| Generated combination sweep | exit0,46/46;235 CLI calls | sweep.log, sweep-results.json |
| Advisory downstream cases | exit0,6/6;46 CLI calls including reused controls | flows.log, flows-results.json |
| S1A normative fixture on this exact module | exit0 | S1A-contract.log |
| S2A exact nine preimages/hashes + own pure lifecycle assertions | exit0 | contracts.log |
| S8A brief and baseline diff | exit0 | brief.log, diff.log, scope.log |
| Independent factory-gates --run | final result appended after completion | verifier-gates.json |

The original matrix covers all nine independently current sources, identity expiry/session/native changes, other-project isolation, unknown capability, malformed sources/import atomicity, source/snapshot refusal codes, all check purposes, premium need/approval, explicit ready-but-limited refusal, legacy advisory, actual/default mismatches, log-write failure and no hidden project fallback. It was rerun, not inferred from prior passes. Pure fixtures again cover arrays, raw/resolved/content-vs-expiry binding, exact subsets/duplicates, missing history/routes/generations and lifecycle non-revival. Documentation fixture stat constants are injected only to compare exact preimages/hashes; independent filesystem mutation cases use real fs.stat.

## Generated dispatch invariant

Forty-six generated frames combine worker/premium/unknown tier; full/null/partial-input/partial-output/cached rates; no rank vs valid bound rank; crossing/unlike-basis vectors; valid/expired/wrong-profile/missing premium approvals; excluded-candidate/fallback controls; zero estimates and mixed partial vectors. Unknown-tier/rank frames are explicitly adversarial snapshot states, not claimed legitimate user-answer imports. This is a bounded generated matrix, not a claim of every mathematical Cartesian combination.

Twenty frames returned dispatch-authorized routes. For each, stdout equals saved receipt, selected candidate's evaluator says allowed, and **all four purposes** (native-delegation, cli-run, route, verify with typed matching synthetic acknowledgement) permit on matching profile/snapshot hashes. Four frames returned advisory choices with false permission in stdout and receipt; all four checks held8 and did not permit. Total96 explicit check calls over those24 chosen frames. Other frames held/refused without a choice/permission; returned project fallbacks stayed empty. No invariant violation.

## Advisory downstream audit, verify, outcome and limit

Six own real CLI flow cases exercise the behavior not covered by the builder's downstream grep:

1. Valid owner ranking returns0/choice with price null, advisory:true, price reason and false stdout/receipt permission. A typed acknowledgement linked to that original advisory receipt cannot verify: check verify holds8 at the shared price guard.
2. Audit with an advisory receipt and **no acknowledged actual identity** returns7, historical proof/authorization/tier unknown, and report dispatchAuthorized:false. It does not invent execution from the ranked choice.
3. A separately explicit **hypothetical acknowledged ledger row** can yield audit0 with historical owner authorization authorized and tier worker. Under the existing S5/PRD contract this means the identity was in the contemporaneous owner authorization snapshot, **not that this task had dispatch permission**. The report still says dispatchAuthorized:false and the original advisory receipt stays false/unchanged. Synthetic measured cost0.75/tokens30 remain separate measurements. Audit is historical classification, not a launch or permission gate; audit0 cannot override check. No actual model ran.
4. Two manual outcome records succeed0 but contain no dispatch permission field. The route remains advisory/false, price null and cli-run check8; the old receipt is byte-identical. Outcome telemetry cannot substitute for price permission.
5. Price evidence is then legitimately supplied and refreshed so the task evaluator permits. A test copy of the advisory receipt is given matching current profile/snapshot/key bindings while retaining false permission; verify rejects6 at receipt validation. A fresh dispatch-authorized route receipt for the same identity verifies0 with matching synthetic acknowledgement. This isolates the false-permission gate from price holds or stale hashes.
6. A limit record succeeds0 as telemetry, with no dispatch permission. Old snapshot routes fail5 after the source change; refreshed route refuses3/no choice/false permission, all four candidate checks refuse6. The original advisory receipt and owner policy bytes remain unchanged. Limit/outcome commands do not consume a receipt as permission or launch a model.

Initial advisory snapshot/evidence and complete sanitized commands, rows/reports, profile/snapshot hashes, receipts and source fixtures are retained. Old snapshot reference paths may be overwritten by intentional later refresh; archived initial copies preserve the actual earlier inputs. This is not a claim that historical owner authorization equals task dispatch authorization. Local acknowledgements/attestations remain trust-limited, not authenticated account truth; same-size/same-mtime replacement and unobserved external account switches remain known limitations requiring renewal.

## Readiness and boundary

Final PASS/FAIL and gate outputs are appended after required rerun completes. No defect found in the observed current matrix/flows. Historical S2/S3A timestamp-race failures remain separately recorded in prior evidence and are not relabeled or rerun here. The checkouts/source stayed clean; no live dry run, publishing, model launch or live sync is claimed. S8 is a separate slice and may dispatch only after S8A PASS on this exact SHA is recorded. Requested/default identity is not provider acknowledgement.


Final verdict: PASS. S8A acceptance is on1c8525f126dfd27965e2de744d24398d6d014a0d; S8 can dispatch on this exact revision. Independent factory-gates --run exits0: artifacts_exist,brief_complete,diff_matches_claims,tests_pass all pass. All13 commands exit0, including again286/286 combined,293/293 npm,29/29 original matrix129 subprocesses,9/9 systematic84 calls,46/46 generated235 calls (20 positive-permission routes,4 advisories,96 purpose checks),6/6 downstream46 calls. S1A/S2A fixtures and corrected pair/extra/original-held repros pass. No skips. Original obsolete diagnostic retained separately; no unresolved product defect found. Product tree clean; all prior FAIL evidence preserved. No live readiness, S8 completion, release, sync or model execution is claimed.
