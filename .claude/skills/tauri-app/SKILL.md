---
name: tauri-app
description: How to add a new GENSLATE Tauri 2 desktop app with `bun run new-app <name>` (moon template .config/moon/templates/tauri-app), wire it into the Cargo workspace, moon, config and packaging, and keep the window chrome consistent (overlay titlebar + native traffic lights on macOS, frameless + custom traffic lights elsewhere). Use when creating or restructuring a desktop app.
---

# Adding a desktop app

Every app under `desktop/<name>/` is a moon project tagged `desktop-app` (it inherits `dev`, `web-dev`, `web-build`, `build` from `.config/moon/tasks/tauri.yml` and `typecheck`/`test` from `typescript.yml`). `desktop/example` is the reference app. Folders with only a `.gitkeep` (`launcher`, `terminal`, `explorer`, …) are reserved names.

## 1. Scaffold
```sh
bun run new-app <name>        # kebab-case, e.g. launcher
```
The script renders `.config/moon/templates/tauri-app` (variables: `name`, `title`, `identifier` like `space.angeletti.genslate.<name>`, `port` — the next free Vite port; HMR uses port + 1) and copies the icons. Under the hood: `moon generate tauri-app --to desktop/<name> -- --name … --title … --identifier … --port …`.

## 2. What you get
```
desktop/<name>/
├── moon.yml  package.json  tsconfig.json  vite.config.ts  index.html
├── src/main.tsx  src/styles/main.css      # React 19 + design-system AppShell (titlebar · content · status bar)
├── tests/unit/
└── src-tauri/
    ├── Cargo.toml  build.rs
    ├── tauri.conf.json                     # shared config (frameless: `decorations: false`)
    ├── tauri.macos.conf.json               # macOS overrides merged on top (overlay titlebar)
    ├── capabilities/*.json                 # least-privilege permissions
    └── src/{main.rs,lib.rs}                # thin shell: plugins + commands delegating to crates/core/<name>
```

## 3. Wire it up
1. `bun install` (links the workspace package).
2. Make sure the Cargo workspace includes it (root `Cargo.toml` `members` covers `desktop/*/src-tauri`).
3. Business logic: create `crates/core/<name>` (crate `genslate-core-<name>`), add it to `[workspace.dependencies]`, unit-test it there.
4. Config example: `other/config/apps/<name>.toml` (read in dev mode via `genslate-paths`); logs go to `other/logs/app-logs/<name>/` in dev.
5. Packaging: add `scripts/bun-commands/package/<name>.ts` if the app needs custom packaging; installers land in `release/<name>/<version>/`.
6. Commit scopes: add `<name>` to `.config/commitlint.config.ts`.

## 4. Window chrome rules
- macOS (`tauri.macos.conf.json`): `"decorations": true`, `"titleBarStyle": "Overlay"`, `"hiddenTitle": true` → native traffic lights; the design-system `TitleBar` reserves `w-traffic-spacer` on the left.
- Windows/Linux (`tauri.conf.json`): `"decorations": false`; the design-system window controls render macOS-style traffic lights wired to `@genslate/tauri-bridge` window controls.
- The window background is painted from `genslate-design-tokens` (Rust) before the webview loads — no white flash.
- Theme: `system | polar-night | snow-storm` via `ThemeProvider`, synced to the native window theme by the bridge.

## 5. Verify
```sh
bun x moon run <name>:typecheck <name>:test
cargo clippy -p <crate> --all-targets --locked -- -D warnings
bun x moon run <name>:dev     # native window + HMR
```
