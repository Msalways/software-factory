# Hattera handoff trace, 2026-11-07

Source: read-only Hattera messages database and factory trial review, checked 2026-11-10. Times UTC. This traces the start of the two parallel implementation slices; it is not a cost audit.

- 04:10:49: user authorized OpenCode development, Codex orchestration/testing and parallel worktrees.
- 04:21:33: Builder received the kickoff. At 04:22:03 it found its room still limited to preparation. At 04:36:58 Lead acknowledged stale room scope; all three room bulletins were updated by 04:37:33. This caused a blocked worker run and a corrective handoff before implementation.
- 04:39:26-04:41:26: a custom ACP diagnostic acknowledged a model and session, but the first P1 process ended without verified edits. Lead switched to OpenCode's documented standalone command at 04:46:56. The two sessions showed native tool activity at 04:49:21.
- 04:49:46: Builder could not access process handles launched from the Lead conversation, so process supervision returned to the Lead. This split ownership across threads and forced an additional checkpoint.
- 05:30:11: after real candidates existed, Lead sent exact candidate/hashes to Verifier. The focused review passed 27 preview tests at 05:32:53 and exposed missing mounted interaction coverage, which became a bounded correction. This handoff had a useful independent result.

The trial's saved routing receipts count is zero. Two outcome entries were backfilled on 2026-11-10. Usage logs do not attribute tokens to individual handoffs or show billable cost, so this trace does not quantify token savings.

Conclusion: check receiving scope before dispatch; launch and monitor an external engine in the owning worker thread; use durable checkpoints for cross-thread transfer. Keep independent verification, which found real defects. Recheck these rules on one later feature before claiming an efficiency gain.
