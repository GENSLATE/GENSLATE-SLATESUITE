---
paths:
  - "packages/design-system/**"
  - "packages/tokens/**"
  - "desktop/*/src/**"
  - "webapp/*/src/**"
---

# Design system contract (`@genslate/design-system`, `@genslate/tokens`)

The UI must look **beautiful, clean and professional**: a **modern flat UI with VS Code density**, refined like **macOS**, themed with **official Nord** (Polar Night = dark, Snow Storm = light). Visual polish is a release gate, not a nice-to-have.

## Design principles
1. **Chrome recedes, content leads.** Titlebar, sidebar and status bar are quiet low-contrast layers. Hierarchy comes from type and spacing, not boxes.
2. **Flat at rest, depth only when floating.** Resting surfaces are separated by hairlines (`border-border-subtle`), not shadows. Popovers, menus, dialogs and toasts use the macOS recipe: a 0.5px ring, soft layered shadow, a top inner highlight in dark, and optional blur. No decorative gradients.
3. **One accent, used sparingly.** `accent` is for focus, selection, the primary action and one status-bar accent item. Aurora colours only ever mean status.
4. **macOS feel.**
   - 13px base text, Inter with optical tracking (system font on macOS), tabular numbers in data.
   - Radii: control 6, popover/card 8, dialog 12.
   - Source-list sidebar with pill selection.
   - Spring easing for toggles and thumbs. Animate transform and opacity only.
   - Default cursor. No text selection on chrome.
   - The inactive window dims the chrome.
5. **VS Code density.** Tree rows 22, sidebar rows 28, menu items 24, controls 28 (md), tabs 36, status bar 24, titlebar 38. Codicons at 16px (14px in dense spots).
6. **Every state, every theme.** Each component handles: rest, hover, pressed, focus-visible, selected/checked, disabled, invalid, loading (where relevant), and inactive-window. Each works in both themes, at 100/125/150% scaling, under `prefers-reduced-motion`, `prefers-contrast: more` and `forced-colors`.

## Tokens → Tailwind utilities (generated `@theme inline`)
Components style **only** through these utilities. Never use raw hex, `--gs-nord-*` primitives, Tailwind's default palette (`bg-gray-800`), or `dark:` variants: themes swap automatically via `[data-theme]`.

| Token family | Utilities |
|---|---|
| Semantic colours (`--gs-color-*`) | `bg-canvas` `bg-surface` `bg-surface-sidebar` `bg-surface-panel` `bg-surface-raised` `bg-surface-popover` `bg-surface-dialog` `bg-surface-sunken` `bg-field` `bg-scrim` · `border-border-subtle` `border-border` `border-border-strong` · `text-fg-strong` `text-fg` `text-fg-secondary` `text-fg-muted` `text-fg-disabled` `text-on-accent` · `bg-accent` `bg-accent-hover` `bg-accent-active` `text-accent-fg` `bg-accent-subtle` `border-accent-border` · `ring-focus` / `outline-focus` · `bg-focus-halo` · `bg-selection` `bg-selection-inactive` · `bg-fill-hover` `bg-fill-pressed` `bg-fill-selected-inactive` · `bg-control` `bg-control-hover` `bg-control-pressed` `bg-track` `bg-thumb` |
| Status colours (`danger`, `warning`, `success`, `info`) | `bg-{s}` `bg-{s}-hover` `text-on-{s}` `text-{s}-fg` `bg-{s}-subtle` `border-{s}-border` |
| Chrome colours (`--gs-*`) | `bg-titlebar-bg` `bg-titlebar-bg-inactive` `text-titlebar-fg` `text-titlebar-fg-inactive` `border-titlebar-border` · `bg-command-center-bg(-hover)` `border-command-center-border` · `bg-statusbar-bg(-hover/-active)` `text-statusbar-fg` `bg-statusbar-accent-bg(-hover)` `text-statusbar-accent-fg` `border-statusbar-border` · `bg-tab-strip-bg` `bg-tab-active-bg` `bg-tab-indicator` · `bg-tooltip-bg` `text-tooltip-fg` `border-tooltip-border` · `bg-traffic-{close,minimize,maximize}(-pressed)` `bg-traffic-inactive` `ring-traffic-rim` `text-traffic-glyph` · `bg-scrollbar-thumb(-hover/-active)` |
| Type | `text-2xs` `text-xs` `text-sm` `text-base` (13/18, the default) `text-md` `text-lg` `text-xl` `text-2xl` `text-3xl` (each sets size, line-height and tracking) · `font-sans` `font-mono` · `font-medium`, `font-semibold` · `tabular-nums` |
| Radius | `rounded-{none,xs,sm,md,lg,xl,2xl,full}` plus aliases `rounded-control` `rounded-menu-item` `rounded-popover` `rounded-card` `rounded-dialog` `rounded-window` |
| Shadow | `shadow-control` `shadow-card` `shadow-popover` `shadow-dialog` `shadow-inset` |
| Motion | `duration-{instant,fast,base,moderate,slow}` · `ease-{standard,enter,exit,spring}` |
| Z-index | `z-{base,raised,sticky,chrome,sash,popover,scrim,dialog,toast,tooltip,max}` |
| Layout sizes (spacing namespace) | `h-titlebar` `h-statusbar` `h-tabbar` `h-toolbar` `h-panel-header` `w-sidebar` · `h-control-{xs,sm,md,lg,xl}` / `size-control-*` · `h-row-sm` `h-row-md` `h-menu-item` · `size-icon-{sm,md,lg}` · `size-traffic-light` `gap-traffic-gap` `w-traffic-spacer` · `max-w-command-center-max` `w-palette` `max-w-dialog-{sm,md,lg}` `max-w-content-max` |
| Spacing | Tailwind's 4px grid: `p-2` = 8px, and so on |

Custom variants (`styles/variants.css`): `macos:` `windows:` `linux:` (from `html[data-platform]`), `window-inactive:` (from `html[data-window-focused="false"]`), `vibrancy:`. Custom utilities (`styles/utilities.css`): `focus-ring`, `focus-ring-inset`, `surface-glass`, `hairline-t`, `hairline-b`, `scrollbar-thin`.

## Component contract
- **Location:** `src/components/<category>/<name>/`, with these files:
  - `<name>.component.tsx`: the component; multi-part components add `<name>-<part>.component.tsx`
  - `<name>.variants.ts`: `tv()` recipes only
  - `<name>.types.ts`: public prop types
  - `index.ts`: named exports only
- **Barrels:** add the component to its category barrel `src/components/<category>/index.ts` with `export * from './<name>';`.
- **Exports:** flat named exports. Compound parts are `<Component><Part>` (e.g. `MenuItem`, `DialogTitle`). No default exports. No namespace objects.
- **React 19:** `ref` is a regular prop (no `forwardRef`). Function components only.
- **Base UI (`@base-ui/react`):** use the **`render` prop** for polymorphism. Never write `asChild` (that's Radix). Style from Base UI's data attributes: `data-open`, `data-closed`, `data-highlighted`, `data-selected`, `data-checked`, `data-unchecked`, `data-indeterminate`, `data-disabled`, `data-active`, `data-pressed`, `data-starting-style`, `data-ending-style`, `data-side`, `data-orientation`. Verify the part names and props against the Base UI 1.8 docs (use the docs MCP / web). Don't guess.
- **Styling:**
  - Combine classes as `className={cn(recipe({ variant, size }), className)}`.
  - Put shared recipes in `src/recipes/*.recipe.ts`: `popupSurface`, `field`, `listItem`. Focus uses the `focus-ring` / `focus-ring-inset` utilities.
  - Every rendered part sets `data-slot="<component>-<part>"`.
- **No CSS imports inside components.** All CSS ships through `design-system.css`.
- **Tauri-free.** Never import `@tauri-apps/*` or `@genslate/tauri-bridge`. Window chrome takes props and callbacks (`onMinimize`, `onToggleMaximize`, `onClose`, `isMaximized`, `isFocused`, `platform`).
- **Accessibility** (WCAG 2.2 AA):
  - Correct roles and names. Icon-only controls require `label`.
  - Full keyboard support per WAI-ARIA APG.
  - Visible `:focus-visible` ring (`focus-ring`).
  - Accessibility strings come from a `labels` prop with English defaults.
  - Respect reduced motion.
- **Icons:** `<Icon name="codicon:search" />` for Codicons (default for chrome/editor UI); `<Icon icon={LucideIcon} />` only where no codicon fits (Lucide at `strokeWidth={1.5}`). Sizes 12/14/16/20; decorative icons are `aria-hidden`.
- **Motion:** colour and background transitions `duration-fast ease-standard`; popups enter with opacity + scale `.96` + 4px rise (`duration-base ease-enter`) and exit `duration-fast ease-exit`. No transitions while `html[data-theme-switching]`.
- **Performance:** no layout thrash; animate transform and opacity only; no re-render storms (the React Compiler is on, so follow the Rules of React).

## Tests
- `packages/design-system/tests/unit/<category>/<name>.test.tsx`, using bun test + Testing Library + happy-dom (preloaded by `tests/setup/dom.preload.ts`).
- Test roles, names, keyboard interaction, states (`data-*`, `aria-*`) and callbacks. Don't test visuals.
- Use `userEvent.setup()` for interaction.

## Visual QA
Each component gets a state-matrix section in the example app (`desktop/example`). It is screenshot in both themes and reviewed by the `ui-visual-qa` agent before its wave is complete.
