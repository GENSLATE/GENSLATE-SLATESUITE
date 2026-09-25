# scripts

Every root command is a bun TypeScript file in `bun-commands/`, wired up in the root
`package.json` `scripts`. Run them with `bun run <command>`; every command supports `--help`.

| Command | What it does |
|---|---|
| `bun run setup` | `bun install`, `moon sync` + config schemas, lefthook hooks, Rust version and Tauri system-library checks. |
| `bun run dev [app] [--web]` | Runs an app (default `example`) in a native window with Vite HMR; `--web` runs only the web UI in a browser. |
| `bun run build [app…] [--web] [--debug]` | `tauri build` for the named apps, or all of them (`vite build` with `--web`). |
| `bun run package [app…] [--all] [--debug] [--skip-build]` | `tauri build`, then copies the installers from `target/<profile>/bundle/**` to `release/<app>/<version>/` with `checksums.sha256` and `manifest.json`. |
| `bun run test [--ts] [--rust]` | bun tests for every workspace package (plus `scripts/tests`) and `cargo test --workspace`. |
| `bun run check [--ts] [--rust]` | Every CI gate: typecheck, biome, cspell, knip, token drift, rustfmt, clippy. |
| `bun run format [--check]` | biome `--write` and `cargo fmt`. |
| `bun run tokens [--check]` | Regenerates design tokens from `packages/tokens` (CSS, Tailwind theme, TS, JSON, Rust). |
| `bun run version <patch\|minor\|major\|x.y.z> [--dry-run]` | Bumps every `package.json`, the Cargo workspace version and literal `tauri.conf.json` versions. |
| `bun run new-app <name>` | Scaffolds `desktop/<name>` from `.config/moon/templates/tauri-app`, using the next free port pair. |
| `bun run clean [--all] [--dry-run]` | Removes `dist`, coverage, moon cache; `--all` also runs `cargo clean` and deletes `node_modules`. |

## moon or direct

`dev`, `build`, `test` and `check` run through moon when it can load the workspace. moon
downloads its WASM toolchain plugins on first use, so offline or behind a strict proxy it may
not start. The commands then warn and run bun and cargo directly, with the same result.
`--direct` (or `GENSLATE_NO_MOON=1`) forces the direct path.

## Layout

```
scripts/
├── bun-commands/   one file per root command
├── lib/            shared helpers
│   ├── args.ts       defineCommand(): parsing, --help, exit codes
│   ├── apps.ts       desktop app discovery (desktop/*/src-tauri/tauri.conf.json)
│   ├── log.ts        coloured output (respects NO_COLOR / FORCE_COLOR)
│   ├── moon.ts       moon availability check + `moon run`
│   ├── paths.ts      repo root, release/ and target/
│   ├── projects.ts   bun workspace package discovery (tsconfig, tests, DOM preload)
│   ├── run.ts        Bun.spawn wrapper (inherited stdio, exit codes, capture)
│   └── template.ts   renderer for the moon template syntax subset (new-app fallback when moon can't run)
└── tests/          bun tests for the helpers
```

## Adding a command

1. Create `bun-commands/<name>.ts` with `await defineCommand({ name, summary, options, run })`.
2. Add `"<name>": "bun scripts/bun-commands/<name>.ts"` to the root `package.json` `scripts`.
3. Document it in the table above.
