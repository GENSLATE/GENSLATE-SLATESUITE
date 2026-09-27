---
title: Launcher
description: The GENSLATE start menu — search, favourites, tabs, slash commands, folders and tools.
section: The apps
order: 1
icon: codicon:rocket
---

The Launcher is where GENSLATE starts. It lives in your tray (the menu bar on macOS), opens with a
global shortcut and finds any app, folder or command as you type.

## Open it

- Press <kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>Space</kbd> anywhere, or
- click the GENSLATE icon in the tray.

It hides again when you click another window or start an app. **Pin** it (<kbd>mod</kbd>
<kbd>P</kbd> or the pin button) to keep it on top and open.

## Find and launch apps

Start typing: the list filters as you type, matching names, descriptions, categories and keywords.
Use <kbd>↑</kbd> <kbd>↓</kbd> and <kbd>Enter</kbd>, or click.

Without a search, apps are grouped:

- **Favorites** — apps you pinned with <kbd>mod</kbd> <kbd>D</kbd> or the star.
- **Recent** — what you opened lately.
- **Categories** — System, Development, Office, Internet, Media, Utilities, AI.
- **Not installed** — GENSLATE apps you don't have yet.

A small dot on an app's icon means it is running.

## Three tabs

| Tab | Shows | Folder |
|---|---|---|
| GENSLATE | GENSLATE apps | `programs/genslate/` |
| PortableApps.com | apps in the PortableApps.com format | `programs/portableapps.com/` |
| portapps | [portapps](https://portapps.io) apps | `programs/portapps.io/` |

Switch with <kbd>mod</kbd> <kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd>. Third-party tabs appear only when
their folder has apps. New apps are picked up automatically; type `/rescan` to look again right away.

## Slash commands

Type <kbd>/</kbd> to turn the search box into a command bar. Suggestions appear as you type and
<kbd>Tab</kbd> completes them.

| Command | Does |
|---|---|
| `/open <app>` | Launch an app |
| `/folder <name>` | Open Desktop, Documents, Downloads, Music, Pictures or Videos |
| `/tab <name>` | Show GENSLATE, PortableApps.com or portapps apps |
| `/fav <app>` | Pin an app to Favorites, or unpin it |
| `/rescan` | Look for new or removed apps |
| `/theme system·dark·light` | Change the theme |
| `/size s·m·l` | Change the window height |
| `/pin` | Keep the Launcher on top and open |
| `/tools` | Open or close Tools |
| `/config` · `/keys` | Edit settings · edit shortcuts |
| `/logs` | Open the log folder |
| `/help` | Shortcuts and commands |
| `/hide` · `/quit` | Hide the Launcher · close it (your apps keep running) |
| `/ask` | Ask the GENSLATE assistant — coming soon |

The same commands are available from the tray menu, and — later — to AI agents, so everything
speaks one vocabulary.

## App menu and properties

Right-click an app (or press <kbd>Shift</kbd> <kbd>F10</kbd>) for **Launch**, **Run with arguments…**,
**Add to Favorites**, **Open folder**, **Hide** and **Properties**. Properties shows the app's
version, location and status.

## Your folders

The rail on the right opens your portable folders — Desktop, Documents, Downloads, Music, Pictures and
Videos in `storage/users/shared/` — in your file manager.

## Status bar

The bottom bar shows the drive the suite lives on and how full it is, plus CPU and GPU temperatures —
or, after a click, usage and network throughput. Readings a platform doesn't expose are simply hidden.

## Tools

<kbd>mod</kbd> <kbd>T</kbd> widens the Launcher into the Tools view. Settings, an app manager, storage
and backup, diagnostics and AI tools will live here.

## Settings

See [settings files](/docs/configuration/) and [keyboard shortcuts](/docs/keyboard-shortcuts/).
