# Monorepo structure

moon 2.5 orchestrates tasks (`.config/moon/`); bun workspaces cover `desktop/*`, `packages/*`, `webapp/*`; one Cargo workspace (root `Cargo.toml`) owned by the moon `root` project.

```
.claude/            Claude Code: settings, hooks, agents, commands, skills, rules, memory
.config/            moon workspace (moon/), biome, cspell, knip, commitlint, cargo/ (config, deny, mutants, tarpaulin)
.github/            CI, release, security workflows · dependabot · templates · Copilot instructions
crates/             shared Rust crates
  app-common/         shared app foundations: config sections + loader, AppInfo (genslate-app-common)
  design-tokens/      generated token constants (window background, …)
  paths/              portable config/data/log dirs: suite · dev · standalone · fallback
  testing/            test helpers
  core/<app>/         per-app business logic (plain Rust, unit-tested)
desktop/<app>/      Tauri 2 apps (moon tag `desktop-app`): `example` (Design Kit), `launcher`, and the suite apps
                    (aistudio, browser, coder, command, editor, explorer, gallery, jukebox, terminal, theater, toolbox) — titlebar · home (name + version) · status bar, ready to build on
packages/
  tokens/             Nord design tokens + generator (`bun run tokens`)
  design-system/      React 19 components (Base UI + Tailwind v4 + tailwind-variants)
  tauri-bridge/       typed window controls, platform, theme sync, IPC (no-ops in a browser)
  config-typescript/  shared tsconfigs (TS 7 native compiler)
  config-vite/        shared Vite 8 preset (React Compiler, Tailwind, Tauri env)
scripts/bun-commands/ one file per root `bun run <command>`
webapp/             websites (github-page) and servers (tauri-servers)
tests/e2e/          end-to-end tests
release/            packaged installers `release/<app>/<version>/` (git-ignored)
other/              documents/, config/{genslate/<app>,appdata/metadata}/*.toml, licenses/, logs/, databases/, cache/, resources/ (ships verbatim in the launcher suite)
```

## Dependency rules (moon `tagRelationships`, enforced)
- `ui` (design-system) → only `tokens`, `config`.
- `bridge` (tauri-bridge) → only `config`.
- `tokens` → only `config`.
- Apps may depend on any library. Libraries never depend on apps. The design system never imports Tauri.

## Where things go
| You are adding… | Put it in |
|---|---|
| A reusable UI component | `packages/design-system/src/components/<category>/<name>/` |
| A colour / size / motion value | `packages/tokens/src/**`, then `bun run tokens` |
| A Tauri API wrapper | `packages/tauri-bridge/src/` |
| App business logic | `crates/core/<app>/` |
| A root command | `scripts/bun-commands/<name>.ts` + a `package.json` script |
| A moon task for all TS projects / all apps | `.config/moon/tasks/typescript.yml` / `tauri.yml` |
| Tool config | `.config/` (only files a tool can't find there stay at the root: `bunfig.toml`, `rustfmt.toml`, `rust-toolchain.toml`, `.prototools`, `lefthook.yml`) |
| Docs | `other/documents/` |
