# GENSLATE Explorer

A fast, keyboard-complete file manager built on the design kit, with room for the assistant:
the AI features are visible as previews ("Coming soon") but do nothing yet.

Run it with `bun x moon run explorer:dev` (native window) or `bun x moon run explorer:web-dev`
(plain browser on port 1434, backed by an in-memory sample file system).

## What it does

| Area | Features |
|---|---|
| Browsing | Tabs (session restored), back / forward / up per tab, breadcrumb path bar with subfolder menus, editable path with completion (`~` expands), type-ahead, live refresh from a folder watcher |
| Views | Details (sortable, resizable columns), Icons (image thumbnails), Tiles; virtualised, so large folders stay smooth |
| Selection | Click, Shift/Ctrl ranges, marquee with edge auto-scroll, select all, keyboard focus cursor |
| Files | New folder / text file, rename in place, duplicate, cut / copy / paste with progress and conflict choice (skip, keep both, replace), drag and drop (Ctrl or ⌥ copies), Trash, delete permanently, Undo |
| Search | Filter as you type; Enter searches the folder recursively (names, globs such as `*.pdf`, optionally file contents), streamed and cancellable |
| Side panel | Tabs: **Files** (favorites, quick access, drives with free space, lazy folder tree), **Git**, **Chat** and **Smart folders** previews |
| Preview pane | Images, audio, video, text and code snippets, folder and multi-selection summaries, locked AI summary card |
| Everywhere | Command palette (`mod+K`), right-click menus per area, properties with folder size, settings, keyboard shortcuts sheet (`F1`) |

## AI previews

Nothing here calls a model yet. The previews show where the assistant will live:
the **Ask** button in the titlebar, the **Chat** side-panel tab (`mod+J`), **Smart folders**,
the **Smart actions** submenu in right-click menus, the preview pane's summary card and the
palette's "AI (coming soon)" group (summarize, organize, find similar, smart rename).
All of these are disabled. They come from the command registry's `soon` entries and the side panel's
`preview` panels, so enabling a feature later means implementing its `run`.

## How it is built

```
crates/core/explorer/        pure Rust: listing, names, ops, trash + undo, transfer, search,
                             previews, places, config, watcher
desktop/explorer/src-tauri/  thin shell: commands/{files,tasks}.rs, the explorer-file:// preview
                             scheme (only folders the UI has listed), events, state
desktop/explorer/src/
  ipc/        typed backend (Tauri or the browser mock), payload parsing, events
  model/      paths, sorting, formatting, selection, the tabs reducer: plain, unit-tested TS
  app/        ExplorerProvider (state + actions), command registry, hotkeys, session storage
  features/   files, navigation, tabs, side-panel, preview, dialogs, palette, context-menu, …
```

- **One command registry** (`app/commands.registry.ts`) feeds the toolbar, menus, palette,
  shortcuts sheet and hotkeys, so a shortcut is defined once. `files`-scoped commands (Copy,
  Delete, …) stay off while typing in a text box.
- **Long work runs as tasks.** Copy/move, search and folder size take an id, report through
  `explorer://progress`, `explorer://search-results`, `explorer://task-done` and
  `explorer://search-done`, and stop with `cancel_task`.
- **Undo** covers create, rename, move, copy and Trash (not delete permanently). Restoring from
  the Trash isn't available on macOS, so Trash isn't undoable there.

## Settings

`[explorer]` in `other/config/genslate/explorer/config.toml`: `view`, `sort-by`, `sort-descending`,
`folders-first`, `show-hidden`, `confirm-trash`, `start-folder`, `restore-tabs`, `preview-pane`.
The settings dialog writes them back through `set_setting`. Open tabs, favorites, the side-panel
tab and column widths are remembered in the webview's storage.

## Known limits

- The file clipboard is in-app only (not shared with the OS file manager yet).
- Dragging files in from other apps isn't supported: the window turns off Tauri's native
  drop handler so HTML drag and drop works inside the app on Windows.
- **Open with** is Windows-only for now.
- Dual-pane view is planned.
