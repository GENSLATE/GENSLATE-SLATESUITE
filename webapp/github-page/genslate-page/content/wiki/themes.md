---
title: Themes & appearance
description: Polar Night, Snow Storm or follow your system — and how every app switches together.
section: Using GENSLATE
order: 1
icon: codicon:color-mode
---

GENSLATE ships two themes built from the official [Nord](https://www.nordtheme.com) palette:

- **Polar Night** — the dark theme, on Nord's deep blue-greys.
- **Snow Storm** — the light theme, on Nord's soft whites.

Both are first-class: every component is designed, contrast-checked (WCAG 2.2 AA) and reviewed in both.

## Choose a theme

In the Launcher, type `/theme` and pick **system**, **dark** or **light**. Or set it in
`other/config/genslate/launcher/config.toml`:

```toml
[appearance]
# "system" follows the OS · "polar-night" (dark) · "snow-storm" (light)
theme = "system"
```

`system` follows your operating system's light or dark mode and switches live when it changes.

## Window size

The Launcher comes in three heights. Type `/size` or set:

```toml
[appearance]
# "s" (580 px) · "m" (660 px) · "l" (760 px)
size = "m"
```

## Accessibility

- Every control has a visible keyboard focus ring.
- Animations respect your system's **reduce motion** setting.
- Windows High Contrast (forced colours) lets the system palette through.
- Text scales with your system and browser font-size preferences.

## Colours in detail

The full palette and how each colour is used — surfaces, accents and status — is on the
[Design Kit](/design/) page.
