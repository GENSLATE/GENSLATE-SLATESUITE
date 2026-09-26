# GENSLATE — Copilot instructions

GENSLATE is a **moon 2.5 + bun 1.4** monorepo of **Tauri 2** desktop apps with a shared **Nord** design system (React 19.3, Base UI 1.8, Tailwind CSS v4, tailwind-variants) and shared Rust crates (edition 2024).

## Always
- Use **bun** for everything: `bun install`, `bun run <cmd>`, `bun x <bin>`, `bun test`. Never suggest npm, npx, pnpm, yarn or node.
- Root commands: `bun run setup | dev | build | package | test | check | format | tokens | version | new-app <name> | clean`. Project tasks: `bun x moon run <project>:<task>`.
- Dependencies: npm versions are exact pins in the root `package.json` `workspaces.catalog` (packages reference `"catalog:"`); crates in root `Cargo.toml` `[workspace.dependencies]` (`{ workspace = true }`).
- Never edit generated files: `packages/tokens/src/generated/**`, `crates/design-tokens/src/generated/**`, `*.generated.ts`, `src-tauri/gen/**`, lockfiles. Edit `packages/tokens/src` and run `bun run tokens`.
- Tool configs live in `.config/` (Biome: `--config-path=.config/biome.json`).
- File names are kebab-case and dotted by kind: `title-bar.component.tsx`, `button.variants.ts`, `button.types.ts`, `use-theme.hook.ts`, `cn.util.ts`, `nord.polar-night.theme.ts`.
- Conventional Commits with scopes: `tokens, design-system, tauri-bridge, config-typescript, config-vite, example, crates, repo, ci, deps, claude, docs, release`.

## Layout
`packages/` (tokens, design-system, tauri-bridge, config-typescript, config-vite) · `crates/` (design-tokens, paths, testing, core/<app>) · `desktop/<app>` (Tauri apps; `example` is the Design Kit showcase) · `webapp/` · `scripts/bun-commands/` · `tests/e2e` · `other/documents/` (docs).

Path-specific guidance: `.github/instructions/*.instructions.md`. Full design contract: `.claude/rules/design-system.md`.
