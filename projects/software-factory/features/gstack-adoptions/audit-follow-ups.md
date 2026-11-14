# Discovery-only audit follow-ups

Feature gstack-adoptions, proposed first wave, 2026-11-14. Starting evidence: Verity's comparison report and independently read main49f7657620eb94c3fb3812c2a8d02660f65c6a39. These are review leads, not approved test edits or findings automatically proven by grep.

| ID | Lead and evidence | Required follow-up / retention boundary |
|---|---|---|
| AF-01 | `tools/factory-sync.test.cjs:115-127` checks presence of role words and prohibited phrases | Determine which exact policy behavior each assertion protects; show whether contradictory text could satisfy the word list. Retain marker/version/byte limits, nonmutation, security/policy goldens. Propose an extension only with a concrete missing invariant; no deletion in this wave. |
| AF-02 | `package.json:9` default test lane omits `tools/factory-brief.test.cjs`, `tools/slice-receipt.test.cjs`, `tools/opencode-discovery.test.cjs` | Inventory documented/focused/combined/CI commands, distinguish omitted default lane versus unverified total coverage; retain S8A supplementary-run evidence. Record default/supplementary/unknown statuses. Do not modify package.json or call omissions defects without evidence. |
| AF-03 | `tools/factory-gates.test.cjs:23-65` launches dummy commands | Retain: these are process fixtures and assertions inspect actual gate behavior. No “child exits0 therefore low value” classification. |
| AF-04 | `tools/factory-brief.test.cjs:21-62` derives heading cases from REQUIRED | Retain structural and CLI cases; separately review intended schema completeness from templates/PRD. Do not treat shared constants as proof of duplication/deletion readiness. |
| AF-05 | Existing provider-snapshot boundary tables and regressions | Retain distinct stdout/receipt/check/authorization invariants. Similar singleton/multi-candidate cases may protect different paths; owner/caller/history/stronger-proof cards required before any later change. |

Report read/unread scope, exact revision, evidence and confidence. Verity proposes retain/extend/rewrite/retire-proposal only; a builder owns any later approved change and another verification step checks it. No report result grants a waiver, green gate, new route or test retirement authority.
