---
name: design-tokens
description: How GENSLATE's Nord design tokens work and how to change them — typed source in packages/tokens/src, the `bun run tokens` generator (CSS variables, Tailwind v4 @theme, TS, JSON, contrast report, Rust crate), theme files for Polar Night / Snow Storm, and drift checks. Use for any colour, spacing, radius, typography, motion or chrome-size change.
---

# Design tokens (`@genslate/tokens` → everything)

## Source of truth
```
packages/tokens/src/
├── tokens/color.tokens.ts        # Nord primitives (nord0–nord15) + scales
├── tokens/layout.tokens.ts       # spacing, radii, chrome sizes (titlebar 38, statusbar 24, rows, controls…)
├── tokens/typography.tokens.ts   # Inter / JetBrains Mono, 13px base scale with tracking
├── tokens/motion.tokens.ts       # durations, easings (incl. spring)
├── themes/nord.polar-night.theme.ts   # dark semantic mapping
├── themes/nord.snow-storm.theme.ts    # light semantic mapping
├── themes/theme.contrast.ts      # WCAG pairs that must pass
└── token.keys.ts / token.types.ts
```

## Generate
```sh
bun run tokens                 # = bun x moon run tokens:build
```
Writes (never edit by hand — a Claude hook blocks it and CI fails on drift):
| Output | Path |
|---|---|
| CSS variables (primitives, scales, per-theme) | `packages/tokens/src/generated/css/*.css` |
| Tailwind v4 `@theme inline` | `packages/tokens/src/generated/css/tailwind.theme.css` |
| TS constants + tailwind-merge config | `packages/tokens/src/generated/ts/*.ts` |
| JSON + contrast report | `packages/tokens/src/generated/json/*.json` |
| Rust constants (window background etc.) | `crates/design-tokens/src/generated/*.rs` |

## Change a token
1. Edit the source file above (semantic colours per theme — never point components at primitives).
2. `bun run tokens`.
3. Open `generated/json/contrast-report.json`: all pairs must pass AA in both themes.
4. `bun x moon run tokens:test tokens:check` and `cargo check -p genslate-design-tokens`.
5. If you added a utility-producing token, list it in `.claude/rules/design-system.md` so components can use it.

## Naming
CSS variables are `--gs-*` (semantic `--gs-color-*`, chrome `--gs-titlebar-*`, …); `--gs-nord-*` primitives are internal. Tailwind utilities drop the prefix: `bg-surface-raised`, `text-fg-muted`, `h-titlebar`, `rounded-popover`, `ease-spring`.
