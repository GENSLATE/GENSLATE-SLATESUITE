# Active context

_Last updated: 2026-09-27. Update this file at the end of any multi-session task: what changed, what's next, what's blocked._

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

## Open questions
- Code signing / notarisation for macOS and Windows (secrets not configured yet; release workflow builds unsigned drafts).
- Updater (tauri-plugin-updater) — not enabled; `uploadUpdaterJson` is off until signing keys exist.

## Placeholders (reserved names, no code yet)
`webapps/tauri-servers`.
