---
description: Run all quality gates (lint, types, spelling, dead code, Rust, token drift) and fix what fails.
argument-hint: "[--no-fix]"
---

Run `bun run check` from the repo root.

- If everything passes, reply with a one-line summary.
- If something fails and `$ARGUMENTS` does not contain `--no-fix`:
  1. Group failures by tool (biome, tsc, cspell, knip, clippy, rustfmt, tokens:check).
  2. Apply safe automatic fixes first: `bun run format` (Biome + rustfmt). For token drift run `bun run tokens` — never hand-edit generated files.
  3. Fix the remaining issues properly (no `// @ts-ignore`, `biome-ignore`, `#[allow(...)]` or cspell ignores unless the finding is a genuine false positive — then explain why in the suppression comment). Real words go in `.config/cspell/project-words.txt`.
  4. Re-run `bun run check` until green, then summarise what you changed.
- With `--no-fix`, only report failures grouped by tool with `path:line`.
