# S8 combined verification

**PASS for Atlas integration acceptance at `1c8525f126dfd27965e2de744d24398d6d014a0d`.** Live rollout remains held; release was not requested or performed. One nonblocking documentation finding is recorded below.

Independent detached checkout: `../S8-verification`. Verification baseline equals the tested SHA because this slice changes no product files. Feature baseline is `09d01c56bec990281eb40fa5391caffa2bf7af0a`; assembled parent is `2472ac29db15a0f5020c7169c80590cd9995d838`. Exact HEAD, clean tree and empty verification diff were checked before and after execution. Reports/artifacts remain outside the checkout, ready for Atlas to place in the feature folder. The actual brief is `S8-integration-verify.md`; its stale v2.1 labels/12-brief count are superseded by approved PRD v2.2 and the actual 14 filled briefs.

Environment: Windows PowerShell, Node v24.21.0; independent Verity thread `772d490a-7c92-4923-9af6-d2f69f77a2f7`. Runtime identifies Codex. Requested default gpt-6.1-sol/medium is not actual execution evidence: actual model, applied effort, cost and quota remain unknown. No provider/model launch, live sync, bot/settings change, source edit, merge, push or release occurred. No UI surface or screenshots apply.

## Observed checks

| Check | Result | Evidence |
|---|---|---|
| `npm.cmd test` in the independent checkout | **293 pass, 0 fail, 0 skipped**, exit0 | `artifacts/S8/npm.log` |
| Every filled slice brief through `factory-gates.cjs brief` | **14/14**, all exit0 | `artifacts/S8/brief-*.log`; complete names in `combined-summary.json` |
| S1A normative synthetic contract fixture against this checkout's module | exit0 | `artifacts/S8/S1A-contract.log` |
| S2A exact nine preimages/hashes, native binding, plus pure binding/expiry/lifecycle controls | both groups pass, exit0 | `artifacts/S8/S2A-contract.log`, `contracts.cjs` |
| Read-only `factory-sync.cjs render <role> --project hattera --path C:/Users/shant/Videos/opendots-agent/OpenMausBot-main` | lead **6424**, builder **3967**, verifier **3613** UTF-8 bytes; all exit0 | `artifacts/S8/render-*.log` |
| Release metadata | all first markers `version=1.4.0`; one 1.4.0 changelog heading; package release1.4.0 | `combined.cjs`, render logs |
| Independent `factory-gates.cjs check <own checkout> <own evidence> --run --json` | all four gates pass, exit0 | `verifier-gates.json` and `verifier-gates-final.json` |
| `git diff --check <verification baseline> <revision>` / exact HEAD / clean tree | all exit0; no product diff | `diff-check.log`, `revision.log`, `clean*.log` |

Exact commands and statuses are in `artifacts/S8/commands.json`. Npm ran **once**, through the first independent gate attempt. That run passed; the harness subsequently rejected the Node spec reporter because its summary parser expected TAP. The initial gate failure is retained in `verifier-gates-initial.json`; the parser was corrected and the remaining checks resumed without repeating npm. A supplementary persistence assertion initially assumed even a missing-identity preflight creates a route receipt. Source inspection showed the early return occurs before receipt assembly; the corrected assertion verifies no receipt/snapshot and one held check row. These were verifier harness errors, not product failures. Initial attempts and corrections are explicit in evidence.json. Final validation rechecks recorded outputs, persistence and checkout identity rather than rerunning live commands or npm.

## Roles and advisory semantics

Read the actual project lead/builder/verifier and portfolio lead text, compared with PRD v2.2 and the implemented CLI header/flag branches. All work kinds remain worker-first. Premium requires documented need and exact matching owner approval; unknown preference/tier remains held, with conservative defer and no timeout permission. Snapshot evidence, identity authorization and task/cost permission remain separate. Fingerprint/retirement binding and premium approval's own expiry are described without a false 24-hour answer expiry.

The Lead's route choice is followed by an exact recipient `check ... --purpose native-delegation --profile ...`; handoff requires valid permission. Builder requires a permitted `check ... --purpose cli-run` exit0. Verifier requires `check ... --purpose verify --actual ...` with actual-vs-planned distinction; effort unknown stays unknown. The text never claims route exit0 alone authorizes execution. Therefore it remains correct with the new advisory ranking: owner comparative ordering can yield a choice and exit0 with null price, but `dispatchAuthorized:false` persists until the shared check allows. No role text contradicts that behavior. Explicitly naming the additive `advisory` field would improve discoverability but is not necessary to make the existing mandatory checks correct. No live render/apply/record or worker bot changes occurred.

## Isolated live-input journey

Created a unique OS-temp state directory and set `FACTORY_STATE_DIR` before each CLI subprocess. Left `FACTORY_HATTERA_HOME` unset so the tools read the real native config/bots/catalog/usage inputs. Set session context from this thread, independently of any capture. Copied only the actually present policy, limits and outcomes. Did not invent allowlist entries, user decisions, readiness, identity or evidence. A synchronous filesystem write guard restricted the router subprocesses to the unique temp/evidence roots. No discovery/provider/probe/model commands ran.

| Journey | Exit | Observed outcome |
|---|---:|---|
| `supply --json` | 0 | 23 cached/configured engines observed, not claimed ready or executed |
| `snapshot hattera --json` | 8 | missing `route-identities.json`; no snapshot created |
| `route <own profile> --project hattera --json` | 8 | same missing identity; no choice, dispatch false, actual unknown |
| `check hattera <actual configured selection> --purpose route --profile <own profile> --json` | 8 | held, permitted false, dispatch false, null snapshot hash; exactly one JSONL row |
| `audit hattera --section Hattera --json` | 7 | historical proof/actual/tier remain unknown, no dispatch permission |

There were three actual configured selections and **zero current project allowlist entries**. The check identity came from an actual native selection solely to test refusal; no provider was launched. No live session readiness or identity attestation was supplied. Thus a successful live snapshot/subset assertion is **unexercised**, not fabricated; there is no saved snapshot, route receipt or dispatch artifact. Synthetic subset/authorization boundaries are covered by the passing combined suite and accepted S8A evidence.

Audit saved a schema2 report **in temp state**. Last-two-ledger scope is explicit: October and November2026 files, covered timestamps `2026-10-24T13:53:03.355Z` through `2026-11-13T16:19:20.974Z`, no earlier ledger files omitted at this observation. 228 included rows: all228 historical authorization/tier/actual unknown; 135 section-attributed, 93 attribution unknown; 269 other-section rows excluded. Premium eligible rows0 and shares null. Cost provenance remains separate (64 reported, 13 estimated, 151 unreported); seven `tokensReported:false` rows remain outside measured denominators. These numbers are ledger observations, not authenticated billing/execution identity. Sanitized aggregate output is in `live-summary.json`; raw report stays in private temp state rather than copying individual usage rows into the delivery artifact.

**No live changes:** sorted membership and SHA-256/size records are identical for all **20 existing input files** before and after the live journeys. This covers every file under live `SoftwareFactory/state/routing` plus native config.json, bots.json, catalog directory and usage directory. Reads were stat-stable; zero changed/added/deleted paths were observed. Raw config, bot text and credential fields were not copied to artifacts. `live-before.json`, `live-after.json`, `live-summary.json`, and `live-persistence.json` hold the proof. This statement covers the measured operation window, not unrelated later application activity.

Live rollout blockers are absent current session/native-bound identity, absent current readiness and an empty project allowlist. Owner answers/tier/price/capability evidence would also need validation after those prerequisites. No expanded authorization or settings change is implied by code acceptance. A native acknowledged model run was intentionally not exercised. Native handoff enforcement remains role/check discipline, not an execution interceptor; local source markers are attestations, not cryptographic authentication.

## Acceptance mapping

| Requirement / acceptance | Evidence at the assembled SHA |
|---|---|
| R1 / AC1: pure resolution, schema2, hash and unknowns | npm resolver/snapshot tests; S1A fixture; S2A exact-nine/hash/lifecycle groups; accepted S8A binding controls |
| R2 / AC2: import/record/authorization separation and invalidation | npm spawned CLI tests; S2A contract groups; S8A accepted mutation/atomic/binding denial cases |
| R3 / AC3: cheapest capable and premium/fallback policy | npm route tests; accepted S8A generated46-frame permission sweep,29-scenario matrix and9 systematic cases at this same SHA |
| R4 / AC4: all check purposes, actual identity, logging | npm CLI/check tests; accepted S8A96 purpose checks; live held CLI/check and exactly one audit row |
| R5 / AC5: historical audit uncertainty, cost/token coverage | npm audit regressions; accepted S8A six downstream controls; real-input audit7 with228 unknown rows and null premium shares |
| R6 / AC6: standards/templates and brief compatibility | actual standards/role reading; all14 brief gates; npm factory-gates tests; minor path typo below |
| R7 / AC7: profiles/exact execution/role rendering/release preparation | three fresh CLI renders, marker/byte assertions, package/changelog assertions; actual execution remains explicitly unknown |
| R8 / AC8: independent failure and combined verification | accepted S8A at this exact SHA plus this independent npm/live/hash verification and gate records |

Accepted S8A is referenced, not repeated: `../S8A-reverification3-evidence/evidence.json` and `verify-S8A.md`, revision identical. It records 286/286 combined focused tests,293/293 npm,29 matrix cases,9 systematic cases,46 generated frames and6 downstream controls. Its historical records preserve the old S2/S3A test107 timestamp race separately (`../S8A-evidence/artifacts/S8A/historical-summary.json`). That race did **not** fail the assembled S8 npm run; no retry or waiver was needed here.

## Nonblocking documentation finding D1

`shared/standards/dynamic-execution.md:11` points readers to `state/routing/snapshots/<project>.json`. The actual CLI stores and validates `<STATE>/project-provider-snapshots/<project>.json` (`tools/factory-route.cjs:40,184`). Reproduce with `rg -n 'snapshots/|project-provider-snapshots' shared/standards/dynamic-execution.md tools/factory-route.cjs`, or inspect the live route's `providerSnapshot.path` in `live-summary.json`. This is a misleading documentation path, not a permission bypass: all role journeys use the actual CLI and mandatory check. Recommend correcting the one path in a documentation follow-up; no source was edited here. It does not invalidate the exercised behavior or prevent Atlas integration acceptance.

All code/fixture/role/live-nonmutation acceptance checks pass at the exact assembled SHA. Atlas may proceed with integration acceptance while recording live rollout prerequisites and D1. This is not release approval or a claim of verified live model execution.
