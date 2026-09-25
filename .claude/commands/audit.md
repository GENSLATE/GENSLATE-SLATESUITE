---
description: Full repo audit — run every quality gate, then review code, security and design-system conformance.
argument-hint: "[path or project id to focus on]"
---

Audit the GENSLATE monorepo. Optional focus (path or project id): $ARGUMENTS

1. **Gates** — run and record pass/fail with the first relevant error of each:
   - `bun run check` (biome, typecheck, cspell, knip, clippy, rustfmt, tokens drift)
   - `bun run test`
   - `cargo deny --config .config/cargo/deny.toml check` (skip if cargo-deny is not installed; say so)
2. **Reviews** — delegate in parallel:
   - `code-reviewer` over the focus area (or the whole repo's recently changed files: `git log --since=2.weeks --name-only`).
   - `security-reviewer` over `desktop/*/src-tauri/**`, `packages/tauri-bridge/**`, `.github/workflows/**` and dependency manifests.
   - Check design-system conformance yourself: grep `packages/design-system/src` and `desktop/*/src` for raw hex colours, `dark:` variants, Tailwind default palette classes (`gray-`, `slate-`, `zinc-`…), `asChild`, `forwardRef`, default exports, and `@tauri-apps` imports inside the design system.
3. **Consistency** — versions: `.prototools` ↔ `rust-toolchain.toml` ↔ CI; every npm dep uses `catalog:`; every crate dep uses `workspace = true`; file names follow the dotted convention.
4. **Report** — one table: `Area | Status | Findings (path:line) | Suggested fix`, ordered by severity, then a 3-bullet "fix first" list. Do not fix anything unless asked.
