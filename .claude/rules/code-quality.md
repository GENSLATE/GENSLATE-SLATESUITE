# Code quality (all files)

## Definition of done
A change is done when `bun run check` and `bun run test` pass locally, generated tokens have no drift (`bun x moon run tokens:check`), and UI changes were screenshot-reviewed in **both** Nord themes.

## Principles
- **Correct first, then simple.** Prefer the obvious implementation; add abstraction only on the third repetition.
- **Types are the documentation.** Model states with discriminated unions / enums, not boolean soup. Make invalid states unrepresentable.
- **Handle every error path.** No swallowed promises (`void` only with a comment), no empty `catch {}` without a reason, Rust errors via `Result` + `thiserror`.
- **Small units.** Functions do one thing; components under ~200 lines — split into parts or hooks.
- **Pure core, thin shell.** Business logic in `crates/core/*` or plain TS modules; Tauri commands, React components and scripts only orchestrate.
- **No dead code.** knip (`.config/knip.json`) and `cargo machete` must stay clean. Delete instead of commenting out.
- **Comments explain why**, not what. TSDoc / rustdoc on every exported item.
- **Performance by construction.** Animate only transform/opacity; avoid layout thrash; no work in render; keep IPC calls coarse-grained.
- **Accessibility is correctness.** WCAG 2.2 AA, keyboard-complete, visible focus.

## Tests
- TS: `bun test` (+ happy-dom + Testing Library for React). Test behaviour through public APIs; no snapshot tests of markup.
- Rust: unit tests next to the code (`#[cfg(test)] mod tests`), shared fixtures in `crates/testing`.
- Every bug fix gets a regression test.

## Reviews
Use the `code-reviewer` agent for non-trivial changes and `security-reviewer` for anything touching `src-tauri`, IPC, capabilities, workflows or dependencies.
