# Active context

_Last updated: 2026-09-29. Update this file at the end of any multi-session task: what changed, what's next, what's blocked._

## Current focus: GENSLATE Launcher (`desktop/launcher`)
Plan: `~/.claude/plans/whimsical-doodling-swing.md` (approved). Milestones:
- **Done (uncommitted on `main`):**
  - M1 housekeeping (portapps.io rename, template folders, gitignore for runtime data, removed `crates/core/slate/*`).
  - M2 `genslate-paths` rewrite (suite/dev/standalone/fallback), example + template migrated, portable webview/window-state.
  - M3 `bun run package` → portable zips + `release/.archive/` rotation; verified end to end (standalone + suite).
  - M4–M8 (most): `crates/core/launcher` (config, catalog for GENSLATE/PortableApps.com/portapps.io, icon extraction, secure launch, recents, command registry, telemetry, watcher; 52 tests), `desktop/launcher/src-tauri` shell (transparent click-through window, tray, global hotkey, autostart, hot reload, `launcher-icon://`, IPC), UI (bezel frame, tabs, grouped/searchable list, context menu, slash bar + AI teaser, rail, tools "Coming Soon", help/properties/run-with-args, status bar), browser mock (`launcher-web` in `.claude/launch.json`).
  - Icon family: `other/resources/icons/genslate/*.svg`; metadata for every reserved app.
- **Next:**
  - Run the real window (`bun x moon run launcher:dev`) and QA show/hide, tray toggle, blur, click-through, tools expand on Windows; then macOS/Linux.
  - Generate bundle icons from the SVGs (`bun tauri icon other/resources/icons/genslate/<app>.svg` per app).
  - Visual QA pass in both themes (`ui-visual-qa` agent), polish.
  - M10: suite staging (`bun run package --suite`), NSIS light installer, 4-target CI matrix.
  - M11: docs (`other/documents/launcher.md`), code/security review.
- **Known:** Ctrl+Alt+Space may be taken by another app (logged, not fatal) — change it in `keybindings.toml`.

## Suite apps scaffolded (2026-09-27)
- All 11 reserved apps are real Tauri apps generated from the refreshed template: titlebar · home (icon, name, version) · status bar; each with `crates/core/<app>`, config stubs, launch config (`<app>-web`) and bundle icons.
- New shared crate `crates/app-common` (config sections, loader, `AppInfo`); `useAppInfo()` in the bridge; new icon family for the 11 apps.
- **Next:** build each app's real UI and core logic; run each natively once (`bun x moon run <app>:dev`) on Windows/macOS to QA chrome and icons.

## One titlebar on every OS (2026-09-27)
- All apps (template included) are frameless on macOS, Windows and Linux; `tauri.macos.conf.json` files are gone (the macOS minimum version moved to `tauri.conf.json`). `TitleBar` always renders the custom traffic lights; `WindowControls`, the `controls` prop and the `traffic-spacer` token were removed. The launcher's titlebar uses `TrafficLights` too.
- **Next:** run an app natively on macOS and Windows to QA drag, double-click maximize, minimize and the (square) frameless corners on macOS.

## Context menus (2026-09-27)
- `WindowContextMenu` (design system) wraps every app: launcher, Design Kit, the 11 suite apps and the `tauri-app` template (`src/features/context-menu/`). Docs: `other/documents/context-menus.md`.
- **Next:** back Paste with Tauri's clipboard plugin (the webview clipboard may prompt); QA the menus natively on macOS/Windows.

## Tray menu (2026-09-27)
- Right-click on the launcher's tray icon opens a styled design-system menu in its own transparent window (`tray-menu.html`, `src-tauri/src/tray_menu.rs`): header, Show, Pin, Recent ▸, Favorites ▸, Folders ▸, Appearance ▸, Settings ▸, Help, Quit. Linux keeps a native menu with the same rows. Docs: `other/documents/context-menus.md#the-launchers-tray-menu`.
- **Next:** QA it natively on Windows (taskbar bottom/left/top, 125–150 % scaling) and macOS (menu bar); check focus loss closes it and a second right-click repositions it.

## Explorer (2026-09-28, branch `feat/explorer-app-n2wyjx`)
- Full file manager in `desktop/explorer` + `crates/core/explorer`: tabs, details/icons/tiles, search, transfers with conflicts, Trash + Undo, preview pane, side-panel tabs (Files, and Git/Chat/Smart previews), palette, menus, settings. AI features are previews only. Docs: `other/documents/explorer.md`.
- **Next:** run it natively on Windows/macOS (thumbnails via `explorer-file://`, watcher, Trash, Open with); dual-pane view; OS clipboard and drag-in; implement the AI previews.

## Terminal (2026-09-29, branch `feat/terminal-app-bk0kcb`)
- Full terminal in `desktop/terminal` + `crates/core/terminal`: detected shells and config profiles, portable-pty sessions streamed over a Tauri channel, xterm.js 6 (WebGL), tabs, splits, shell integration (OSC 133/633/7 scripts for bash, zsh, PowerShell, cmd), history in SQLite (FTS5), snippets, a Files panel that follows `cd` (ignore, gix, notify), sessions (sysinfo), palette, settings. AI features are previews. Docs: `other/documents/terminal.md`.
- New shared crate `crates/storage` (rusqlite bundled + migrations): every app's databases go in `other/databases/genslate/<app>/`, suite-wide ones (the AI memory) in `other/databases/genslate/shared/` (`AppPaths::shared_data_dir`).
- **Next:** run it natively on Windows (ConPTY shutdown, WSL list decoding, Git Bash registry lookup, PowerShell 5.1 script, cmd `9;9` folder reporting) and macOS; tab tear-out; the real assistant (genai / llama-cpp-2) on top of `genslate_storage::ai_memory`.
- **Gotcha:** a full `cargo test --workspace` build can fill a cloud container's disk (~27 GB `target/`); test the changed crates with `CARGO_PROFILE_TEST_DEBUG=0`.

## Open questions
- Code signing / notarisation for macOS and Windows (secrets not configured yet; release workflow builds unsigned drafts).
- Updater (tauri-plugin-updater) — not enabled; `uploadUpdaterJson` is off until signing keys exist.

## Placeholders (reserved names, no code yet)
`webapps/tauri-servers`.
