# Design system

`@genslate/design-system` + `@genslate/tokens`: a **modern flat UI with VS Code density, refined like macOS**, themed with **official Nord**. The binding contract (utilities, file layout, a11y, motion) is [`.claude/rules/design-system.md`](../../.claude/rules/design-system.md); this page is the overview.

## Themes

| Theme | Mode | Nord groups |
|---|---|---|
| **Polar Night** (`polar-night`) | dark | Polar Night surfaces · Snow Storm text · Frost accent · Aurora status |
| **Snow Storm** (`snow-storm`) | light | Snow Storm surfaces · Polar Night text · Frost accent · Aurora status |

`ThemeProvider` takes `polar-night | snow-storm | system` and sets `html[data-theme]`. Components never use `dark:` — the CSS variables swap. Aurora colours only ever mean status; the Frost accent is used sparingly (focus, selection, primary action).

## Tokens

Single typed source → many outputs (`bun run tokens`):

| Source (`packages/tokens/src`) | Generated |
|---|---|
| `tokens/color.tokens.ts`, `layout.tokens.ts`, `typography.tokens.ts`, `motion.tokens.ts` | `generated/css/*.css` (`--gs-*` variables) |
| `themes/nord.polar-night.theme.ts`, `nord.snow-storm.theme.ts` | `generated/css/tailwind.theme.css` (Tailwind v4 `@theme inline`) |
| `themes/theme.contrast.ts` | `generated/json/contrast-report.json` (WCAG) |
| | `generated/ts/tokens.generated.ts`, `tw-merge.config.ts` |
| | `crates/design-tokens/src/generated/*.rs` (window background, sizes) |

Never edit generated files. CI (`tokens:check`) fails on drift.

## Metrics (VS Code density, macOS feel)

| Element | Size |
|---|---|
| Base text | 13px Inter (JetBrains Mono for code), tabular numbers in data |
| Titlebar · status bar · tab bar | 38 · 24 · 36 px |
| Sidebar rows · tree rows · menu items | 28 · 22 · 24 px |
| Controls (md) | 28 px |
| Radii | control 6 · popover/card 8 · dialog 12 |
| Icons | Codicons 16px (14px dense); Lucide at stroke 1.5 where no codicon fits |

Flat at rest (hairline borders), depth only for floating layers (menus, popovers, dialogs, toasts). Motion animates transform/opacity only and respects `prefers-reduced-motion`.

## Components

Base UI 1.8 primitives styled with Tailwind v4 + tailwind-variants.

| Category | Examples |
|---|---|
| `window` | TitleBar (+ command center), WindowControls (traffic lights), StatusBar, AppShell |
| `layout` | panels, split views, stacks, separators |
| `actions` | Button, IconButton, ToggleButton/ToggleGroup, SegmentedControl, Toolbar |
| `inputs` | text field, checkbox, switch, radio, select, slider |
| `navigation` | Tabs, Tree, sidebar/source list |
| `overlays` | Menu, Popover, Dialog, Tooltip, Toast |
| `feedback` | Badge, Banner, ProgressBar, Spinner, Skeleton, EmptyState |
| `display` | Icon, Kbd, avatars, lists |

File layout per component: `src/components/<category>/<name>/{<name>.component.tsx, <name>.variants.ts, <name>.types.ts, index.ts}`. Styles ship through `src/styles/design-system.css` (fonts in `fonts.css`). Also exported: providers (`DesignSystemProvider`, `ThemeProvider`, platform, window state), hooks (`useTheme`, `usePlatform`, `useHotkey`, …) and utils (`cn`, `tv`).

## Using it in an app

```css
/* src/styles/main.css — Tailwind v4 entry of the app */
@import '@genslate/design-system/design-system.css';
```
```tsx
// src/main.tsx
import '@genslate/design-system/fonts.css';
import { applyInitialTheme } from '@genslate/design-system/theme-init'; // sets data-theme before first paint
import { Button, ThemeProvider } from '@genslate/design-system';
```
Category entry points are also exported (`@genslate/design-system/window`, `/inputs`, …). See `desktop/example/src` for a complete, current example.

## Adding a component

Follow the skill [`.claude/skills/design-system-component/SKILL.md`](../../.claude/skills/design-system-component/SKILL.md) (or `/new-component <category>/<name>` in Claude Code). Every component needs tests and a state-matrix showcase section, and is reviewed in **both** themes.
