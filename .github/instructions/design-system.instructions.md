---
applyTo: "packages/design-system/**,packages/tokens/**,desktop/*/src/**"
---

# Design system (Nord · flat · VS Code density · macOS refinement)

- Components live in `packages/design-system/src/components/<category>/<name>/` with `<name>.component.tsx`, `<name>.variants.ts` (`tv()` recipes only), `<name>.types.ts`, `index.ts`; add `export * from './<name>';` to the category barrel. Categories: window, layout, actions, inputs, navigation, overlays, feedback, display.
- Wrap Base UI (`@base-ui/react` 1.8) primitives; polymorphism via the **`render` prop** — never `asChild`. Style state via Base UI `data-*` attributes (`data-open`, `data-highlighted`, `data-checked`, `data-disabled`, …).
- Style only with generated token utilities (`bg-surface`, `bg-surface-popover`, `text-fg-muted`, `border-border-subtle`, `h-control-md`, `rounded-control`, `shadow-popover`, `duration-fast ease-standard`) combined with `cn(recipe(...), className)`. Never raw hex, Tailwind's default palette (`gray-*`) or `dark:` variants — themes switch via `html[data-theme]`.
- Every rendered part sets `data-slot="<component>-<part>"`. Icon-only controls require a `label`. WCAG 2.2 AA, full keyboard support, visible `focus-ring`.
- Density: titlebar 38px, status bar 24px, sidebar rows 28px, tree rows 22px, menu items 24px, controls 28px (md); 13px base text (Inter); Codicons 16px.
- Flat at rest (hairlines, no shadows); only floating layers get the macOS shadow + ring. Animate transform/opacity only.
- Tokens: edit `packages/tokens/src/**`, run `bun run tokens`; never touch `src/generated/**`.
