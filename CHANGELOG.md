# Changelog

Factory releases. `node tools/factory-sync.cjs plan <project>` lists the entries newer than the version a project last synced.

## 1.3.0 (2026-11-12)
- Policy-only work-kind tiers intersect owner-authorized catalog supply, with explicit empty-tier fallback and configurable observed scoring.
- Dated OpenCode discovery, explicit free-only response probes and user preference gate.
- Ask initially and when chosen models retire or new options appear; never auto-select.
- Role renders describe the choice protocol; no live bot settings applied.
- Per-slice receipts separate planned and reported execution, nullable usage, handoff/mentor counters, classified escalation and terminal outcomes. Automatic provider/usage correlation remains unwired.

## 1.2.0 (2026-11-11)
- Mentor/worker slice briefs, bounded mentor questions and evidence-based escalation.
- Owner-editable work-kind tier policy example; no fixed model identities.
- Sync role renders keep rooms concise. This release does not apply changes to live bots.

## 1.1.0 (2026-11-10)
- Project sync (`tools/factory-sync.cjs`) updates a project's Lead, Builder and Verifier instructions, its room bulletins and its `factory-*` skills to the current factory. It does not touch project memory, project notes or the project's other skills.
- Project bot templates in `hattera/project/` (lead, builder, verifier), each with a marked factory block.
- Backward compatible: projects set up before sync (no markers, no `application/factory` record) are adopted. Their whole old instructions are kept, word for word, as project notes below the new block.
- Worktree janitor (`tools/factory-worktrees.cjs`) and the cleanup rules in gates-and-handoffs.md.

## 1.0.0 (2026-11-09)
- First packaged release: Atlas, Muse, Forge and Verity; the gates-and-handoffs standard; live routing (`factory-route`); gate checks (`factory-gates`); factory memory; and the Hattera package builder.
