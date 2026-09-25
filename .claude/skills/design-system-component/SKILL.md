---
name: design-system-component
description: How to add or change a component in @genslate/design-system (Base UI 1.8 + Tailwind CSS v4 + tailwind-variants, Nord tokens) following the GENSLATE component contract — file layout, recipes, data-slot, accessibility, tests and the example-app showcase. Use whenever creating, extending or restyling a design-system component.
---

# Adding a design-system component

The contract lives in `.claude/rules/design-system.md` — this skill is the step-by-step recipe. Read both.

## 1. Decide the shape
- **Category** (folder under `packages/design-system/src/components/`): `window` (TitleBar, WindowControls/traffic lights, StatusBar, AppShell), `layout`, `actions`, `inputs`, `navigation`, `overlays`, `feedback`, `display`.
- **Primitive**: if Base UI (`@base-ui/react` 1.8) has one (Menu, Popover, Dialog, Select, Tabs, Switch, Checkbox, Slider, Tooltip, Toast, …) wrap it. Read its docs page first (https://base-ui.com/react/components/<name>) for part names, props and `data-*` attributes. Polymorphism is the **`render` prop** — never `asChild`.
- **Compound parts** are flat named exports: `Menu`, `MenuTrigger`, `MenuItem`… each part in `<name>-<part>.component.tsx`.

## 2. Files
```
packages/design-system/src/components/<category>/<name>/
├── <name>.component.tsx      # the component (function, `ref` as a prop — no forwardRef)
├── <name>-<part>.component.tsx   # optional compound parts
├── <name>.variants.ts        # tv() recipes only
├── <name>.types.ts           # exported prop types (documented with TSDoc + @default)
└── index.ts                  # named re-exports only
```
Then add `export * from './<name>';` to `src/components/<category>/index.ts`.

Reference implementation: `src/components/feedback/badge/`.

## 3. Variants (`<name>.variants.ts`)
```ts
import { tv } from '../../../utils/cn.util';

export const fooVariants = tv({
  slots: { root: 'inline-flex h-control-md items-center gap-1.5 rounded-control px-2.5 text-base', icon: 'size-icon-md' },
  variants: { size: { sm: { root: 'h-control-sm px-2 text-sm' }, md: {} } },
  defaultVariants: { size: 'md' },
});
```
- Token utilities only (`bg-surface-raised`, `text-fg-secondary`, `border-border-subtle`, `rounded-popover`, `shadow-popover`, `duration-fast ease-standard`, …). No hex, no `gray-*`, no `dark:`.
- Reuse shared recipes from `src/recipes/` (`popupSurface`, `field`, `listItem`, `focusRing`) instead of re-writing popup/field styles.
- State styling via data attributes: `data-[highlighted]:bg-selection`, `data-[disabled]:text-fg-disabled`, `data-[open]:…`, and `window-inactive:` / `macos:` custom variants.

## 4. Component (`<name>.component.tsx`)
- `className={cn(styles.root(), className)}` — consumer classes last.
- Every rendered element gets `data-slot="<name>"` / `data-slot="<name>-<part>"`.
- Icon-only controls require a `label` prop → `aria-label`. User-facing a11y strings come from a `labels` prop with English defaults.
- No CSS imports, no `@tauri-apps/*`, no `@genslate/tauri-bridge` — chrome takes callbacks (`onClose`, `onMinimize`, `onToggleMaximize`) and state (`isFocused`, `isMaximized`, `platform`).
- Icons: `<Icon name="codicon:…" />` (default) or `<Icon icon={LucideIcon} />` where no codicon fits.
- Follow the Rules of React — the React Compiler memoises for you; don't add `useMemo`/`useCallback` by reflex.

## 5. Tests
`packages/design-system/tests/unit/<category>/<name>.test.tsx` — bun test + Testing Library (happy-dom preloaded by `tests/setup/dom.preload.ts`):
```tsx
import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
```
Cover roles/names, keyboard (APG pattern), `data-*`/`aria-*` states, callbacks, disabled. No visual assertions.

## 6. Showcase + visual QA
Add a state-matrix section to `desktop/example/src/features/showcase/sections/<category>/` (every variant × size × state). Screenshot both themes and run the `ui-visual-qa` agent.

## 7. Verify
```sh
bun x moon run design-system:typecheck design-system:test example:typecheck
bun x biome check --config-path=.config/biome.json packages/design-system desktop/example
```
