---
description: Scaffold a new Tauri desktop app from the moon template with `bun run new-app`.
argument-hint: "<name>  e.g. launcher"
---

Create the desktop app `$ARGUMENTS` by following the `tauri-app` skill (`.claude/skills/tauri-app/SKILL.md`).

1. Validate `<name>`: kebab-case, not already present as `desktop/<name>/moon.yml`. Placeholder folders (`desktop/<name>/.gitkeep`) are expected and fine.
2. Run `bun run new-app $ARGUMENTS` and read its output.
3. Review what was generated (`git status`, then read `desktop/$ARGUMENTS/{moon.yml,package.json,src-tauri/tauri.conf.json,src-tauri/Cargo.toml,src-tauri/capabilities/*.json}`) and confirm: unique bundle identifier, product name, window config (overlay titlebar on macOS / frameless elsewhere), least-privilege capabilities, Cargo workspace membership.
4. Run `bun install`, then `bun x moon run $ARGUMENTS:typecheck` and `cargo check -p <crate name>`.
5. Summarise the new app's files and the next steps (`bun x moon run $ARGUMENTS:dev`, adding a `crates/core/<name>` crate, an `other/config/apps/<name>.toml` example).
