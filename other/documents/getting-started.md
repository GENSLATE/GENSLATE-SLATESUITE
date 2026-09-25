# Getting started

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| [proto](https://moonrepo.dev/proto) | latest | Installs the pinned toolchain from `.prototools` (moon 2.5.5, bun 1.4.2, rust 1.98.1). |
| Git | ≥ 2.40 | |
| Platform deps for Tauri 2 | — | See below. |

Platform dependencies ([Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)):
- **macOS**: Xcode Command Line Tools (`xcode-select --install`).
- **Windows**: Microsoft C++ Build Tools ("Desktop development with C++") and WebView2 (preinstalled on Windows 11).
- **Linux (Debian/Ubuntu)**:
  ```sh
  sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libxdo-dev build-essential curl wget file
  ```

## First run

```sh
git clone https://github.com/ATOMANGELETTI/GENSLATE.git
cd GENSLATE
proto install        # installs moon, bun and rust at the pinned versions
bun run setup        # bun install, git hooks, moon schemas, Rust components
bun run dev          # launches the example Design Kit app with HMR
```

`bun run dev` opens the **Example · Design Kit** window: custom titlebar at the top, a sidebar-navigated showcase of every design-system component in the middle, a status bar at the bottom. Switch between **Polar Night** and **Snow Storm** from the titlebar.

Frontend only (no Rust build, runs in any browser; Tauri calls become no-ops):
```sh
bun x moon run example:web-dev
```

## Everyday loop

```sh
bun run check        # lint, types, spelling, dead code, clippy, rustfmt, token drift
bun run test         # TS + Rust tests
bun run format       # auto-fix formatting
```
Git hooks (lefthook) format staged files, verify tokens and lint commit messages automatically.

## Editor

Open the folder in VS Code and accept the recommended extensions (`.vscode/extensions.json`): Biome, TypeScript Native Preview (TS 7), Tailwind CSS IntelliSense, rust-analyzer, CodeLLDB, Tauri, moon console, Bun. Formatting on save and Tailwind class completion in `cn()` / `tv()` are preconfigured.

## Next

- [Commands](./commands.md) · [Architecture](./architecture.md) · [Design system](./design-system.md)
