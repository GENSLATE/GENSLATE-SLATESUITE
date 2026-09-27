# Portability: where apps keep their files

GENSLATE apps are **portable**. They keep config, logs, data and user files in folders you can see and
carry around (e.g. on a USB drive) and never write to OS user folders unless they have to.
Directories are resolved by the `genslate-paths` crate (`crates/paths`); apps never hardcode OS folders.

## The shape

Every mode uses the same shape, rooted at a different folder:

```
<root>/
├─ programs/                     launcher installs only
│  ├─ genslate/<app>/            GENSLATE apps (the launcher is programs/genslate/launcher/)
│  ├─ portableapps.com/          PortableApps.com-format apps you add yourself
│  └─ portapps.io/               portapps.io apps you add yourself
├─ other/
│  ├─ config/genslate/<app>/     config.toml + keybindings.toml (hand-editable, hot-reloaded)
│  ├─ config/appdata/metadata/   <app>.toml per-app metadata; genslate/portableapps/portapps.toml tab settings
│  ├─ logs/app-logs/<app>/       log files
│  ├─ databases/genslate/<app>/  durable app state (window state, recents, …)
│  ├─ cache/genslate/<app>/      disposable state (webview profile, icon cache) — safe to delete
│  └─ documents/ licenses/ resources/
└─ storage/users/shared/         your files: Desktop, Documents, Downloads, Music, Pictures, Videos
```

## Modes

| Mode | When | `<root>` |
|---|---|---|
| **Suite** | the app's exe is in `<X>/programs/genslate/<app>/` and `<X>/other/config/` exists | `X` — the launcher install folder (any name) |
| **Dev** | debug build running inside a GENSLATE checkout | the repo (`programs/` and `storage/` come from `desktop/launcher/installDir/`) |
| **Standalone** | the app was extracted from its own zip | the folder containing the app |
| **Fallback** | the app folder is read-only, or macOS runs the app translocated (quarantined) | `<OS data dir>/GENSLATE` |

Precedence: `GENSLATE_INSTALL_DIR` override → suite → dev → standalone → fallback. On macOS the
`.app` bundle is unwrapped first (`X/Foo.app/Contents/MacOS/foo` lives in `X`); on Linux an
AppImage lives in the folder containing the `.AppImage` file.

`resolve()` reads the real environment and creates the folders; `resolve_with(app, &Environment)`
and `detect_layout(&Environment)` take an explicit environment so every mode is unit-tested.

## Keeping the webview portable

Tauri apps create their main window **in code** (the window is declared with `"create": false` in
`tauri.conf.json`) so the webview profile can be pointed at `other/cache/genslate/<app>/webview`.
Otherwise WebView2 writes to `%LOCALAPPDATA%\<identifier>`. The window-state plugin gets an
absolute file name in `other/databases/genslate/<app>/` for the same reason.

Known limit: WKWebView on macOS always keeps its data in `~/Library`.

## Config files

TOML, every key optional, unknown keys rejected. A missing file means defaults; an invalid file
logs a warning and the app starts with defaults. Annotated examples live in
[`other/config/`](../config/README.md).

## Logs

Dev logs are git-ignored (`other/logs/**/*.log`) but their folders are kept. `RUST_LOG` (tracing
`EnvFilter` syntax) overrides the configured level.

## Environment variables

| Variable | Effect |
|---|---|
| `GENSLATE_INSTALL_DIR` | Force suite mode with this folder as the install dir. |
| `GENSLATE_REPO_ROOT` | Dev mode: use this checkout even when the exe/cwd is outside it. |
