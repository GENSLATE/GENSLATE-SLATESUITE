# ANGELETTI'S INSTRUCTIONS FOR ANTIGRAVITY & GEMINI

## 1. Cardinal Operating Rule: Approval Before Action

- **DO NOT AUTOMATICALLY FIX THINGS.**
- Figure out what to do, explain the diagnosis, and present the proposed diff or solution.
- **ALWAYS ASK ME FOR APPROVAL BEFORE YOU FIX OR DO ANYTHING MAJOR.** Wait for explicit approval before modifying code or running destructive commands.

## 2. Role in this Repository

- **Claude does all the main architectural and feature work.**
- Antigravity / Gemini is invoked **manually on purpose** by Angeletti for:
  - **UI fixes & visual polish** (Nord design system, Base UI 1.8, Tailwind CSS v4, macOS vs Windows window chrome, density & alignment).
  - **Testing** (running unit tests, diagnosing failures, writing tests, proposing fixes).
  - **General work & maintenance** (when not using Claude: checks, audits, dependency verification, documentation).

## 3. Strict Adherence to Project Standards

- **ALWAYS FOLLOW THE RULES, GUIDELINES AND GENERAL PROCESSES SETUP IN THE `.claude/` DIRECTORY.**
  - [Code Standards](../../.claude/rules/code-standards.md)
  - [Code Quality](../../.claude/rules/code-quality.md)
  - [Design System Contract](../../.claude/rules/design-system.md)
  - [Monorepo Structure](../../.claude/rules/monorepo-structure.md)
  - [TypeScript Standards](../../.claude/rules/typescript-standards.md)
  - [Rust Standards](../../.claude/rules/rust-standards.md)

## 4. Tooling & Environment

- **bun is the only package manager and JS runtime.** Always use `bun run <cmd>`, `bun test`, `bun x <bin>`, `bun install`. Never npm, npx, pnpm, yarn, or node.
- Tool versions are pinned in `.prototools` (moon 2.5.5, bun 1.4.2, rust 1.98.1).
- Formatting is handled via Biome (`.config/biome.json`) and rustfmt.

## 5. Never Edit Generated Files

- Never directly modify generated outputs:
  - `packages/tokens/src/generated/**`
  - `crates/design-tokens/src/generated/**`
  - `*.generated.ts`
  - `desktop/*/src-tauri/gen/**`
  - `bun.lock`, `Cargo.lock`
- Edit source files (e.g. `packages/tokens/src/**`) and regenerate using `bun run tokens`.

## 3. Claude InCode Branding

- Never use the name "Claude" in any user-facing text, UI, or documentation. It is an internal agent name only.
- Never using any kind of claude branding in git names, commit messages, or public-facing documentation. Use "GENSLATE" or the specific app name instead.
- Never Say Claude wrote any code or documentation. All code and documentation is authored by the GENSLATE team, with Claude as an internal agent.
- Never do anything that will make claude a contributer to any public repository. Claude is an internal agent and should not be publicly credited.
