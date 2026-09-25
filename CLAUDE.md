# GENSLATE

A **moon + bun** monorepo of **Tauri 2** desktop apps sharing a **Nord** design system
(React 19.3 + Base UI 1.8 + Tailwind CSS v4 + tailwind-variants) and shared Rust crates.
UI goal: modern flat UI with VS Code density, refined like macOS; Polar Night (dark) / Snow Storm (light).

## Golden rules
- **Use bun for everything**: `bun install`, `bun run <cmd>`, `bun x <bin>`, `bun test`. Never npm / npx / pnpm / yarn / node.
- Versions: tools in `.prototools` (moon 2.5.5, bun 1.4.2, rust 1.98.1); npm deps as exact pins in the root `package.json` `workspaces.catalog` (packages use `"catalog:"`); crates in root `Cargo.toml` `[workspace.dependencies]` (`{ workspace = true }`). Always the latest stable.
- **Never edit generated files**: `packages/tokens/src/generated/**`, `crates/design-tokens/src/generated/**`, `*.generated.ts`, `src-tauri/gen/**`, lockfiles. Edit `packages/tokens/src` and run `bun run tokens`.
- Tool config lives in `.config/` (Biome needs `--config-path=.config/biome.json`).
- Verify library APIs (Base UI, Tauri, Tailwind v4, moon, Biome) against current docs — don't guess.

## Commands (root)
| Command | What it does |
|---|---|
| `bun run setup` | Install deps, git hooks (lefthook), moon schemas, Rust toolchain |
| `bun run dev` | Launch the example Tauri app (native window + Vite HMR) |
| `bun run build` | Build all projects |
| `bun run package` | Build installers → `release/<app>/<version>/` |
| `bun run test` | bun tests + `cargo test` |
| `bun run check` | Biome, tsc, cspell, knip, clippy, rustfmt, token drift |
| `bun run format` | Biome `--write` + `cargo fmt` |
| `bun run tokens` | Regenerate design tokens (CSS, Tailwind, TS, JSON, Rust) |
| `bun run version` | Bump versions across package.json / Cargo / tauri.conf |
| `bun run new-app <name>` | Scaffold `desktop/<name>` from `.config/moon/templates/tauri-app` |
| `bun run clean` | Remove build output and caches |

Targeted: `bun x moon run <project>:<task>` — projects `root, tokens, design-system, tauri-bridge, config-typescript, config-vite, example`; tasks `typecheck, test, build, check` (tokens), `dev, web-dev, web-build` (apps), `rust-fmt, rust-lint, rust-test, rust-deny, lint, format, spell, knip` (root).

## Layout
```
.claude/  .config/  .github/  .vscode/
crates/{design-tokens,paths,testing,core/<app>}     shared Rust
desktop/<app>/                                      Tauri apps (example = live; others reserved)
packages/{tokens,design-system,tauri-bridge,config-typescript,config-vite}
scripts/bun-commands/<cmd>.ts                        one file per root command
webapp/{github-page,tauri-servers}   tests/e2e   release/   other/{documents,config,licenses,logs,resources}
```
Details: `.claude/rules/monorepo-structure.md` · docs: `other/documents/README.md`.

## Conventions
- Dotted, kebab-case file names: `<subject>.<kind>.<ext>` — `title-bar.component.tsx`, `button.variants.ts`, `button.types.ts`, `use-theme.hook.ts`, `cn.util.ts`, `nord.polar-night.theme.ts`, `build-tokens.ts`, `format-on-edit.hook.ts`. Rust uses `snake_case.rs`.
- TypeScript 7 strictest config; named exports only; `import type`; no `any` / `!` / enums.
- React: function components, `ref` as prop, React Compiler on (follow the Rules of React, no reflexive `useMemo`).
- Styling: token utilities only (`bg-surface`, `text-fg-muted`, `h-control-md`) via `tv()` + `cn()`; no hex, no `dark:`.
- Components: `packages/design-system/src/components/<category>/<name>/{<name>.component.tsx,<name>.variants.ts,<name>.types.ts,index.ts}`; Base UI `render` prop (never `asChild`); `data-slot` on every part; design system never imports Tauri.
- Rust: edition 2024, no `unsafe`/`unwrap`/`expect`, `thiserror` errors, `tracing` logs, logic in `crates/core/<app>`, thin `src-tauri`.
- Window chrome: macOS overlay titlebar + native traffic lights (`tauri.macos.conf.json`); elsewhere `decorations: false` + custom macOS-style traffic lights.
- Commits: Conventional Commits, scopes = project ids + `crates, repo, ci, deps, claude, docs, release`.

## Rules, skills, agents
Rules in `.claude/rules/` load automatically (path-scoped ones when you touch matching files):
`code-standards`, `code-quality`, `monorepo-structure`, `typescript-standards`, `rust-standards`, `design-system` (the UI contract — read before any UI work).

- Skills: `design-system-component`, `tauri-app`, `design-tokens`.
- Commands: `/check`, `/audit`, `/new-component`, `/new-app`, `/tokens`, `/release`.
- Agents: `code-reviewer`, `security-reviewer`, `ui-visual-qa`, `design-system-engineer`, `tauri-rust-engineer`, `docs-writer`, `release-manager`.
- Hooks (`.claude/hooks/*.hook.ts`): format on edit, block generated-file edits, session context.

## Definition of done
`bun run check` + `bun run test` green, no token drift, UI reviewed in both themes, docs updated when behaviour changes.
Record non-obvious choices in `.claude/memory/decisions.md` and gotchas in `.claude/memory/lessons-learned.md`.

@.claude/memory/active-context.md
