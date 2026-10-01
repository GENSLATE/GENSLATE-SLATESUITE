---
title: Portable mode
description: Where GENSLATE keeps settings, data and your files — and why nothing is scattered across the computer.
section: Get started
order: 3
icon: codicon:package
---

Every GENSLATE app keeps its files in folders you can see. Move the folder and the apps, their
settings and your documents move with it.

## The suite folder

```text
GENSLATE/
├─ programs/
│  ├─ genslate/            GENSLATE apps (the Launcher is programs/genslate/launcher/)
│  ├─ portableapps.com/    PortableApps.com apps you add yourself
│  └─ portapps.io/         portapps apps you add yourself
├─ other/
│  ├─ config/              settings: slatesuite/apps/<app>.config.toml and <app>.keybindings.toml
│  ├─ logs/                log files
│  ├─ databases/           window state, recents and other durable state
│  └─ cache/               disposable data — safe to delete
└─ storage/users/shared/   your Desktop, Documents, Downloads, Music, Pictures and Videos
```

The folder can have any name and live on any drive.

## How an app finds its folder

When an app starts it looks at where its executable is:

| You run it… | GENSLATE uses |
|---|---|
| from `programs/genslate/<app>/` inside a suite folder | the suite folder |
| from its own single-app folder | that folder |
| from a read-only location (a locked share, a quarantined macOS download) | a `GENSLATE` folder in your user data directory |

The embedded webview's profile is kept in `other/cache/` rather than in your user profile, and window
positions are saved in `other/databases/`.

> [!NOTE]
> On macOS, the system webview (WKWebView) always keeps a small amount of website data in
> `~/Library`. Everything GENSLATE itself writes stays in the suite folder.

## Carrying it between computers

Plug in the drive, open the Launcher and carry on — recents, favourites, window positions and
settings come with you. The Launcher finds apps relative to itself, so the drive letter or mount
point does not matter.

## Backups

Back up the whole folder, or just `other/config/` for settings and `storage/` for your files.
`other/cache/` never needs a backup.

## For power users

Two environment variables override detection: `GENSLATE_INSTALL_DIR` forces suite mode with a given
folder, and `GENSLATE_REPO_ROOT` is for developers running from a checkout. The full rules are in the
developer [portability guide](/docs/developers/portability/).
