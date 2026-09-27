---
title: Install & run
description: Download the suite or a single app, unzip it anywhere and start the Launcher.
section: Get started
order: 2
icon: codicon:cloud-download
---

GENSLATE does not need an installer. You unzip a folder and run the app inside it.

> [!NOTE]
> The first public release is being prepared. Until builds are published on
> [GitHub Releases](https://github.com/genslate/GENSLATE/releases), you can
> [build from source](#build-from-source) in a few minutes.

## Choose a package

**The suite** contains the Launcher and every available app, plus your portable folders. Use it if
you want the whole GENSLATE desktop on one drive.

**A single app** contains one app in its own folder. It works on its own and can join the suite
later — move its folder into `programs/genslate/`.

## Windows

1. Download the `.zip` for your processor (x64 or ARM64).
2. Right-click it, choose **Extract All…**, and pick any folder — a USB drive works well.
3. Open the folder and run the Launcher.

GENSLATE uses the Microsoft Edge **WebView2** runtime, which is built into Windows 11 and installed on
most Windows 10 PCs.

> [!WARNING]
> Preview builds are not code-signed yet. If SmartScreen says *Windows protected your PC*, choose
> **More info → Run anyway** once.

## macOS

1. Download the `.zip` for Apple silicon or Intel and open it.
2. Move the app anywhere you like — on an external drive, keep it inside the suite folder.
3. The first time, right-click the app and choose **Open** so Gatekeeper lets an unsigned preview run.

Requires macOS 10.15 Catalina or later.

## Linux

Download the **AppImage**, make it executable and run it:

```sh
chmod +x GENSLATE-Launcher.AppImage
./GENSLATE-Launcher.AppImage
```

`.deb` and `.rpm` packages are planned for people who prefer them. GENSLATE needs WebKitGTK 4.1,
which current Ubuntu, Debian, Fedora and Arch releases provide.

## Start the Launcher

Press <kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>Space</kbd> from anywhere, or click the GENSLATE icon in the
tray (the menu bar on macOS). Start typing to find an app. See the [Launcher guide](/docs/launcher/).

## Build from source

You need [proto](https://moonrepo.dev/proto), Git and the
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform.

```sh
git clone https://github.com/genslate/GENSLATE.git
cd GENSLATE
proto install        # moon, bun and Rust at the pinned versions
bun run setup        # dependencies, git hooks, Rust components
bun x moon run launcher:dev
```

`bun run package` builds portable zips into `release/<app>/`. The
[developer guide](/docs/developers/getting-started/) has the details.

## Update or uninstall

To update, replace the app folders with the new ones — your settings live in `other/` and are kept.
To uninstall, delete the folder.
