---
paths:
  - "**/*.rs"
  - "**/Cargo.toml"
  - "crates/**"
  - "desktop/*/src-tauri/**"
---

# Rust standards

- Toolchain **1.98.1**, edition **2024**, resolver 3 (`rust-toolchain.toml`, synced from `.prototools` by moon).
- Every crate inherits `[workspace.package]` and `[lints] workspace = true`. The workspace denies `unsafe_code`, `unwrap_used`, `expect_used`, `dbg_macro`; clippy `all` + `pedantic` are warnings and CI runs with `-D warnings`.
- Dependencies: only via root `[workspace.dependencies]` (`foo = { workspace = true }`), latest stable, `default-features = false` where it trims the tree. `cargo deny --config .config/cargo/deny.toml check` must pass (licences, advisories, sources).
- Crate names are `genslate-<name>`; per-app logic in `crates/core/<app>` (`genslate-core-<app>`).

## Errors & logging
- Library errors: `thiserror` enums, one per crate/module (`error.rs`). Tauri commands return `Result<T, E>` where `E: serde::Serialize` with a stable, user-safe message.
- No `panic!`/`unwrap`/`expect` outside tests; use `?` and context-carrying error variants.
- Logging with `tracing` (or `log` via `tauri-plugin-log`); never `println!` (clippy `print_stdout` warns).

## Tauri
- `src-tauri` is thin: builder, plugins, window setup, commands that delegate to core crates.
- Commands take owned, validated arguments; paths are canonicalised and checked against `genslate-paths` roots.
- Capabilities (`capabilities/*.json`) are least-privilege; update them in the same change as a new command/plugin.
- Window background colour comes from `genslate-design-tokens` so the first frame matches the theme.

## Style & tests
- `rustfmt.toml` (max width 100, 2024 style). rustdoc on every public item; module docs (`//!`) describe the why.
- Unit tests in `#[cfg(test)] mod tests` next to the code; shared helpers in `genslate-testing`. Design APIs to be testable without Tauri (inject environment, e.g. `genslate_paths::resolve_with`).
- Run: `bun x moon run root:rust-fmt root:rust-lint root:rust-test` (or `cargo fmt-check`, `cargo lint`, `cargo t`).
