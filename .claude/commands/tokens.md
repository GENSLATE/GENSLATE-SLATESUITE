---
description: Change design tokens safely — edit the typed source, regenerate every output, check contrast and drift.
argument-hint: "[what to change, e.g. 'make statusbar accent use frost-3']"
---

Token change request: $ARGUMENTS

Follow the `design-tokens` skill (`.claude/skills/design-tokens/SKILL.md`):

1. Edit only `packages/tokens/src/**` (`tokens/*.tokens.ts`, `themes/nord.*.theme.ts`). Never edit `packages/tokens/src/generated/**` or `crates/design-tokens/src/generated/**` (a hook blocks it).
2. Run `bun run tokens` to regenerate CSS, the Tailwind `@theme`, TS, JSON and the Rust crate.
3. Check `packages/tokens/src/generated/json/contrast-report.json` — every text/background pair must still meet WCAG AA in **both** Polar Night and Snow Storm.
4. Run `bun x moon run tokens:test tokens:check design-system:typecheck` and `cargo check -p genslate-design-tokens`.
5. If a new token needs a Tailwind utility, confirm it appears in `tailwind.theme.css` and document it in `.claude/rules/design-system.md`'s utility table.
6. Summarise the token diff (source + generated) and which components are affected.
