# Provider snapshot and economical routing

Project: software-factory, `C:/Users/shant/SoftwareFactory`. Feature: provider-snapshot.
Version: **v2 approved; v2.2 INTERNAL CLARIFICATION, 2026-11-12**. Approval times are reported by Atlas; see clarification provenance below. Compass owns planning; Atlas owns execution and integration. No UI surface.
Baseline independently read: main `09d01c56bec990281eb40fa5391caffa2bf7af0a`; only `projects/` untracked. Candidate branches are not main. Historical 36/36 baseline passes were reported for v1; no product tests or builds were run during this revision.

## Outcome and boundaries

For each task, consider every currently owner-authorized route, establish hard capabilities, then choose the least costly comparable capable route. Use premium only for a documented task need with permission covering that task. A bot role, model name, reasoning effort or failed check never independently permits premium use.

Keep four separate questions: **authorized identity**, **provider tier evidence**, **capable for this task**, **permission for this dispatch/cost**. Provider evidence and preferences cannot enlarge authorization. Unknown remains unknown; unresolved decisions produce a user question and no execution. A timeout never grants permission, tier or spend.

Scope: factory Node tools, policy examples, standards and role templates. No Hattera product code, inference probes, automatic model calls, pricing scraper, provider API integration, bot changes, live allowlist changes, merge/push/release or sync application. Evidence import is local and generic. Leads obtain public provider evidence through existing read tools and save a dated, sanitized capture; the CLI does not browse or authenticate. No new dependencies.

## Grounding and dated decisions

Read `research.md` and `artifacts/provider-signals.json`. Main's `tools/factory-route.cjs:66-73` derives authorization from configured selections; `:79-117` exposes a lossy supply; `:304-320` can fall back outside a requested tier. Native handoffs do not override recipient models (`shared/standards/dynamic-execution.md:46`). These are the concrete defects this revision addresses.

| ID | Status as of 2026-11-12 |
|---|---|
| D1 | Preserve v1 user's session-start/before-dispatch snapshot, maximum 60 minutes; stale catalog threshold 24 hours. |
| D2 | Preserve v1 freshness rule: stale catalog requires current session readiness capture; fresh catalog without it is flagged unverified. Capture is trust-limited and cannot add authorization. |
| D3 | Preserve audit and declared memory-upkeep exception. Exception is audit-only; never dispatch permission. |
| D4 | Preserve per-project owner allowlist AND configured-selection boundary. Existing approvals remain as historical entries; do not seed or widen anything in this revision. Current configuration is never inferred from v1's old two-model list. |
| D5 | User corrected v1: generic hierarchy from provider evidence, ask the end user where uncertain, cheapest capable, avoid premium overuse. No baked model IDs or tier lists. |
| P1 | Proposed v2 conservative policy: worker by default for every work kind; premium requires need plus explicit per-slice owner permission. No numerical cap or new spending commitment. |
| P2 | Proposed v2: missing/ambiguous tier, incomparable prices or unknown hard capabilities hold the route; batch questions with conservative options. Declining or timing out leaves it held. |
| D6 | V1 approval is historical. Atlas reports v2 approval at 14:32 and implementation instruction at 15:02 Asia/Calcutta on 2026-11-12. S1/S2/S6 require revisions; S7 was not independently verified. Dispatch and route checks remain required. |

No claim that the user selected the earlier proposed 30%/50% cap, guessed premium list or bot-default changes. Those proposals were unanswered and superseded.

## Requirements and observable acceptance

| Req | Contract | Acceptance |
|---|---|---|
| R1 | Evidence-aware pure resolver and schema-2 snapshot | AC1: synthetic provider identities resolve from explicit evidence; ambiguous, stale, wrong-route and conflicting signals stay unknown; hierarchy never alters `allowed`; hash deterministic. |
| R2 | Generic evidence import and project decision recording, separate from allowlist | AC2: temp-home CLI round trips provenance and user answer; missing user reference fails; record/import leaves authorization byte-identical; catalog changes invalidate exactly as below. |
| R3 | Shared task evaluator and cheapest-capable project routing | AC3: cheaper qualified worker beats premium and more costly worker; high effort and planning role do not promote tier; empty worker set, unknown hard needs, price conflict and expired approval never trigger premium fallback. |
| R4 | `check` evaluates same profile before native/CLI dispatch and during verification | AC4: unauthorized, tier unknown, premium permission absent, active limit and actual identity mismatch refuse with log evidence; no profile bypass; each request logs once. |
| R5 | Audit distinguishes authorization, tier/premium usage and evidential uncertainty | AC5: historical authorization not reconstructed as fact from current policy; estimated/reported/unreported costs separated; unknown actual identity remains unknown; no guessed premium percentages. |
| R6 | Standards/templates replace conflicting premium-by-role and empty-tier fallback text | AC6: current contracts documented once, no stale mandatory premium route; brief gate passes filled fixtures; examples contain no real model assignments. |
| R7 | Roles use profiles and exact execution identity, release files prepared | AC7: fixture renders contain preflight/check/held decisions, under 24,000 bytes; no automatic premium role rule; no live sync; release metadata prepared for 1.4.0 only. |
| R8 | Independent failure-path and integrated verification | AC8: verifier reruns unit/CLI/regression checks at exact combined revision, validates denials and fallback, isolated live dry run changes no live files. Findings/skips explicit. |

## Normative data contracts

### v2.2 INTERNAL CLARIFICATION — route authority and nine source preimages (2026-11-12)

Atlas adopted this bounded I/O clarification for S2A/S2/S3/S4/S8A. It supersedes conflicting I/O source-authority/freshness shorthand in older sections, not the verified pure S1 projections. Approved v2 policy/scope and the verified S1 pure API at supplied baseline `29cd874b812c70c870d6a04ccab7e693ee2ae634` remain unchanged. Main independently remains `09d01c56bec990281eb40fa5391caffa2bf7af0a`; the supplied implementation revision was read as a Git object, not assumed to be main. Approval times remain attributed to Atlas's reports. Documentation alone is not dispatch; no new user approval question.

**Independent identity source.** `<STATE>/route-identities.json` is a sanitized Lead/operator **attestation**, not authenticated provider truth, automatic account discovery or model authorization. Import, snapshot, route and check read it; they never create, amend or widen it. A Lead supplies it through already authorized file controls; fixtures may seed it. No new CLI command, provider adapter, credential access or secret store read. Format:

```json
{
  "schema":1,"sessionId":"opaque-current-session",
  "capturedAt":"ISO","validUntil":"ISO",
  "nativeFingerprint":"64 lowercase hex",
  "records":{"engine/model":{"providerId":"explicit-provider","routeScope":"opaque-account/access","sourceRef":"sanitized-attestation-reference"}}
}
```

All fields are required, no unknown members; record fields are exact nonempty strings, identities are exact and unique (reject duplicate JSON object keys before parse results can mask them). No emails, account tokens, credential values or inferred vendor/account defaults. Configured means engine exists in native config and model is in its current catalog, or is an explicitly retained historical identity. A route record for an unselected catalog option is identity evidence only, never authorization. This distinction is necessary because verified S1 requires explicit routes for **every current option** in each complete supplied catalog. Never truncate options to selected models or infer missing records; incomplete required coverage holds snapshot assembly. A targeted import requires the complete target engine coverage to compute its v2.1 raw hash. Missing retired route data remains unknown per v2.1.

The caller supplies current `sessionId` independently of the capture. CLI callers obtain it from required `FACTORY_SESSION_ID`, set by the Lead from the actual owning session; never default to capture.sessionId. Commands already taking project p use that p; evidence-import has no project argument, so its existing process context must set `FACTORY_PROJECT_ID` to the safe project ID for this helper. Missing/invalid context exits2 before writes. These are context environment values, not a new CLI command or provider adapter. This environment string is another operator attestation, not authentication. Capture session must match, capturedAt <= now < validUntil, and 0 < validUntil-capturedAt <= 60 minutes; ISO dates must parse to finite milliseconds. Same-session reuse cannot exceed that expiry. An account switch requires renewed attestation even within that interval. A different live session cannot reuse the file by taking its session ID as its own.

**Native-only binding, no recursion.** H is the verified S1 fingerprint primitive (sorted object keys, all generic arrays ordered). Selection `Sel(s)` is null for absent/null selection; otherwise exactly `{key:s.instanceId+'/'+s.model,effort:s.effort??null}` with nonempty IDs and valid nullable effort. Present malformed selections fail; do not coerce them to absent. `Stat(file)` is `{mtimeMs,size}` from native fs.stat, finite nonnegative numbers, size a safe integer; it reads no contents. Read only these native JSON paths: config.instances[id].driverKind/driver/enabled, config.defaultModelSelection, config.newBotDefaults.profile.modelSelection; bots[].id/section/modelSelection and tasks[].id/modelSelection. Only these permitted nonsecret fields may be selected as helper inputs, returned, persisted or hashed; do not inspect credential values or add secret fields to the read surface. Reuse permitted field reads and Node built-ins; no generic parsing framework or secret discovery is requested. Source metadata invalidates even when changed fields are not read.

`C = {stat:Stat(config),instances:[{id,driver,enabled}],defaultSelection:Sel(...),newBotSelection:Sel(...)}`. Instances sort by id using code-unit order; driver is driverKind then driver, required nonempty; enabled defaults true. `B = {stat:Stat(bots),bots:[{id,section,selection:Sel(modelSelection),tasks:[{id,selection:Sel(modelSelection)}]}]}`. Bot IDs required/unique, section absent -> null; task ID absent -> null. Bots sort by id; tasks sort by canonical full row, retaining identical null-ID rows; repeated nonnull task IDs fail. These projections do not include names, messages, SOULs or other private content.

Let `N` be native catalog binding entries for every configured instance, sorted by id: `{id,driver,file:S(Stat(catalog)),catalog:S({default,options})}`. `S(v) = {state:'present',value:v}`; absent optional file is **exactly** `{state:'missing',value:null}`. `default` is the catalog's string default or null when absent. In N, options are complete raw option objects with only the v2.1 top-level label/observedAt/mtime/path/paths exclusions, sorted by id; opaque nested arrays preserve order. No providerId/routeScope is derived or injected into N. This native option projection is distinct from v2.1's rawCatalogFingerprint, which adds independently attested routes.

```js
nativeBindingPreimage = {schema:1,config:C,bots:B,catalogs:N};
nativeFingerprint = H(nativeBindingPreimage);
```

It includes config/bots stat metadata so **any rewrite** changes binding when mtimeMs or size changes, including account-related settings we must not inspect. Catalog metadata also conservatively invalidates on rewrite. It excludes capture, evidence, previous snapshots, policy/decisions, its own hash and all credentials. Comparison uses independently reread native sources. Never validate capture from its own records or an Evidence record. Re-stat files after reads and before write/dispatch; changed stat means abort/retry fresh, never mix revisions. Metadata can miss same-size/same-mtime changes and cannot detect account switches outside those files: this is not tamper resistance or automatic account verification. Require renewed session attestation and report the limit.

**Exact nine preimages, one I/O owner.** Add one shared helper contract in `tools/factory-route.cjs`: `readCurrentSources({project,sessionId,now}) -> {preimages,currentFingerprints,routeScopes,captureValidUntil,inputs}`. It strictly reads/project-validates once, derives native binding first, validates attestation, then hashes the following objects. `inputs` supplies the already validated collections for S1; it is not a new persisted registry. No hash is read from a previous snapshot. Both pending import validation and post-write snapshot refresh use this same helper, not independently reproduced projections. `currentFingerprints[k] = H(preimages[k])` for exactly these nine keys; no tenth identity key is added to S1.

1. **config:** `{schema:1,native:C,sessionId,routeIdentities:S(capture)}`. Capture means the complete validated attestation above, including session/time/nativeFingerprint/sourceRefs. Missing capture can be represented by missing S for a diagnostic map, but is never sufficient for route-dependent work. This folds identity freshness into config without changing S1's nine keys. Native binding is not the composite config hash. Capture renewal changes this source hash; identical provider/route/option content leaves v2.1 model/raw/resolved content hashes unchanged.
2. **bots:** `{schema:1,native:B}`. Only the explicit selected paths and file stat above; no capture/evidence.
3. **catalogs:** `{schema:1,engines:[{id,driver,file:S(Stat(catalog)),catalog:S({default,options})}]}` over the same configured instance set, sorted by id. Here options retain **all** nonsecret raw cached option fields, including display labels, sorted by id; only nested array order is preserved. Include file mtimeMs/size, default and missing markers. This source hash is intentionally more sensitive than the substantive/native option hashes; it is neither an engine raw nor resolved hash. A missing catalog remains missing, not `{options:[]}`; it cannot prove retirement. Present empty valid options is distinct from missing.
4. **policy:** `{schema:1,project,source:'present'|'missing',allowlist:[],snapshot:{maxAgeMinutes,catalogStaleHours},capability:{minOutcomes,minSuccessRate},costRank:{...},balanced:{...},engines:{...},models:{...},knownExceptions:[]}`. Use only project p's full allowlist entries, sorted by id (duplicate id fails). Resolve snapshot defaults 60/24 and capability/costRank/balanced defaults from tools/route-defaults.json using the existing fieldwise merge including balanced.weights; validate as current scoringPolicy does. Engines/models contain complete validated raw root policy records for configured engine/current-or-retained model keys, omitting model.tier only (legacy tier is not project classification). Do not pull data from another project's subtree. Missing engines/models -> {}; knownExceptions missing -> [], sort by canonical row. Exclude projects[p].modelDecisions/premiumApprovals/opencodePreference and all other project subtrees; exclude global workKindTiers/OpenCode preference (advisory, not project permission). No credentials belong in policy. Unsupported new behavior requires an explicit contract rather than a silent default. Missing policy means source missing, empty allowlist/settings defaults, never broad authorization.
5. **evidence:** `{schema:1,source:S({schema:1,records:[]})}`. Preserve complete validated Evidence records, including observedAt, validUntil, raw catalog binding, sourceRef and status/confidence. Sort all retained records across engines by `(key,field,sourceRef,canonicalJSON(record))`; duplicate identity tuple fails. Do not use the v2.1 substantive claim projection here: freshness/binding metadata matters. Missing file is missing S, never a fabricated persisted empty envelope. Excluded/expired claims remain present until superseded. For a pending import, validate current sources first; validate the proposed merged envelope in memory, then atomically write and recompute for the new state.
6. **decisions:** `{schema:1,project,policySource:'present'|'missing',modelDecisions:{},premiumApprovals:{}}`. These are the complete validated project p maps or {} when absent, keys canonicalized by H. Preserve confirmation/expiry/source/profile/model/catalog/generation fields; do not include OpenCode preference twice or other projects' decisions. A missing project subtree does not create authorization or a user answer.
7. **history:** `{schema:1,project,source:S(historyDocument)}`. Preserve the complete validated schema-1 project history, including all engines, tombstones, generations and retained historical data. Normalize only declared lastKeys arrays to sorted exact unique keys; every other array remains ordered unless already specified by v2.1. Missing history has missing S, not an empty generation map. S2's confirmed-first-observation initialization remains explicit and cannot restore missing old history or fabricate generation0. Where resolved validation requires unavailable history, hold rather than invent it. Retain all tombstones.
8. **limits:** `{schema:1,source:'present'|'missing',events:[]}`. Parse every nonblank line of limit-events.jsonl strictly to its full validated event object and preserve file order, duplicates and expired events. Empty present file differs from missing. Keep at/engine/model/scope/signal/resetAt/resetHint/cooldownHours and any validated legacy event members. Do not filter by now or derive latest-only values before hashing. Active-limit computation separately uses current time and existing account/model scope rules; malformed line or unreadable file is an error, never skipped.
9. **opencode:** `{schema:1,project,preference:S(projectPreference),advisory:{status:'ignored-for-project-routing',discovery:S({observedAt,listingStatus,models:[{id,price,responded}]})}}`. Project preference is the complete validated project p object, normalize chosen/offered to unique sorted exact keys. Omitted preference uses missing S. Advisory discovery is independently read from opencode-discovery.json, allowlist-project only those fields; model rows sorted by id, unique, absent price -> 'unknown', responded -> null if unreported; no command args, stdout, credentials or inferred free status. Missing advisory file uses missing S. Its presence does not prove response/readiness, tier or authorization; do not run discovery/probes. Existing global preference is ignored, not silently imported.

Source-wide default rule: a required config or bots file missing/unreadable/malformed fails closed. An optional file's ENOENT alone produces its explicit missing marker; permission errors, malformed JSON/JSONL, duplicate JSON keys, wrong schema and invalid types fail closed even for advisory sources. Do not use readJson/readJsonl catch-and-default readers on these paths. An empty source or unknown value never substitutes for corrupt input. Structural identifiers/set sorting use exact code-unit order, never locale/name/provider heuristics. now is NOT in any preimage; observation/validity times from sources are included where explicitly named. Time expiry is checked on every I/O boundary independently of equal hashes. Team-setup capture freshness remains S1's existing distinct rule, not a tenth source key.

**Command behavior and S1 reconciliation.** Missing/stale/wrong-session/wrong-native-binding route capture: evidence-import/model-record fail with existing invalid-input exit2 and no writes; snapshot returns held exit8 without a new usable snapshot; route/check return held exit8 before dispatch, logging the reason when supported. Known authorization/capability/active-limit refusals remain refusals; malformed required data exits2, not a held choice that can be bypassed. Expired/tampered/changed snapshot still exits5 under existing preflight rules after sources are valid. No route-dependent successful import/snapshot/check may ignore identity failure. Imports never write capture. They validate current sources before and after proposed mutation, changing only their owned evidence/project-decision file.

At snapshot assembly pass only attested `{providerId,routeScope}` pairs as S1 routeScopes; build complete raw options/history per v2.1. Cap the existing injected maxAgeMinutes to `min(policy.maxAgeMinutes,(captureValidUntil-now)/60000)` so verified S1's expiresAt cannot exceed identity expiry, without changing S1 code/API. If nonpositive, hold. Save attestation reference/validity in sources.config metadata for diagnosis; do not feed those observation fields into substantive model/raw projections. S3/S4 always recompute these nine current hashes at the I/O boundary before `isFresh`/`evaluateTask`; never pass snapshot.currentFingerprints back as if independently current. Relevant outcome/current-actual identity checks remain separate task inputs, not inferred from this source map.

**Fixtures and limits.** `artifacts/S2A-source-contract-fixtures.json` supplies a fully synthetic capture, native binding preimage, exact nine source preimages and expected hashes plus invalidation cases. It is documentation evidence, not a live capture, account verification or implementation pass. Examples include config-stat rewrite, capture-only renewal, same-content catalog refresh, evidence-only timestamp/binding change, other-project decision isolation, expiry with unchanged content, and unseen external account switches. Live rollout can remain held pending a real fresh operator attestation; this correction needs no credential or new user intent decision. Source authenticity remains trust-limited.



### v2.1 CONTRACT CLARIFICATION — 2026-11-12 (Atlas internal architecture decision)

This section supersedes conflicting fingerprint/API wording elsewhere in v2. It preserves approved product behavior, scope, authorization and premium policy. Atlas reports user approval of v2 at 14:32 and implementation instruction at 15:02 Asia/Calcutta on 2026-11-12; those events are not independently visible in this Compass thread. Atlas adopted the bounded consultation and the binding choices in this rework request. This documentation correction is not a dispatch or a new permission grant. Only Atlas dispatch starts a slice.

**Pure input, no overloads.**

```js
resolveModelEvidence({
  key, modelOption,
  engine: {id, driver, options, modelRoutes, evidence, retirementGenerations},
  routeScope, evidence, decision, preference,
  retired: {isRetired, retirementGeneration}, now
})
// -> {rawCatalogFingerprint, modelFingerprint, catalogFingerprint,
//     hierarchy, priceEvidence, capabilities, decisionState}
```

`engine.options` is the complete current raw cached option array, not supply().models. Each option has one unique nonempty id; keys are engine.id + '/' + id, split at the first slash. `engine.modelRoutes[key]` is exactly `{providerId,routeScope}` with nonempty opaque strings for every current key. No provider default, ID heuristic or missing-route inference. Extra retained route entries may reference known retirement tombstones only. `engine.evidence` is the complete retained Evidence array for this engine, including excluded, expired and retired-key claims; every evidence key belongs to this engine and is current or has a retained tombstone. `evidence` is exactly its target-key subset, compared by canonical record value, without omitted/extra/duplicate records; it is an array, never the persisted `{schema,records}` envelope. Unwrap only at the I/O boundary.

Active target: modelOption canonically equals the complete matching engine.options option; key and routeScope exactly match its route entry. Retired target: absent from current options, positive retained generation, and caller supplies the last retained complete modelOption and explicit retained route entry; do not invent missing historical option/route data. If unavailable, the snapshot consumer reports withdrawn/unknown fingerprint without calling the resolver for that target. The complete current catalog can still be fingerprinted from its explicit projection below. decision/preference absence is explicit null. now is finite injected milliseconds. Inputs are JSON data without cycles, undefined, nonfinite numbers, prototype keys or secrets; validation failure throws before any caller write.

`engine.retirementGenerations` is the complete retained map `{fullKey:nonnegativeInteger}` for current keys AND all historical tombstones. Every current key must have an explicit generation, including 0 after a confirmed first observation. Never supply 0 merely because history is missing. `retired.retirementGeneration` equals the target map entry; isRetired equals absence from current options. Positive generation may describe a currently active reappeared model. Reject inconsistent maps, negative/missing generations and duplicate/ambiguous option/route/evidence identities. A duplicate evidence identity is `(key,field,sourceRef)` regardless of whether values agree; distinct sources with conflicting values remain separate evidence.

**Canonical primitive.** fingerprint(value) = full lowercase SHA-256 hex of UTF-8 JSON with object keys recursively sorted using JavaScript string code-unit order; preserve EVERY array in this generic function. No locale-dependent sorting and no guessing set semantics from property names. Domain projections explicitly sort only the declared collections below. Opaque arrays nested anywhere in a cached option retain order. Display exclusions apply to known option top-level `label`, `observedAt`, `mtime`, `path`, `paths` only, not arbitrary nested substantive fields. The caller supplies nonsecret option content; do not read or hash credential-bearing configuration.

Let `option(option)` be its complete JSON object after those five top-level exclusions. Let `rawModels` be every current option projected to `{key,option:option(option),providerId,routeScope}`, sorted by key. No raw default is inferred: this resolver's catalog content is the complete raw option set plus explicit engine/route identity; selection/default settings are independently fingerprinted by the snapshot caller.

**Stage 1 — raw binding.**

```js
rawProjection = {engine:{id:engine.id,driver:engine.driver},models:rawModels};
rawCatalogFingerprint = fingerprint(rawProjection);
```

It excludes evidence, decisions, preferences, retirement history, observation times, display labels, paths and all hashes. Thus it exists before the first evidence capture. Evidence.catalogFingerprint means exactly THIS RAW hash, never the resolved catalogFingerprint. Import callers construct the projection and use fingerprint(rawProjection) before they have evidence, then the resolver returns the same raw hash. No new export or provider adapter is required.

**Stage 2 — substantive resolution binding.** Each retained Evidence record has a normalized claim projection with exactly `{key,providerId,routeScope,field,value,kind,status,confidence,sourceIdentity,validUntil}`. sourceIdentity is `{kind,providerId,routeScope,url}`: url is the complete official HTTPS sourceRef string (including fragment) when it is an HTTPS URL, otherwise null for local capture references. Reject credential-bearing URLs; local capture paths are provenance only, excluded from hashes. `value` retains its complete typed JSON, including ordered arrays. Exclude observedAt, local paths and Evidence.catalogFingerprint itself. Keep every retained claim projection, including expired/excluded/mismatched claims, until explicitly superseded; time or binding eligibility must not mutate content identity. Sort claim projections lexicographically by `(key,field,kind,providerId,routeScope,sourceIdentity.url||'',canonicalJSON(claim))`; distinct projections are retained, not collapsed by key/source. Exact duplicate input identities are rejected as above.

For each current raw model, `modelProjection = {model:rawModel,claims:sorted retained claims for that key}` and `modelFingerprint = fingerprint(modelProjection)`. For a retired target use its retained model/route projection plus retained target claims for reporting, but ignore every decision and never authorize it. Generation is a separate model-answer check, not silently folded into modelFingerprint.

```js
resolvedProjection = {
  engine:{id:engine.id,driver:engine.driver},
  models: rawModels.map(m => ({key:m.key,modelFingerprint:hashForCurrentModel(m)})),
  claims: sortedAllRetainedClaimProjections,
  retirementGenerations: engine.retirementGenerations
};
catalogFingerprint = fingerprint(resolvedProjection);
```

`models` is sorted by key; `claims` includes retired-key evidence too; the complete map's keys are canonical object keys. Neither projection includes decisions, preferences, its own result, another binding hash, now, resolution outcomes or time-dependent exclusion reasons. In particular raw and resolved hashes do not include one another. The raw model content is carried transitively by each modelFingerprint. The primitive preserves arrays; these explicitly named projection arrays are sorted sets. Retirement tombstones are never pruned: an unrelated disappearance/reappearance changes the resolved hash even when all current option content later matches an old catalog.

**Resolution versus content/freshness.** A claim applies only if its binding equals current rawCatalogFingerprint AND its exact provider/route/key, confidence/status and time checks pass. Changed raw content excludes old captures with reason `raw catalog binding mismatch`; never rewrite/rebind their hashes automatically. Re-import a fresh capture or explicit re-attestation with its new observation/validity/source. Identical raw content refresh retains binding. Matching content does not cure expired/future evidence; matching time does not cure a wrong binding. Excluded/expired records remain visible and fingerprinted. The snapshot's independent source-fingerprint/expiry checks still require refresh after relevant changes; no stale snapshot becomes usable merely because a hash matches.

Model-scoped decisions bind target modelFingerprint AND target retirementGeneration; catalog-scoped model decisions/comparative ordering/OpenCode preference bind the resolved catalogFingerprint. Old schema2 captures whose binding meant the old resolved hash are not migrated automatically: treat mismatch conservatively and obtain a fresh capture. Model-scoped answers survive unrelated membership changes if target model projection/generation are unchanged, but their provider claims may become excluded under the changed raw binding until re-attestation. These are separate checks. A generation-0 answer never revives after disappearance to generation1. Retaining the entire generation map also prevents old catalog-scoped answers reviving after an unrelated model returns. Changes entirely between observations remain undetectable, as already documented.

**Consumer reconciliation.** S1 assembles complete options/routes/history, passes the exact array subset, stores both raw/resolved engine hashes and target model hashes, and preserves tombstones. S2A unwraps envelopes, validates capture binding against raw projection, and never auto-rebinds; user-record/comparative/OpenCode validation uses resolved hashes/generation. S2 reads raw options separately from lossy supply, loads complete retained history, and persists history before snapshot as already specified. S3A uses resolved comparative bindings and model-answer generations, not raw evidence hash as permission. S8A independently checks both stages, array order, import mismatch, expiry and lifecycle non-revival. No source truth, authorization or premium permission is manufactured by any hash.

**Runnable synthetic expectations.** `artifacts/S1A-contract-fixtures.cjs` is a documentation fixture, not product implementation. After Forge has implemented the module, run `node artifacts/S1A-contract-fixtures.cjs <absolute-path-to-provider-snapshot.cjs>` from this feature folder. It uses opaque synthetic IDs and asserts primitive/raw/resolved invariants, exact input validation, evidence mismatch/expiry and generation non-revival. It is not run in this documentation-only correction. Product verification remains independent and revision-specific.



Use `<STATE> = FACTORY_STATE_DIR || <factory>/state/routing`. Keys split at first slash only. Validate project IDs with existing safe-ID rule. All timestamps parse to finite UTC values, not future values; malformed input fails before any writes. Write policy/snapshot through same-directory temp file then rename; an import/record failure preserves old bytes. Validate arrays, finite nonnegative prices and exact identities. No prototype keys or traversal IDs accepted.

### Evidence envelope and resolution (R1/R2)

`<STATE>/provider-evidence.json`: `{schema:1, records:[Evidence]}`. `snapshot --evidence <file>` may import this envelope. Import replaces records with the same `(key,field,sourceRef)` and preserves unrelated records; conflicts between different sources remain visible. `sourceRef` is a local sanitized capture pointer or official HTTPS URL plus section, never executable content. Evidence record:

```json
{
  "key":"engine/model", "providerId":"explicit provider identity",
  "field":"tier", "value":{"nativeTier":"provider's own value","normalized":"worker"},
  "kind":"provider-catalog", "status":"observed", "confidence":"high",
  "sourceRef":"artifact path + JSON pointer or official URL + section",
  "observedAt":"ISO", "validUntil":"ISO", "catalogFingerprint":"sha256",
  "routeScope":"exact engine/account access mode, without secrets"
}
```

`field` is `tier|price|imageInput|contextTokens|toolUse`. `kind` is `provider-catalog|provider-doc|provider-pricing|aggregator|owner`. `status` is `observed|inferred|unavailable|unverified`; confidence `high|medium|low`. `value` is typed per field: tier object as above (`normalized: worker|premium|unknown`); price `{currency,unit,input,output,cachedInput,contextBand,serviceTier,basis}` where basis is `account|api-equivalent`; booleans for image/tool, positive integer for context. Omitted price components are null. A price record cannot populate tier or capability.

Automatic tier resolution accepts only valid, exact-route, high-confidence observed provider-catalog/provider-doc records explicitly containing a provider tier and an evidenced mapping to normalized worker/premium. The capture must support both; a broad marketing heading, LLM guess or inferred normalization does not qualify. There is no dictionary mapping model names or provider families. If native hierarchy is not explicit enough to normalize, retain native wording as evidence, leave normalized unknown and ask. This may require a user answer even when official prose suggests a hierarchy. Aggregator metadata and historical local price tables are research leads, never automatic tier truth.

Resolution: applicable project owner override first; otherwise accept matching provider records only if all current eligible values agree. A conflict stays unknown (retain all sources). Invalid, expired, future-dated, wrong identity/scope/fingerprint or low-confidence evidence is retained as excluded evidence with reason. Unknown value never silently becomes worker or premium. `resolution` includes `{value, sourceRefs, observedAt, confidence, status, reasons}`. Other fields resolve separately with their own exact evidence; owner answers can resolve price preference without claiming measured prices.

### Fingerprints and user overrides

Canonical fingerprint follows the v2.1 clarification above: generic arrays preserve order; only explicitly named domain projection sets are sorted. A model fingerprint covers engine ID, driver, nonsecret routeScope/providerId, and the complete cached option excluding display label, plus matching normalized evidence claims (field/value/source identity/validUntil). Exclude mtimes, observedAt, file paths and formatting. Source identity means kind plus provider/route identity and official URL where present, never the capture file path. Engine catalog fingerprint additionally covers sorted model IDs and their model fingerprints. Re-fetching identical content or changing a label does not invalidate an answer. Changed price/capability/hierarchy value, validity, route/provider/access mode, addition or retirement does. Retain expired/excluded claims for fingerprint comparison until superseded so passage of time alone does not delete their identity; evaluation checks expiry independently.

`projects[p].modelDecisions[key]` stores `{tier, preferenceRank:null|nonnegativeInteger, confirmedBy:'user', confirmedAt, sourceRef, modelFingerprint, catalogFingerprint, retirementGeneration, scope:'model|catalog'}`. Record only from an actual user answer. Model-scoped tier answers survive unrelated catalog additions; the changed/new model stays held. Catalog-scoped comparative ordering is invalidated for that engine when any membership or substantive model claim changes. Provider/account changes invalidate all affected decisions. No expiry timeout grants an answer. Price evidence expiry produces a price hold even if a tier override still matches.

Retirement tracking: `<STATE>/project-catalog-history/<p>.json` is `{schema:1,engines:{id:{lastKeys:[],retirementGeneration:{key:integer}}}}`. Compare each complete observed catalog against its lastKeys; disappearance increments that key's generation, revoking its old answers. Missing/unreadable catalog never proves retirement and instead blocks eligibility. Reappearance keeps the generation and requires a matching newly recorded answer. First observation starts generation 0; a new question's answer records that generation. Save updated history atomically before snapshot; if snapshot write fails, its history fingerprint changes and the previous snapshot is unusable. Include history in currentFingerprints. Retirements occurring entirely between observations cannot be detected: report this limitation rather than claim lifecycle completeness.

OpenCode preference is `projects[p].opencodePreference:{chosen:[],offered:[],askedAt,confirmedBy:'user',sourceRef,catalogFingerprint,scope:'catalog'}`. Offered and chosen contain exact engine/model keys, not bare model IDs. It is bound to the offered-set fingerprint and re-asked on addition/retirement/substantive change; legacy global preference cannot satisfy it. Project-mode preference consumes local metadata without running response probes; observed ready/capability gates still apply. Legacy opencode-prefer and probe-based discovery remain advisory only and cannot authorize project dispatch.

### Snapshot schema 2 (R1)

Retain v1 `{project,observedAt,expiresAt,maxAgeMinutes,sources,engines,models,allowed,catalogModelsOmitted,hash}`; add `schema:2`, per-engine `catalogFingerprint` and per-model `modelFingerprint`, `authorization`, `hierarchy`, `priceEvidence`, `capabilities`, `decisionState`. `authorization` contains the v1 status/reasons/flags; `allowed` still means owner-authorized AND configured AND catalog/freshness/readiness/OpenCode gates, **not task approval**. Tier unresolved entries may be in `allowed` but cannot be selected. `decisionState` contains `needsUserChoice`, invalidation reasons and structured question options. Enumerate full catalog union allowlist/configured/live/ledger for research, never execution permission. Present user questions only for task-relevant owner-allowlisted/configured/catalog candidate identities, grouped per project/provider; a pending OpenCode preference can itself be asked before that gate passes. Do not ask about hundreds of unused unauthorized entries. Suggest defer/hold first, followed by recording an explicit worker/premium classification or comparative preference with the cited evidence. Choosing classification never approves spending or authorization.

Keep v1 refusal strings/order and capture consistency rule (live keys must be configured); missing catalog refuses; stale without valid capture refuses; absent engine in a valid capture refuses configured routes. Reject invalid/future capture times; mark expired captures ignored. `isFresh` requires schema 2, valid time bounds, correct recomputed hash AND unchanged current source fingerprints (authorization/config/catalog/evidence/decision/limits); the 60-minute expiry alone is insufficient. Hash is full SHA-256 of canonical content excluding hash. Never silently upgrade schema 1; exit 5 asks for regeneration.

Pure exports in `provider-snapshot.cjs`: retain `buildSnapshot`, `isFresh`, `decide`, `REASONS`; add `fingerprint`, `resolveModelEvidence`, `evaluateTask`. `buildSnapshot` takes v1 inputs plus evidence, project decisions, project preference, route scopes, retirement generations and active limit data; no I/O or wall clock. `isFresh(snapshot, now, currentFingerprints)` returns boolean. Current fingerprint map keys are config,bots,catalogs,policy,evidence,decisions,history,limits,opencode; config/bots hash only nonsecret route/selection fields, never credentials. Accepted evidence validUntil bounds snapshot expiry as well as the 60-minute maximum. `decide` answers authorization only. `evaluateTask(snapshot,key,profile,context)` returns `{decision:'allowed|refused|held',reasons,needsUserChoice,premiumJustification}` and is shared by route/check; context includes current time, applicable outcomes, limits and validated owner approval. This is the only premium/task guard. Evaluate deterministic refusal before held state when both apply: unauthorized, invalid identity, active limit, known incapable, premium lacking need/permission are refusals; otherwise unknown required evidence is held.

### Task profile and premium policy (R3/R4)

Profile requires `{slice,workKind,complexity,budget,needs}`; needs contains explicit `toolUse`, `imageInput`, `contextTokens`. Keep existing complexity values and budget names for compatibility; for project routes, `budget` is a secondary tie-break only and cannot bypass cheapest-capable or premium guards. No role requests premium by default. Unknown hard capability blocks; tool/image false blocks; context below need blocks. Relevant outcome thresholds remain current policy (2 outcomes/70% by default); low-complexity cold starts allowed only within known hard needs, known tier and current cost permission; medium/high without capability outcomes hold for a smaller authorized pilot or specific user acceptance of unproven capability.

Premium candidate requires profile `premiumNeed:{requirementIds,reason,cheaperRejected:[{key,reason,evidenceRef}]}` AND `projects[p].premiumApprovals[slice] = {keys,profileHash,approvedBy:'user',approvedAt,expiresAt,sourceRef}`. Exact slice/key/profile, current valid time and owner's authorization must match. Record why each lower-cost eligible alternative cannot meet the stated requirement; if no price comparison exists, explain that uncertainty to the user rather than claim an empty rejection list proves necessity. Two failed checks may justify asking, never auto-approve. No worker, active quota limit, missing metadata or bad brief triggers silent promotion. Existing unscoped escalation receipts are history, not permission. No numerical token/spend cap is introduced. Limit and cost increase decisions remain held; no pending question is treated as consent.

Among eligible worker routes, compare exact same-basis/same-currency/same-unit/context/service price vectors: a candidate dominates another if all applicable non-null components are no higher and at least one lower. Unknown components or crossing vectors require either profile `estimatedTokens:{input,output,cachedInput}` with validated counts and all applicable rates, or project user comparative `preferenceRank` bound to catalog fingerprint. Estimate is labelled estimate. Distinct access modes/API-equivalent versus account cost never treated as identical billing. Do not silently drop a relevant candidate held only for tier/price/preference and then label a dearer known route cheapest: unless resolved evidence rules it out as a better qualified worker, the final comparison is held even when another candidate passes. Known hard-capability failures, authorization refusals and active limits can be excluded with evidence. If no unique cost winner/equivalent tied group/comparative owner ordering, return held with the candidate set; do not claim cheapest. Equal-cost ties use existing reliability/latency/avoid rules, then lexicographic key. Missing prices are never zero. After worker rejection, premium only through matching approval and justified need; retain all exclusions in the receipt.

### CLI and logs

| Command | Contract / exits |
|---|---|
| `allowlist p --add keys --source text` / `--remove keys` / `--show` | Keep authorization-only semantics; does not assign tier. Existing confirmation metadata retained. 0/2. |
| `model-record p --file answer.json` | Envelope `{schema:1,kind:'model-decision|premium-approval|opencode-preference',value:...}` using records above; validates current fingerprints and explicit user reference, writes only that project decision. 0/2. It is an attestation importer, not proof of user identity. |
| `evidence-import --file evidence.json` | Validated local generic import only, no network/model. 0/2. |
| `snapshot p [--team-setup file|-] [--captured-at ISO] [--evidence file] --json` | Writes schema 2; absent tier does not fail snapshot creation. Outputs held questions. 0/2. |
| `route profile.json --project p --json` | 0 choice, 3 no capable/quota route, 5 invalid/expired/changed snapshot, 8 held decision. Invalid arguments 2. |
| `check p key --purpose native-delegation|cli-run|route|verify --profile file [--actual file] --json` | Same evaluator: 0 permitted, 6 refused, 5 bad snapshot, 8 held. Verify needs actual `{engine,model,effort:null|string,sourceRef,receiptPath,confirmation:'provider-ack|unknown'}`; unknown execution or receipt/key/profile mismatch refuses. Verify still requires a current valid snapshot and permission; historical expiry is audit evidence only and never silently approves a new run. Missing effort stays unknown. |
| `audit p --section name [--since ISO] --json` | 0 no findings, 7 findings, 2 invalid input. Requires no current readiness to classify historical authorization; writes timestamped report. |

Module `route(profile,opts)` without project retains legacy advisory ranking for compatibility, but receipts say `dispatchAuthorized:false`. It cannot provide permission to native/CLI dispatch; every execution path uses project `check`. This keeps old callers usable without an implicit bypass.

Snapshot-linked receipts/logs include profileHash, snapshot path/hash/time, authorization source, resolution evidence, candidates/rejections, ordering basis, need/approval source, requested and acknowledged actual identity, held options and failure class. `model-decisions.jsonl` appends exactly one row per check, including failure/missing snapshot; null snapshot hash is explicit. No invented actual identity from bot defaults, ledger or requested route. Log write failure blocks dispatch. No factory command launches a model.

Audit joins execution only through explicit receipt/session references. Authorization-at-run is `authorized|unauthorized|unknown` from contemporaneous saved evidence; separate current-policy comparison. Tier-at-run and premium tokens/cost are unknown absent historical classification; do not retroactively label old runs from current catalog. Costs reported, estimated and unreported are separate totals; `tokensReported:false` excluded from measured shares. Known exceptions are narrow and do not clear unknown authorization. Existing historical 99% concentration is not a verified premium or billed-cost share.

## Delivery and reconciliation

Each dispatchable brief below is one 20–30 minute session. Additional A slices split shared-schema/CLI/ranking/failure work; main S1–S8 filenames remain for traceability. Stop at the checkpoint and request a further split if the time/context budget is exceeded. Documentation alone starts no implementation; Atlas dispatch is required.

| Sequence | Outcome | Dependencies | Req/AC | Kind / owner |
|---|---|---|---|---|
| S1A | Pure evidence resolution/fingerprints | none | R1/AC1 | implement / assigned worker |
| S1 | Schema-2 snapshot assembly and evaluator | S1A | R1, R3/AC1, AC3 | implement / assigned worker |
| S2A | Evidence import and project answer recording | S1 | R2/AC2 | implement / assigned worker |
| S2 | Snapshot and allowlist CLI reconciliation | S2A | R2/AC2 | implement / assigned worker |
| S3A | Cost ordering and hard capability ranking | S2 | R3/AC3 | implement / assigned worker |
| S3 | Project preflight guard and receipt | S3A | R3/AC3 | implement / assigned worker |
| S4 | Shared check and actual identity verification | S3 | R4/AC4 | implement / assigned worker |
| S5 | Evidence-aware audit | S4 | R5/AC5 | implement / assigned worker |
| S6 | Standards/templates reconciled | v2 approval | R6/AC6 | implement / assigned worker |
| S7 | Role/release preparation | S6, S4 | R7/AC7 | implement / assigned worker |
| S8A | Independent denial/fallback verification | S1–S7 | R8/AC1–AC7 | routine-verify / independent verifier |
| S8 | Combined regression and read-only live dry run | S8A | R8/AC8 | routine-verify / independent verifier |

S6 can run alongside S1A–S5 after approval. Serialize shared `factory-route.cjs`, shared snapshot module and `package.json` edits. Atlas records exact dependency revision and supplies each isolated worker worktree. Never read/edit another active worktree. No fixed model assignment.

Bootstrap: main does not enforce v2 yet. After user approval, Atlas must perform and record the same authorization/tier/capability/cost/permission checks manually for the implementation sessions until S3/S4 are verified; identify this as manual evidence, never claim a v2 CLI pass from old tools. If evidence is insufficient, ask the actual user for the concrete route decision or remain held. Do not solve bootstrapping by bypassing checks, adding models, spending on probes or changing bots.

| Candidate | Disposition | Reason |
|---|---|---|
| S1 `a3b73e418224711d81b98c503d5cdbbe8f4f3c3d` | **Rework; helpers reusable** | Existing schema 1 scalar tier/price, configured-only universe, 16-char hash and time-only freshness lack evidence/decision invalidation. Authorization tests remain useful; core contract changed. |
| S2 `ef331c79d5039a4b8635a586856b9740ecd32330` | **Rework; allowlist scaffolding reusable** | Snapshot CLI is schema 1, non-atomic writes and no evidence/user record path. Preserve authorization boundary, do not couple tier to add. |
| S6 `e3a6298eae0970fbedb8af2b0a924bcbdddcfe86` | **Rework; placement reusable** | Snapshot instructions useful, but underlying role-tier and empty-tier fallback text conflicts with v2. Example schema insufficient. |
| S7 `354f880f08a76ec74f4b0245a4829d420225b68a` | **Superseded text; release/render scaffolding reusable** | Correct seven-file diff is **e3a6298..354f880**, not main..354f880. It appends checks while leaving compulsory premium role text. Not independently verified. |

Old S1/S2/S6 passes cover old contracts only. No candidate is accepted unchanged; do not cherry-pick or rewrite code during planning.

## Combined acceptance, rollout and recovery

Verifier uses exact integrated SHA, clean isolated home/state, synthetic arbitrary engine IDs and no inference calls. Rerun targeted suites plus full `npm test`; all must exit 0, actual counts recorded. Verify denial/fallback paths independently, not from builder's evidence. Live dry run uses current authorization as read-only input into isolated state; it never invents a worker allowlist, user tier answer or premium approval. Expected outcome may be held/no route; that is a truthful limitation, not a reason to widen policy. Hash all existing live routing files before/after and compare membership as well as contents.

Prepare release metadata 1.4.0 only after combined checks; no release assertion now. Atlas obtains user authorization for any later merge/release, allowlist choice, native bot change and team sync; each is outside this planning task. If only current expensive/default identities are authorized, work waits until the user chooses an eligible worker identity or gives a specific premium permission. Provider/API access is not presumed.

Schema 1 caches are regenerated, not migrated silently. Additive project decisions and evidence preserve old history; backup before future rollout. Rollback code/templates with corresponding sync review; preserve evidence. Never roll back authorization to a broader set or resume legacy unrestricted dispatch.

Historical planning context/get returned Unknown project/Record not found. Atlas now reports factory memory slice provider-snapshot-S1A v2 changes-needed-spec. That tracking update was not independently checked here; Atlas owns reconciliation. Compass did not edit the memory DB.

## Approval record and remaining user-only decisions

Atlas reports the user approved worker-first routing with documented need and explicit permission for each premium slice, keeping uncertain choices held (2026-11-12 14:32 Asia/Calcutta), then instructed implementation at 15:02. No new approval question is introduced by v2.1 internal API/hash clarification. No numerical cap is necessary for the approved policy. Optional later: specify a budget/cap with currency, period and billing basis when reliable account costs exist. Initial unknown tiers/comparative preferences and additional model authorizations are asked with actual candidates during rollout, never guessed or authorized by this document.
