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

8. **Custom window chrome.** Every app has titlebar (top) · content · status bar (bottom). macOS: `titleBarStyle: Overlay` + `hiddenTitle` with **native** traffic lights (configured in `tauri.macos.conf.json`). Windows/Linux: `decorations: false` with **custom macOS-style traffic lights** from the design system, wired through `@genslate/tauri-bridge`. The native window background is painted from `genslate-design-tokens` to avoid a white flash.

9. **Design system is Tauri-free.** Window chrome components take props/callbacks; only apps talk to `@genslate/tauri-bridge`, which no-ops in a plain browser → components are testable in happy-dom and the showcase runs with `web-dev`.

10. **Pure core, thin shell (Rust).** Per-app logic in `crates/core/<app>`, path resolution (dev / portable / installed) in `genslate-paths`; `src-tauri` is glue. Strict workspace lints (`unsafe_code`, `unwrap_used`, `expect_used` denied).

11. **Supply chain.** Exact pins + committed lockfiles + frozen installs; Dependabot with `cooldown`; dependency-review on PRs; cargo-deny (licences, advisories, sources = crates.io only); GitHub Actions pinned by commit SHA.

12. **Biome over ESLint + Prettier.** One fast tool for lint + format of TS/JSON/CSS, with `useSortedClasses` for Tailwind classes in `cn()`/`tv()`.
