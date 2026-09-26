# Code standards (all files)

## Tooling
- **bun is the only package manager and JS runtime.** `bun install`, `bun run <x>`, `bun x <bin>`, `bun test`. Never npm, npx, pnpm, yarn or node.
- Tool versions are pinned in `/.prototools` (moon, bun, rust); npm versions are pinned **exactly** in the root `package.json` `workspaces.catalog` and referenced as `"catalog:"`; Rust crates in root `Cargo.toml` `[workspace.dependencies]` and referenced as `{ workspace = true }`. Adding a dependency = add the latest stable version there first (`npm view <pkg> version`, crates.io).
- Formatting is automatic: Biome (`.config/biome.json`) for TS/JS/JSON/CSS, rustfmt for Rust. A Claude hook formats every edited file.

## File naming (modular dotted names)
`<subject>.<kind>.<ext>` in kebab-case:
| Kind | Example |
|---|---|
| React component / part | `title-bar.component.tsx`, `menu-item.component.tsx` |
| tv() recipes | `button.variants.ts` · shared: `popup-surface.recipe.ts` |
| Types | `button.types.ts`, `token.types.ts` |
| Hooks | `use-theme.hook.ts` |
| Utilities | `cn.util.ts`, `platform.util.ts` |
| Providers / contexts | `theme.provider.tsx`, `tabs.context.ts` |
| Token source | `color.tokens.ts`, `nord.polar-night.theme.ts` |
| Scripts | `build-tokens.ts`, `css.emitter.ts` |
| Tests | `button.test.tsx` (under `tests/unit/<area>/`) |
| Claude / agent docs | `code-reviewer.md`, `format-on-edit.hook.ts` |
| CSS | `nord.snow-storm.css`, `design-system.base.css` |
Rust files follow Rust conventions (`snake_case.rs`).

## Commits
Conventional Commits, enforced by commitlint (`.config/commitlint.config.ts`): `type(scope): subject`, lower-case subject, ≤ 100 chars. Scopes: `tokens, design-system, tauri-bridge, config-typescript, config-vite, example, crates, repo, ci, deps, claude, docs, release`.

## Never
- Edit generated files (`**/generated/**`, `*.generated.ts`, `src-tauri/gen/**`, lockfiles).
- Commit secrets or `.env` files; put anything sensitive in the frontend bundle.
- Suppress a lint/type error without a comment explaining why it is a false positive.
