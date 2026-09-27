---
title: Settings files
description: Every GENSLATE setting is a commented TOML file you can edit — changes apply the moment you save.
section: Using GENSLATE
order: 2
icon: codicon:settings
---

GENSLATE has no hidden settings database. Each app keeps two plain-text files in
`other/config/genslate/<app>/`:

| File | Holds |
|---|---|
| `config.toml` | Appearance, behaviour and app-specific options |
| `keybindings.toml` | Keyboard shortcuts |

Open them from the Launcher with `/config` and `/keys`, or with any text editor.

## Rules

- **Every key is optional.** Delete a key — or the whole file — to get its default.
- **Changes apply immediately.** Apps watch their files and reload when you save.
- **Mistakes are safe.** Unknown keys are rejected and an invalid file is logged as a warning; the app
  keeps running with defaults instead of crashing.
- **Comments are yours.** The files ship with explanations for every option, and the Launcher keeps
  your comments when it updates a file itself.

## The Launcher's config.toml

```toml
[appearance]
theme = "system"        # system · polar-night · snow-storm
size = "m"              # s (580 px) · m (660 px) · l (760 px)

[behavior]
hide-on-blur = true     # hide when you click another window (never while pinned)
hide-on-launch = true   # hide after starting an app (never while pinned)
pinned = false          # start pinned: always on top, never hides by itself
autostart = false       # start when you sign in

[status]
mode = "temps"          # temps (CPU/GPU °C) · usage (CPU/GPU %, network)

[logging]
level = "info"          # off · error · warn · info · debug · trace
```

## App lists and overrides

The Launcher's tabs are configured in `other/config/appdata/metadata/`: `genslate.toml`,
`portableapps.toml` and `portapps.toml`. Each can hide the tab, change its order, and override
individual apps:

```toml
[apps.explorer]
favorite = true              # pin to Favorites
name = "Files"               # show a different name
category = "Utilities"       # group under a different category
args = ["--new-window"]      # launch arguments
```

The Launcher writes these for you when you favourite, hide or rename an app from its menus.

## Logs

Logs are written to `other/logs/app-logs/<app>/`. Raise `level` to `debug` or `trace` when reporting
a problem, and open the folder with `/logs`.
