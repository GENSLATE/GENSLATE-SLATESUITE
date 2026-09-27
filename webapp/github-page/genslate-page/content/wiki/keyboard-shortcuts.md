---
title: Keyboard shortcuts
description: Every Launcher shortcut, and how to change them in keybindings.toml.
section: Using GENSLATE
order: 3
icon: codicon:record-keys
---

GENSLATE is keyboard-complete: everything you can click, you can also reach from the keyboard.
`mod` means <kbd>Ctrl</kbd> on Windows and Linux and <kbd>⌘</kbd> on macOS.

## Launcher

| Shortcut | Action |
|---|---|
| <kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>Space</kbd> | Show or hide the Launcher — works everywhere |
| <kbd>mod</kbd> <kbd>K</kbd> | Focus the search box |
| <kbd>↑</kbd> <kbd>↓</kbd> | Move through apps and suggestions |
| <kbd>Enter</kbd> | Launch the app, or run the command |
| <kbd>/</kbd> | Start a slash command |
| <kbd>Tab</kbd> | Complete the highlighted slash command |
| <kbd>Shift</kbd> <kbd>F10</kbd> or the Menu key | Open the highlighted app's context menu |
| <kbd>mod</kbd> <kbd>1</kbd> · <kbd>2</kbd> · <kbd>3</kbd> | GENSLATE · PortableApps.com · portapps tab |
| <kbd>mod</kbd> <kbd>D</kbd> | Add or remove the highlighted app from Favorites |
| <kbd>mod</kbd> <kbd>P</kbd> | Pin: keep the Launcher on top and open |
| <kbd>mod</kbd> <kbd>T</kbd> | Open or close Tools |
| <kbd>Esc</kbd> | Clear the search, go back, then hide |

## This website

| Shortcut | Action |
|---|---|
| <kbd>mod</kbd> <kbd>K</kbd> or <kbd>/</kbd> | Search apps, guides and docs |

## Change a shortcut

Open `keybindings.toml` with `/keys`, edit and save — the change applies immediately.

```toml
[global]
# Works anywhere, even when the launcher is hidden. Ctrl, Alt, Shift, Super plus a key.
toggle = "Ctrl+Alt+Space"

[launcher]
# While the launcher is open. "mod" is Ctrl on Windows/Linux and ⌘ on macOS.
focus-search = "mod+k"
toggle-tools = "mod+t"
toggle-pin = "mod+p"
toggle-favorite = "mod+d"
tab-genslate = "mod+1"
tab-portableapps = "mod+2"
tab-portapps = "mod+3"
```

An empty string (`""`) turns a shortcut off.

> [!TIP]
> If <kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>Space</kbd> does nothing, another app has probably claimed
> it. The Launcher logs the conflict and keeps running — pick a different `toggle`.
