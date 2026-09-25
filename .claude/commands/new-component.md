---
description: Scaffold a new @genslate/design-system component following the component contract (files, variants, tests, showcase).
argument-hint: "<category>/<name>  e.g. inputs/segmented-control"
---

Create the design-system component `$ARGUMENTS`.

Follow the `design-system-component` skill (`.claude/skills/design-system-component/SKILL.md`) and the contract in `.claude/rules/design-system.md` exactly:

1. Validate the argument: `<category>` must be one of `window, layout, actions, inputs, navigation, overlays, feedback, display`; `<name>` is kebab-case. If it's missing or invalid, ask.
2. Check it doesn't already exist, and whether Base UI (`@base-ui/react` 1.8) has a matching primitive — read its docs page for parts, props and data attributes before writing code.
3. Create `packages/design-system/src/components/<category>/<name>/` with `<name>.component.tsx`, `<name>.variants.ts`, `<name>.types.ts`, `index.ts`, and export it from the category barrel.
4. Add tests at `packages/design-system/tests/unit/<category>/<name>.test.tsx`.
5. Add a state-matrix section to the example app's showcase for `<category>`.
6. Verify: `bun x moon run design-system:typecheck design-system:test` and `bun x biome check --config-path=.config/biome.json packages/design-system desktop/example`.
7. Report the files created and suggest running the `ui-visual-qa` agent on both themes.
