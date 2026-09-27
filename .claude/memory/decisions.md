# Architecture decisions

Short ADR log. Newest last. Format: **Decision** — context → consequence. Add an entry whenever a choice would surprise a new contributor.

## 2026-09 · Foundation

1. **moon 2.5 + bun 1.4 for everything.** moon orchestrates tasks/caching/affected-detection across TS and Rust; bun is the single package manager, script runner, test runner and JS runtime (no Node toolchain, no npm/pnpm). Tool versions live only in `.prototools`; npm versions only in the root `workspaces.catalog` (exact pins, `catalog:` references); crate versions only in `[workspace.dependencies]`. → one place to bump, reproducible CI via `moonrepo/setup-toolchain` + `bun install --frozen-lockfile`.

2. **Config lives in `.config/`.** moon workspace, Biome, cspell, knip, commitlint and Cargo (`.cargo/config.toml` only `include`s `.config/cargo/config.toml`) are there. Files a tool can only discover at the root stay there (`bunfig.toml`, `rustfmt.toml`, `rust-toolchain.toml`, `.prototools`, `lefthook.yml`). Biome does **not** auto-discover `.config/biome.json`, so every invocation passes `--config-path=.config/biome.json`.

3. **Base UI (`@base-ui/react` 1.8) + Tailwind CSS v4 + tailwind-variants** for the design system. Base UI gives unstyled, accessible primitives with a `render` prop and rich `data-*` state attributes (no Radix `asChild`); Tailwind v4's CSS-first `@theme` consumes generated tokens directly; `tv()` slot recipes keep variants typed. A token-aware tailwind-merge config (generated) resolves custom utility conflicts.

4. **Single typed token source → generated outputs.** `packages/tokens/src` (TypeScript) generates CSS variables, the Tailwind `@theme inline`, TS constants, JSON, a WCAG contrast report and a Rust crate (`crates/design-tokens`). Generated files are committed (reviewable diffs, no build step for consumers) and guarded: CI `tokens:check`, lefthook, and a Claude PreToolUse hook.

5. **Official Nord themes.** Polar Night = dark, Snow Storm = light, Frost = accent, Aurora = status only. Themes switch via `html[data-theme]` (`polar-night | snow-storm`, plus `system` preference) — no `dark:` variants.

6. **React 19.3 + React Compiler** (babel-plugin-react-compiler via `@rolldown/plugin-babel` in the shared Vite 8 preset). → no manual memoisation; code must follow the Rules of React.

7. **TypeScript 7 native compiler** (`typescript@7`, Go-based `tsc`) for type-checking only (`noEmit`); bun/Vite strip types at runtime/build. Strictest options incl. `exactOptionalPropertyTypes` and `erasableSyntaxOnly`.

8. **Custom window chrome, one titlebar on every OS.** Every app has titlebar (top) · content · status bar (bottom). All windows are frameless (`decorations: false`) on macOS, Windows and Linux, and the design system's **custom macOS-style traffic lights** are the only window controls, wired through `@genslate/tauri-bridge` (2026-09-27: dropped the macOS overlay titlebar with native lights and the Windows caption buttons — `WindowControls`, the `controls` prop and the `traffic-spacer` token are gone — so every app looks identical everywhere). Trade-off: on macOS the frameless window loses the native rounded corners and the green light maximizes rather than entering native full screen. The native window background is painted from `genslate-design-tokens` to avoid a white flash.

9. **Design system is Tauri-free.** Window chrome components take props/callbacks; only apps talk to `@genslate/tauri-bridge`, which no-ops in a plain browser → components are testable in happy-dom and the showcase runs with `web-dev`.

10. **Pure core, thin shell (Rust).** Per-app logic in `crates/core/<app>`, portable path resolution (suite / dev / standalone / fallback) in `genslate-paths`; `src-tauri` is glue. Strict workspace lints (`unsafe_code`, `unwrap_used`, `expect_used` denied).

11. **Supply chain.** Exact pins + committed lockfiles + frozen installs; Dependabot with `cooldown`; dependency-review on PRs; cargo-deny (licences, advisories, sources = crates.io only); GitHub Actions pinned by commit SHA.

12. **Biome over ESLint + Prettier.** One fast tool for lint + format of TS/JSON/CSS, with `useSortedClasses` for Tailwind classes in `cn()`/`tv()`.

13. **Portable-only apps.** `genslate-paths` modes are Suite (`<installDir>/programs/genslate/<app>/` + `other/config/` → installDir, any name), Dev, Standalone (beside the exe) and Fallback (OS data dir, only when read-only/translocated). The old Installed mode and `GENSLATE_PORTABLE` are gone. Webview data goes to `other/cache/genslate/<app>/webview` (windows created in code, `"create": false`).

14. **Releases.** `bun run package` writes portable archives to `release/<app>/`; the previous build moves to `release/.archive/<app>/YYYY-MM-DD_HH-MM/`. Metadata `[build]`/`[exe]` are stamped into the *packaged copy* only. Archives use OS tools (tar.exe zip / ditto / tar.gz) because `Bun.Archive` can't set file modes.

15. **Launcher window = fixed-size transparent window + click-through.** Tauri 2.11 has no atomic move+resize, so instead of resizing, the window is always expanded-width; the UI animates the frame with `clip-path` reveals + transforms, and `src-tauri/src/window.rs` polls the cursor (~60 Hz, only while visible) to toggle `set_ignore_cursor_events` outside the frame (whole window while a popup is open). Frame shadow = CSS `drop-shadow` on the stage (follows the clip). Frame inset 16 px so the shadow is never cut.

16. **Launcher IPC takes ids, never paths.** Apps are launched by `AppId` (`<source>/<key>`) resolved through the catalog, canonicalised with `dunce` and required to be inside `programs/` (or `target/debug` in dev). Icons are served by id via `launcher-icon://`. Webview capability: `core:default`, window dragging, os, log — no shell/fs/opener.

17. **Launcher DTO types are hand-written** (`desktop/launcher/src/ipc/launcher.types.ts`) with boundary type guards (`launcher.parse.ts`) instead of ts-rs codegen — one less build step; keep them in step with the Rust structs.

18. **AI-ready command registry.** Every launcher action is an `ActionSpec` (id, params, `Effect`) in `genslate-core-launcher::actions`; the slash bar lists them and `run_action` executes them — the same entry point a future agent/MCP server will use, gated by `Effect`.

## 2026-09 · Suite apps

19. **Every suite app starts from the template.** `aistudio, browser, coder, command, editor, explorer, gallery, jukebox, terminal, theater, toolbox` were generated with `bun run new-app` (ports 1424–1444, HMR +1): titlebar (icon + name, theme toggle) · home view (icon, app name, version) · status bar (app, theme, platform · runtime, version). Each has its own `crates/core/<app>` so business logic has a home from day one.

20. **Shared app foundations in `genslate-app-common`.** The `[appearance]`/`[window]`/`[logging]` config sections, the generic TOML loader (missing file → defaults) and `AppInfo` live there; each `crates/core/<app>` composes the sections into its own `Config` (serde `flatten` can't be combined with `deny_unknown_fields`, so composition is by field). → 12 apps don't each carry ~250 lines of identical config code, and app-specific sections sit next to the shared ones.

21. **`useAppInfo()` lives in `@genslate/tauri-bridge`.** Fetching `get_app_info` once is identical in every app, so it's a bridge hook (null in a browser; callers fall back to `package.json`).

22. **GENSLATE icon family = dark plate + one accent.** Every app icon (`other/resources/icons/genslate/<app>.svg`) is a flat nord1 plate with a nord2 rim on the Big Sur grid, Snow Storm line work (secondary layer at 40 %) and one signature Nord accent — the icon-sized version of the design kit's "Polar Night surfaces, one accent" rule, matching the launcher mark and the Design Kit icon. The accent is the app's `color` in its launcher metadata. Bundle icons (`src-tauri/icons`) are generated from the SVG with `bun run tauri icon` (desktop sizes only).

## 2026-09 · Website

23. **The website is Vite + React, prerendered — not a docs framework.** `webapps/genslate-page` renders the real design system, so every route is prerendered with `renderToString` (`scripts/build-site.ts`) and hydrated, with a tiny base-path-aware router and one chunk per page. No Astro/Next/React Router → no new framework, SEO-friendly static HTML on GitHub Pages, and the site looks exactly like the apps.

24. **App pictures are live mockups, not screenshots.** Planned apps have no UI yet, so each app page shows an `inert` mockup built from design-system components at a fixed window size and scaled with pure CSS (`scale: tan(atan2(100cqw, W))` — no JS measuring, no hydration shift). Real screenshots replace a mockup once the app ships (the Design Kit already uses them).

25. **Docs are rendered from the repo at build time.** `other/documents/*.md` is the single source for developer docs; the user wiki lives in `content/wiki/`. `Bun.markdown` + Shiki's CSS-variables theme (mapped to Nord per theme in `nord.syntax.css`) produce one highlighted HTML for both themes with zero client JS. The site's app catalogue is tested against `other/config/appdata/metadata/*.toml` so it can't drift from the launcher.

26. **GitHub Pages base path is configurable.** A repo named `GENSLATE` publishes as a project site (`/GENSLATE/`); the Pages workflow feeds `actions/configure-pages`' `base_path`/`origin` into `GENSLATE_SITE_BASE`/`GENSLATE_SITE_ORIGIN`, so renaming the repo to `<owner>.github.io` or adding a custom domain needs no code change. Each page gets a CSP that hashes its exact inline scripts (theme bootstrap, Base UI's pre-hydration Slider script).

## 2026-09 · Context menus

27. **One window-level right-click menu, not one per component.** The design-system `WindowContextMenu` wraps the whole window once and resolves what was clicked (text field, titlebar, status item, link, content) into a typed target; apps add rows through `items(target)` and steer it with `data-context-zone` / `data-context-copy` / `data-context-menu="none"`. Nested `ContextMenu`s (the launcher's app rows) still win because Base UI's trigger stops the event. → Every app gets consistent menus with one wrapper, the webview's menu never leaks, and the design system stays Tauri-free (window commands, links and clipboard are callbacks).

## 2026-09 · Cursors

28. **Themed cursors are native CSS cursors, not a JS follower.** `cursor.tokens.ts` draws a 32px SVG family per theme; the generator emits `--gs-cursor-*` (`url(data:…) x y, <keyword>`) and redefines Tailwind's static `cursor-*` utilities with `@utility` (Tailwind keeps its keyword declaration first, so it doubles as the fallback). → no pointer lag, nothing to mount, every app gets it from `design-system.css`. Controls use the new `cursor-interactive` (Frost arrow, with a glyph-coloured inner edge so it stays readable on accent buttons); the hand is for links only. `.select-text` regions keep the arrow, because CSS can't target text nodes and whole pages are selectable. `[data-cursor="system"]` and forced colours hand every cursor back to the OS (custom images ignore the OS pointer size).

## 2026-09 · Tray menu

29. **The launcher's tray menu is a webview window, not a native menu.** Native tray menus can't be styled, so on Windows and macOS a right-click opens a hidden, pre-created, transparent `tray-menu` window that draws the design-system `Menu` (with the new `MenuHeader` and `media` rows). Placement is a pure function (`geometry::tray_menu_placement`): open away from the tray's edge, clamp to the work area, and send the anchor to the UI. Linux trays report no clicks, so Linux keeps a native menu with the same rows, rebuilt on catalog/settings/pin events. The window's capability is least-privilege: `build.rs` generates `allow-<command>` permissions (`AppManifest`), so each capability lists exactly the commands its window may call.
