# Design and end-to-end delivery
Updated: 2026-11-10

Use with project-understanding.md. Apply only the parts relevant to the change; routine fixes do not need a full design exercise.

## Product and design
Establish the target user, primary task, information hierarchy, content, and acceptance criteria. Inspect existing screens/components before selecting visual direction. Reuse established tokens and component patterns; for new surfaces define typography, spacing, color roles, layout and interaction feedback. Use real content and suitable assets instead of invented claims or placeholder metrics.

Cover applicable default, loading, empty, success, validation, error, permission, offline and recovery states. Specify narrow and wide layouts, focus behavior, keyboard operation, labels and semantic structure. Capture existing behavior before changing it when a baseline is useful. A screenshot supports appearance; it does not prove interaction or accessibility.

Use shared/templates/design-and-verification.md as the task's concise design contract.

## Designer role and design step
A dedicated Designer owns design for every slice with a user-facing surface. The Lead does not design, and builders do not choose a visual direction. Sequence (adapted from gstack's design pipeline):
1. **Design system:** each project has a DESIGN.md (template: shared/templates/DESIGN.md). It is derived from the real product, and its tokens link to code. Create it on the first UI work and update it whenever a slice adds or changes a pattern.
2. **Plan design review (before build):** score the PRD/slice plan in the design-and-verification template. Every dimension must reach at least 7; otherwise it goes back to the Lead with the required changes. This is the Design gate in gates-and-handoffs.md.
3. **Variants (new surfaces or explicit redesigns only):** produce 3-5 distinct directions, choose one, and record the reasons. Ordinary fixes reuse existing patterns and skip this.
4. **Live design review (after build):** screenshots at the DESIGN.md viewports for each required state, compared against the design. Before/after screenshots go into the PR. Deviations become fix commits or rework, and the result is recorded.
The Designer needs image input for reviewing screenshots. When no engine with image input is available, or no screenshot capture tool is mounted, record the live review as blocked with that reason. Do not substitute a text-only review. Resolve routine design decisions within scope; involve the user when a material product decision cannot be inferred.

## Available skill routes
These local sources were inspected or listed in Sage's session; check availability in the executing bot before use. Load only the relevant skill, then follow its full instructions. No third-party installation was performed.
- New frontend or explicit redesign: frontend-app-builder, ~/.codex/skills/frontend-app-builder/SKILL.md. Its concept workflow can require image generation; scope and user preferences govern the task.
- Existing product journey audit: audit, ~/.codex/skills/audit/SKILL.md. Requires real screenshot evidence and its referenced resources.
- Mobile product work: mobile-product-ui, ~/.codex/skills/mobile-product-ui/SKILL.md. Inspect its app-specific scope before applying.
- Raster concepts or assets: imagegen, ~/.codex/skills/.system/imagegen/SKILL.md, when bitmap output benefits the task.
- Browser tests: existing project test stack and mounted Hattera surface first. playwright at ~/.codex/skills/playwright/SKILL.md applies only when its terminal browser path is permitted by current surface instructions.
- Architecture diagrams: mermaid-diagrams if available. Diagrams explain decisions; they do not replace source evidence.
Use project-native SVG/CSS/components for appropriate code-native visuals. Skill availability is separate from tool/provider availability.

## Verification
Map each critical acceptance criterion to evidence. For UI work, exercise the primary journey through the actual frontend and applicable backend/storage boundaries, with deterministic fixtures and an isolated test environment. Check persistence/reload when required, error recovery and affected integrations. Record which external systems are real, stubbed, simulated or excluded. Avoid production mutations merely to demonstrate tests.

Use appropriate existing unit and integration checks plus real journey tests; avoid a new test framework when the project already has one. Backend and CLI products use process/API journeys. Cover auth/authorization, migrations, security, performance or accessibility more deeply when the change's behavior requires it. Do not invent universal numeric thresholds.

The verifier (Verity) records exact revision or local-change identity, environment, fixture setup, commands, results, failures, skips, screenshots/traces/logs where useful, and limitations. Redact secrets and personal data in evidence. Recheck affected behavior after fixes and run integration checks on the combined revision.

## Release and recovery
Prepare reproducible build and environment instructions, required configuration without secret values, migration/backup considerations when relevant, smoke checks, known limitations, and recovery/rollback steps. A release requiring external action follows the user's existing authorization. Verify the actual deployment and smoke results before calling it deployed.

Use states: planned, implementing, verification-blocked, changes-needed, ready-for-release, released. For in-progress verification record the current checks rather than claiming readiness. Every ready-for-release assertion links to acceptance evidence; released also links to actual deployment and smoke evidence.

## Economy and learning
Prefer one owner for small work; involve additional agents only where benefit exceeds session/context cost. Share concise task-specific briefs, source pointers and fresh evidence instead of full histories. Record only useful decisions and recurring defects. Choose models on demand through dynamic-execution.md; never silently substitute a higher-cost route.

