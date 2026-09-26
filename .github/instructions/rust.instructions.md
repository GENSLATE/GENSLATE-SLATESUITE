---
applyTo: "**/*.rs,**/Cargo.toml"
---

# Rust / Tauri

- Rust 1.98.1, edition 2024; every crate uses `[lints] workspace = true` and `version.workspace = true` etc.
- Denied: `unsafe_code`, `unwrap_used`, `expect_used`, `dbg_macro`. Clippy pedantic must be clean (`-D warnings` in CI). Use `?` with `thiserror` error enums; `tracing` for logs, never `println!`.
- Add dependencies only to root `[workspace.dependencies]` and reference with `{ workspace = true }`.
- Business logic lives in `crates/core/<app>` (plain Rust, unit-tested); `desktop/<app>/src-tauri` is thin glue (builder, plugins, commands delegating to core).
- `#[tauri::command]` functions return `Result<T, E>` with a serializable, user-safe error and validate every argument; paths come from `genslate-paths`.
- Keep `capabilities/*.json` least-privilege; update them with any new command or plugin.
- Window chrome: macOS overlay titlebar with native traffic lights (`tauri.macos.conf.json`), `decorations: false` elsewhere; window background colour from `genslate-design-tokens`.
- Tests in `#[cfg(test)] mod tests`; helpers in `genslate-testing`.
