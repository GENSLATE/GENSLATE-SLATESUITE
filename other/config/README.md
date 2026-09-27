# other/config

Configuration for GENSLATE apps. These files ship with the launcher suite
(`<installDir>/other/config/`) and are meant to be edited by hand. Apps pick up changes when you
save.

| Path | What |
|---|---|
| `genslate/<app>/config.toml` | The app's settings. Every key is optional; delete a key to get its default. |
| `genslate/<app>/keybindings.toml` | The app's keyboard shortcuts. |
| `appdata/metadata/<app>.toml` | How the launcher shows a GENSLATE app (name, description, category, colour). Version and build fields are filled in when the app is packaged. |
| `appdata/metadata/genslate.toml`, `portableapps.toml`, `portapps.toml` | Launcher tab settings and your per-app overrides (favorites, hidden apps, custom names, launch arguments). |

An invalid file logs a warning and the app starts with defaults. Where the whole `other/` folder
lives depends on how the app runs — see [portability](../documents/portability.md).
