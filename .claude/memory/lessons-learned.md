# Lessons learned

Things that cost time once. Add a bullet when something surprising bites; keep each to one or two lines with the fix.

## Tooling
- **Biome ignores `.config/biome.json` unless told.** Always pass `--config-path=.config/biome.json`. Also exclude the config file itself from `files.includes` (`!!.config/biome.json`), otherwise Biome reports "nested root configuration" when scanning the repo.
- **Biome expands arrays in `package.json`** by default; the config overrides `expand: "auto"` for `**/package.json` so bun-written manifests stay compact.
- **`useLiteralKeys` fights `noPropertyAccessFromIndexSignature`.** TS requires `process.env['X']`; the Biome rule is disabled.
- **cargo-deny 0.20:** `--config` is a global flag — `cargo deny --config .config/cargo/deny.toml check`, not after `check`.
- **Don't alias `cargo deny`** in `.config/cargo/config.toml`: an alias named like an installed subcommand shadows it. The alias is `cargo deny-check`.
- **Imports in bun scripts:** no `.ts` extensions (TS would need `allowImportingTsExtensions`).
- **Cargo workspace globs must match something** — `desktop/*/src-tauri` errors while no app has a `src-tauri`.
- **Example config is strict:** `crates/core/example` deserialises `other/config/apps/example.toml` with `deny_unknown_fields`; only add keys the Rust struct knows.

## Claude Code
- Hooks run with `$CLAUDE_PROJECT_DIR`; exit 2 blocks and feeds stderr to Claude; any other failure should exit 0 (fail open).
