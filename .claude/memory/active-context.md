# Active context

_Last updated: 2026-09-25. Update this file at the end of any multi-session task: what changed, what's next, what's blocked._

## Current focus
Bootstrapping the monorepo (wave 0 → 1):
- **Done:** moon 2.5 workspace + bun 1.4 catalog; `@genslate/tokens` generator (CSS, Tailwind `@theme`, TS, JSON, contrast report, Rust); Claude Code setup (`.claude/`), CI/release/security workflows, Biome/cspell/knip/commitlint/cargo-deny configs, docs skeleton.
- **In progress:** `@genslate/design-system` components (window chrome first: TitleBar, WindowControls/traffic lights, StatusBar, AppShell; then actions, inputs, navigation, overlays, feedback, display), `@genslate/tauri-bridge`, `desktop/example` Design Kit showcase, `scripts/bun-commands/*`, `.config/moon/templates/tauri-app`.
- **Next:** screenshot-based visual QA of every showcase section in both themes (`ui-visual-qa` agent), e2e tests in `tests/e2e`, first tagged release of the example app.

## Open questions
- Code signing / notarisation for macOS and Windows (secrets not configured yet; release workflow builds unsigned drafts).
- Updater (tauri-plugin-updater) — not enabled; `uploadUpdaterJson` is off until signing keys exist.

## Placeholders (reserved names, no code yet)
`desktop/{aistudio,browser,coder,command,editor,explorer,gallery,jukebox,launcher,terminal,theater,toolbox}`, `crates/core/slate/*`, `webapp/{github-page,tauri-servers}`.
