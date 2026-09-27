# Architecture

## Overview

```
                    ┌──────────────────────── desktop/<app> ────────────────────────┐
                    │  React 19 UI (Vite 8, React Compiler)      src-tauri (Rust)    │
                    │  ├─ @genslate/design-system  ◄── tokens     ├─ plugins         │
                    │  └─ @genslate/tauri-bridge ── IPC ─────────► ├─ commands ──► crates/core/<app>
                    │                                              └─ window setup ◄─ genslate-design-tokens
                    └────────────────────────────────────────────────────────────────┘
packages/tokens (typed source) ──bun run tokens──► CSS · Tailwind @theme · TS · JSON · Rust (crates/design-tokens)
```

- **moon 2.5** orchestrates every task (caching, dependency graph, affected detection). Workspace config: `.config/moon/`. Shared tasks: `.config/moon/tasks/{all,typescript,tauri}.yml`.
- **bun 1.4** is the package manager, script runner, test runner and runtime. Workspaces: `desktop/*`, `packages/*`, `webapps/*`. Versions are pinned in the root `workspaces.catalog`.
- **Cargo workspace** at the root, owned by the moon `root` project (one project avoids cargo lock contention).

## Projects and layers

| Project | Layer | Tag | May depend on |
|---|---|---|---|
| `config-typescript`, `config-vite` | configuration | `config` | — |
| `tokens` | library | `tokens` | config |
| `design-system` | library | `ui` | tokens, config |
| `tauri-bridge` | library | `bridge` | config |
| `example` (+ future apps) | application | `desktop-app` | any library |

`constraints.tagRelationships` in `.config/moon/workspace.yml` enforces the table. The design system never imports Tauri; only apps use the bridge.

Rust crates: `genslate-app-common` (config sections every app shares + TOML loader, `AppInfo`), `genslate-design-tokens` (generated constants), `genslate-paths` (portable directories: suite/dev/standalone/fallback), `genslate-testing` (helpers), `genslate-core-<app>` (per-app logic). `desktop/<app>/src-tauri` is thin glue.

## Frontend stack

React 19.3 · Vite 8 (shared preset `@genslate/config-vite`: React Compiler via Babel, Tailwind v4 plugin, Tauri env/ports) · Base UI 1.8 · Tailwind CSS 4.3 · tailwind-variants · TypeScript 7 (native `tsc`, type-check only).

## Window anatomy

Every app is **titlebar (top) · content (middle) · status bar (bottom)**, built from the design-system `window` components.

The titlebar is **the same on macOS, Windows and Linux**: every window is frameless (`"decorations": false` in `tauri.conf.json`; there are no per-OS window overrides) and the design-system `TitleBar` draws the **custom macOS-style traffic lights** on the left, wired to `@genslate/tauri-bridge` window controls (red closes, yellow minimizes, green toggles maximize). There are no Windows caption buttons and no native macOS traffic lights. The launcher's own titlebar uses the same `TrafficLights` (close and minimize hide it to the tray; zoom is disabled).

Right-clicking anywhere in a window opens a styled, context-aware menu instead of the webview's own. The design-system `WindowContextMenu` wraps the window and offers window commands and Theme on the titlebar, Edit commands in text fields, Copy/Select All and links in the content, and Copy on status items. Apps add their own rows per area. See [Context menus](./context-menus.md).

At startup the Rust shell paints the native window background with the theme's canvas colour from `genslate-design-tokens` and applies the token minimum size — no white flash while the webview loads. Theme preference (`system | polar-night | snow-storm`) comes from the app config and is synced to the native window theme.

## Data flow

1. UI calls a typed function from `@genslate/tauri-bridge` (e.g. `commands.appInfo()`).
2. The bridge `invoke`s a `#[tauri::command]` (or a plugin) — or no-ops in a plain browser.
3. The command validates input and delegates to `crates/core/<app>`.
4. Errors serialise as `{ kind, message }` (`CommandError`). See [IPC](./ipc.md).

## Generated code

Token outputs are committed and guarded (CI `tokens:check`, lefthook, a Claude Code hook). See [Design system](./design-system.md#tokens).
