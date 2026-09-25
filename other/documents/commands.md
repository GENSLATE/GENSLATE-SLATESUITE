# Commands

Every root command is `bun run <name>` → `bun scripts/bun-commands/<name>.ts`. Use **bun** for everything — never npm, npx, pnpm or node.

## Root commands

| Command | What it does |
|---|---|
| `bun run setup` | First-time/after-pull setup: `bun install`, lefthook git hooks, moon config schemas, Rust components. |
| `bun run dev` | Launches the example Tauri app (native window + Vite HMR). |
| `bun run build` | Builds every project (frontends and Rust). |
| `bun run package` | Builds release installers and copies them into `release/<app>/<version>/`. |
| `bun run test` | Runs the TypeScript (bun test) and Rust (`cargo test`) suites. |
| `bun run check` | All quality gates: Biome, TypeScript, cspell, knip, clippy, rustfmt, token drift. |
| `bun run format` | Biome `check --write` + `cargo fmt`. |
| `bun run tokens` | Regenerates design tokens (CSS, Tailwind theme, TS, JSON, Rust). |
| `bun run version` | Bumps the version across `package.json`, `Cargo.toml` and `tauri.conf.json` files. |
| `bun run new-app <name>` | Scaffolds `desktop/<name>` from the moon template `.config/moon/templates/tauri-app`. |
| `bun run clean` | Removes build output and caches. |

## moon tasks

Run with `bun x moon run <project>:<task>` (several at once: `bun x moon run a:b c:d`; all projects: `:task`).

| Project | Tasks |
|---|---|
| `root` | `rust-fmt`, `rust-lint` (clippy `-D warnings`), `rust-test`, `rust-deny`, `rust-machete`, `lint` (Biome), `format`, `spell` (cspell), `knip` |
| `tokens` | `build` (generate), `check` (fail on drift), `typecheck`, `test` |
| `design-system`, `tauri-bridge` | `typecheck`, `test` |
| `config-vite` | `typecheck` |
| `example` (and every `desktop-app`) | `dev`, `web-dev`, `web-build`, `build`, `typecheck`, `test` |

CI runs `moon ci`, which only executes tasks affected by the change.

## Direct tools

| Need | Command |
|---|---|
| Lint/format specific files | `bun x biome check --config-path=.config/biome.json --write <files>` |
| Spell-check | `bun x cspell --config .config/cspell.json <files>` |
| Dead code | `bun x knip --config .config/knip.json` |
| Rust shortcuts (`.config/cargo/config.toml`) | `cargo lint`, `cargo fmt-check`, `cargo t`, `cargo docs`, `cargo deny-check`, `cargo cov`, `cargo mutants-ws` |
| Commit message check | `bun x --bun commitlint --config .config/commitlint.config.ts --edit` |
