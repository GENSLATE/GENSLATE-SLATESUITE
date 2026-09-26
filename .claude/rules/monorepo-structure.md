# Monorepo structure

moon 2.5 orchestrates tasks (`.config/moon/`); bun workspaces cover `desktop/*`, `packages/*`, `webapp/*`; one Cargo workspace (root `Cargo.toml`) owned by the moon `root` project.

```
.claude/            Claude Code: settings, hooks, agents, commands, skills, rules, memory
.config/            moon workspace (moon/), biome, cspell, knip, commitlint, cargo/ (config, deny, mutants, tarpaulin)
.github/            CI, release, security workflows · dependabot · templates · Copilot instructions
crates/             shared Rust crates
  design-tokens/      generated token constants (window background, …)
  paths/              config/data/log dirs: dev · portable · installed
  testing/            test helpers
  core/<app>/         per-app business logic (plain Rust, unit-tested)
desktop/<app>/      Tauri 2 apps (moon tag `desktop-app`); `example` is live, others are reserved placeholders
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
other/              documents/, config/apps/*.toml examples, licenses/, logs/, resources/
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
