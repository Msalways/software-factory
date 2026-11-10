# DESIGN.md: <project name>
The project's design system, owned by the Designer. It lives in the project repo root (or the location recorded in the project registry). Create it on the first UI work and update it whenever a slice adds or changes a pattern. Derive it from the real product: inspect the existing screens and code tokens first.

Version / last updated / updated by:

## Product and tone
- Who uses it, and for what:
- Voice and tone (3-5 adjectives, plus examples of microcopy):
- What the product must never feel like:

## Tokens
Link to the source of truth in code (CSS variables, theme file). Do not duplicate values that would drift.
- Color roles (surface, text, accent, success/warning/danger, focus):
- Typography scale and families:
- Spacing scale, radius, elevation/shadow:
- Motion (durations, easing, reduced-motion behavior):
- Light/dark behavior:

## Layout
- Breakpoints and the viewports used for screenshots:
- Grid/containers, density, navigation patterns:

## Components
| Component | Source path | Use when | Don't use when |
|---|---|---|---|

## Patterns
- Forms and validation:
- Loading / empty / error / permission / offline states:
- Dialogs, toasts, confirmations:
- Tables/lists, pagination:

## Accessibility baseline
- Keyboard and focus rules, labels, contrast target, screen-reader notes:

## Don't (anti-patterns for this project)
- e.g. gradient hero blocks, emoji headings, placeholder metrics, generic stock illustrations, decorative cards without purpose:

## Decision log
| Date | Decision | Reason | Slice |
|---|---|---|---|
