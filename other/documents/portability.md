# Portability: config, data and logs

Directories are resolved by the `genslate-paths` crate (`crates/paths`); apps never hardcode OS folders.

| Mode | When | Config file | Logs |
|---|---|---|---|
| **Dev** | debug build running inside a GENSLATE checkout | `<repo>/other/config/apps/[<group>/]<app>.toml` | `<repo>/other/logs/app-logs/<app>/` |
| **Portable** | `GENSLATE_PORTABLE=1` | `<exe dir>/<app>-data/config/<app>.toml` | `<exe dir>/<app>-data/logs/` |
| **Installed** | otherwise | `<OS config dir>/<bundle identifier>/<app>.toml` | OS log directory (same as Tauri's) |

`resolve()` reads the real environment; `resolve_with(Environment)` takes an explicit environment so every mode is unit-tested.

## Portable mode

Set `GENSLATE_PORTABLE=1` (environment, or `.env` in dev — see `.env.example`) to keep everything next to the executable, e.g. on a USB drive. Nothing is written to the user profile.

## Config files

TOML, every key optional, unknown keys rejected. Example app keys: `[appearance] theme`, `[window] remember-state`, `[logging] level`. Annotated examples: [`other/config/`](../config/README.md).

## Logs

Dev logs are git-ignored (`other/logs/**/*.log`) but their folders are kept. `RUST_LOG` (tracing `EnvFilter` syntax) overrides the configured level.

## Installed identifiers

Bundle identifiers follow `space.angeletti.genslate.<app>` (e.g. `space.angeletti.genslate.example`), which names the OS config/data folders.
