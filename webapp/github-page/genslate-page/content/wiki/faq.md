---
title: FAQ
description: Answers to the questions people ask most about GENSLATE.
section: Using GENSLATE
order: 4
icon: codicon:question
---

## Is GENSLATE free?

The source is on [GitHub](https://github.com/genslate/GENSLATE), and you can build every app yourself.
Licensing for public releases will be announced with the first release.

## Does it need an internet connection?

No. The apps work offline. Nothing phones home — there are no accounts and no analytics.

## Does it install anything on my computer?

No installer runs and nothing is added to the Windows registry. Settings, caches and logs stay in the
suite folder; see [portable mode](/docs/portable-mode/) for the one exception on macOS.

## Why are the apps so small?

GENSLATE apps are built with [Tauri](https://v2.tauri.app). Instead of shipping a whole browser engine
with every app, they use the webview that is already part of your operating system, with a small Rust
core for everything else.

## Can I use my existing portable apps?

Yes. Put [PortableApps.com](https://portableapps.com) apps in `programs/portableapps.com/` and
[portapps](https://portapps.io) apps in `programs/portapps.io/`. They appear in their own Launcher
tabs, with icons extracted automatically.

## Where are my settings?

In `other/config/genslate/<app>/config.toml` and `keybindings.toml`. Type `/config` or `/keys` in the
Launcher to open them. See [settings files](/docs/configuration/).

## The global shortcut doesn't work

Another program is probably using <kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>Space</kbd>. Choose another
shortcut in `keybindings.toml` — see [keyboard shortcuts](/docs/keyboard-shortcuts/).

## Windows or macOS won't open the app

Preview builds are not code-signed yet. On Windows choose **More info → Run anyway**; on macOS
right-click the app and choose **Open**. You only need to do this once.

## When will Terminal, Explorer and the others be ready?

They are designed and on the [roadmap](/docs/roadmap/). Watch the repository for releases.

## How do I report a bug?

[Open an issue](https://github.com/genslate/GENSLATE/issues) with your platform, the app version and,
if you can, a log from `other/logs/` with `level = "debug"`.
