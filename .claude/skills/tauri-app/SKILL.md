---
name: tauri-app
description: How to add a new GENSLATE Tauri 2 desktop app with `bun run new-app <name>` (moon templates .config/moon/templates/{tauri-app,app-core}), wire it into the Cargo workspace, moon, config and packaging, give it an icon from the GENSLATE icon family, and keep the window chrome consistent (frameless + the custom macOS-style traffic lights titlebar on every OS). Use when creating or restructuring a desktop app.
---

# Adding a desktop app

Every app under `desktop/<name>/` is a moon project tagged `desktop-app` (it inherits `dev`, `web-dev`, `web-build`, `build` from `.config/moon/tasks/tauri.yml` and `typecheck`/`test` from `typescript.yml`). `desktop/example` is the Design Kit reference app and `desktop/launcher` the suite launcher; the suite apps (`aistudio`, `browser`, `coder`, `command`, `editor`, `explorer`, `gallery`, `jukebox`, `terminal`, `theater`, `toolbox`) were generated from the template and are the starting points for their full UIs.

## 1. Scaffold
```sh
bun run new-app <name>        # kebab-case, e.g. notes
```
The script renders two templates (with `moon generate`, or its own Tera-subset renderer when moon can't load the workspace offline):
- `.config/moon/templates/tauri-app` → `desktop/<name>` — variables `name`, `title` (default `GENSLATE <metadata name>`), `identifier` (`space.angeletti.genslate.<name>`), `port` (next free Vite port; HMR = port + 1), `description` and `category` (defaults from `other/config/slatesuite/metadata/<name>.toml`).
- `.config/moon/templates/app-core` → `crates/core/<name>` (crate `genslate-core-<name>`), added to `[workspace.dependencies]` in the root `Cargo.toml` (members already glob `crates/core/*`).

It also writes `other/config/slatesuite/apps/<name>.{config,keybindings}.toml`, the launcher metadata and `other/logs/app-logs/<name>/` when missing, a placeholder icon when `other/resources/icons/genslate/<name>.svg` is missing, runs `bun install`, and generates `src-tauri/icons` from the SVG (`bun run tauri icon`, desktop sizes only).

Template files are Tera: never write `{{`, `{%` or `{#` in them except for variables (hoist JSX object literals such as `windowState={…}` into a variable). `scripts/tests/template.test.ts` renders both templates and fails on leftovers.

## 2. What you get
```
desktop/<name>/
├── moon.yml  package.json  tsconfig.json  vite.config.ts  index.html
├── src/main.tsx  src/styles/main.css
├── src/app/          app.component (AppShell) · app.providers (design system ↔ bridge) · app.meta (id, name, version, icon)
├── src/features/     titlebar/ (icon + name, theme toggle) · home/ (icon, app name, version) · statusbar/ (app, theme, platform · runtime, version) · context-menu/ (AppContextMenu: right-click menus for the whole window)
├── tests/unit/app.test.tsx                 # titlebar, name + version, status bar, theme toggle + hotkey
└── src-tauri/
    ├── Cargo.toml  build.rs  icons/
    ├── tauri.conf.json                     # the only config, every OS (frameless: `decorations: false`)
    ├── capabilities/main.capability.json   # least-privilege permissions
    └── src/{main,lib,window,error}.rs + commands/app_info.rs   # thin shell on genslate-core-<name>
crates/core/<name>/src/{lib,config}.rs      # Config = shared sections (genslate-app-common) + the app's own
```
The version shown comes from `get_app_info` (`useAppInfo()` in `@genslate/tauri-bridge`), falling back to `package.json` in a browser.

## 3. Wire it up
1. Business logic goes in `crates/core/<name>`; add the app's own config sections next to `appearance`/`window`/`logging` in its `Config` (and document them in `other/config/slatesuite/apps/<name>.config.toml`).
2. Icon: replace a placeholder glyph in `other/resources/icons/genslate/<name>.svg` (icon family: nord1 plate with nord2 rim, Snow Storm line work with a 40 % secondary layer, one signature Nord accent that matches `color` in the metadata), then `bun run tauri icon ../../other/resources/icons/genslate/<name>.svg` in `desktop/<name>` and delete `src-tauri/icons/{android,ios}`.
3. Packaging: add `scripts/bun-commands/package/<name>.ts` if the app needs custom packaging; installers land in `release/<name>/<version>/`.
4. Commit scopes: add `<name>` to `.config/commitlint.config.ts`; add a `<name>-web` entry to `.claude/launch.json`.

## 4. Window chrome rules
- One titlebar on every OS: `"decorations": false` in `tauri.conf.json`, and no `tauri.<os>.conf.json` window overrides (no macOS overlay titlebar, no native traffic lights).
- The design-system `TitleBar` always renders the custom macOS-style traffic lights on the left, wired to `@genslate/tauri-bridge` window controls. Never add Windows-style caption buttons.
- Right-click menus: `app.component` wraps the `AppShell` in `AppContextMenu` (the design-system `WindowContextMenu` wired to the bridge's window controls and `openExternal`). Add app rows through its `items`, and mark areas with `data-context-zone` / `data-context-copy` / `data-context-menu="none"`. See `other/documents/context-menus.md`.
- The window background is painted from `genslate-design-tokens` (Rust) before the webview loads — no white flash.
- Theme: `system | polar-night | snow-storm` via `ThemeProvider`, synced to the native window theme by the bridge.

## 5. Verify
```sh
bun x moon run <name>:typecheck <name>:test
cargo clippy -p <crate> --all-targets --locked -- -D warnings
bun x moon run <name>:dev     # native window + HMR
```
