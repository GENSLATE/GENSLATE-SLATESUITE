# other/config

Development configuration for GENSLATE apps. Debug builds running from the repo read
`apps/<app>.toml`, or `apps/<group>/<app>.toml` for grouped apps such as `slate/`. Their logs
go to `other/logs/app-logs/<app>/`.

Other builds keep their config elsewhere. `crates/paths` (`genslate-paths`) decides where:

| Mode | Config file | Logs |
|---|---|---|
| dev (debug build inside the repo) | `other/config/apps/[<group>/]<app>.toml` | `other/logs/app-logs/<app>/` |
| installed | `<OS config dir>/<identifier>/<app>.toml` | the OS log dir, the same one Tauri uses |
| portable (`GENSLATE_PORTABLE=1`) | `<exe dir>/<app>-data/config/<app>.toml` | `<exe dir>/<app>-data/logs/` |

Every key is optional. A missing file means defaults. If a file is invalid, the app logs a
warning and starts with defaults.
