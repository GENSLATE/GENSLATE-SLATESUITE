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
- **App configs are strict:** every `crates/core/<app>` deserialises `other/config/slatesuite/apps/<app>.config.toml` with `deny_unknown_fields` (a test parses the repo file); only add keys the Rust structs know.
- **Webview data leaks out of portable folders:** WebView2 defaults to `%LOCALAPPDATA%\<identifier>`. Declare the main window with `"create": false` and build it in code with `WebviewWindowBuilder::from_config(..).data_directory(<cache>/webview)` (macOS ignores it; WKWebView always uses `~/Library`).
- **tauri-plugin-window-state writes to `app_config_dir()`** — pass an *absolute* `with_filename(..)`: the plugin does `app_config_dir().join(filename)` and `Path::join` with an absolute path replaces the base.
- **No atomic move+resize in Tauri 2.11:** `set_size` and `set_position` are separate calls (no `set_bounds`), so a window that grows leftwards shows one intermediate frame — hide it in the webview (right-anchored content, transparent window) or use a second window.
- **moon templates are Tera:** a JSX object literal like `windowState={{ a, b }}` in `.config/moon/templates/**` is parsed as a Tera expression — hoist it into a variable. `scripts/tests/template.test.ts` catches leftovers.
- **moon can't load the workspace offline** (it downloads WASM toolchain plugins from ghcr.io); scripts fall back to direct bun/cargo, and `GENSLATE_NO_MOON=1` skips the probe.
- **13 Tauri test binaries fill a small disk:** a full debug `cargo test --workspace` needs ~30 GB (ld dies with SIGBUS when the disk is full). CI's rust job sets `CARGO_PROFILE_DEV_DEBUG=0` (~4 GB); do the same locally (plus `CARGO_INCREMENTAL=0`) when disk is tight.
- **`bun x tauri` outside an app folder fetches an unrelated npm package** — run the CLI as `bun run tauri …` inside `desktop/<app>` (the `tauri` script uses the app's own `@tauri-apps/cli`).
- **`cargo clippy` errors can vanish behind the progress bar** in captured output — run with `CARGO_TERM_PROGRESS_WHEN=never` and `--color never`.
- **Tauri's `freezePrototype: true` blanks the Terminal window**: `@xterm/addon-webgl` assigns `toString` on an object when its module loads, which throws once `Object.prototype` is frozen, so nothing renders (a plain browser hides it). `desktop/terminal` keeps it `false`; reproduce with a Playwright init script `Object.freeze(Object.prototype)` against `vite:dev`.
- **IDE Sync hides hook output:** when a push hook fails, VS Code / GitHub Desktop show only `failed to push some refs`; the real reason is in the Git output log (VS Code: Git → Show Git Output). Keep hooks fast and read that log first.
- **Git hooks are shared by every worktree** (`.git/hooks`): a `lefthook install` from a linked worktree bakes that worktree's path into the hooks. Run it from the main checkout only, and remove worktrees with `git worktree remove` (a deleted folder leaves a stale hook and gitdir behind).
- **Windows-only Rust failures aren't caught by CI** (the rust job runs on ubuntu): run `cargo test -p <crate>` on Windows after touching path or separator logic.

## Claude Code
- Hooks run with `$CLAUDE_PROJECT_DIR`; exit 2 blocks and feeds stderr to Claude; any other failure should exit 0 (fail open).
