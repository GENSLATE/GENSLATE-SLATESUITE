# GENSLATE Terminal

A fast, modern terminal for every shell on the machine: tabs, splits, shell integration, a file
tree that follows `cd`, history and snippets. The assistant is visible as previews ("Coming
soon") but does nothing yet.

Run it with `bun x moon run terminal:dev` (native window, real shells) or
`bun x moon run terminal:web-dev` (plain browser on port 1440, backed by a pretend PowerShell
that runs a handful of commands with realistic output).

## What it does

| Area | Features |
|---|---|
| Shells | Detects PowerShell 7, Windows PowerShell, Command Prompt, every WSL distro, Git Bash, Nushell and the VS developer prompts on Windows; the login shell, bash, zsh, fish, nu and sh elsewhere. Extra shells come from `[[profiles]]` in the config |
| Tabs | New tab per shell (`Ctrl+Shift+1…9`), duplicate, rename, colour, drag to reorder, middle-click close, close others, activity / bell / running / failed marks, session restore with recent output |
| Panes | Split right / down (`Alt+Shift+=` / `Alt+Shift+-`), drag or arrow-key dividers, maximize a pane, even out, move focus with `Alt+arrows`, broadcast typing to every pane in a tab |
| Terminal | xterm.js 6 on WebGL (DOM fallback), 256 colours and true colour, Unicode 11 widths, images (Sixel / iTerm), clickable links and file paths, OSC 52 clipboard, find with case / word / regex, font zoom |
| Shell integration | Command marks in the gutter (green / red by exit code), jump between commands (`Ctrl+Up/Down`), select or copy the last output, save the scrollback, the current folder follows `cd` |
| Side panel | **Files** (tree of the current folder with git status, `cd` on click, insert or copy paths), **Sessions** (every pane's shell, folder and running program with CPU and memory), **Snippets**, **History** (fuzzy search, this folder, failed only), plus **Assistant** and **Workflows** previews |
| Safety | Warns before pasting several lines, `sudo` or `rm -rf`; asks before closing a pane that is running a program |
| Everywhere | Command palette (`Ctrl+Shift+P`), right-click menus per area, settings (`Ctrl+,`), shortcuts sheet (`Ctrl+Shift+/`), status bar with shell, folder, branch, last command and size |

Shortcuts follow Windows Terminal on Windows and Linux (Ctrl+Shift, so Ctrl+C, Ctrl+W and
Ctrl+R still reach the shell) and use ⌘ on macOS.

## AI previews

Nothing here calls a model yet. The previews show where the assistant will live: the sparkle
button in the titlebar, the **Assistant** and **Workflows** side-panel tabs, the **✦ Explain**
chip on a failed command, `#` at an empty prompt (commands from plain words), "Explain the last
error" in the pane menu and the palette's AI group. They come from the command registry's
`soon` entries and the side panel's `preview` panels. Conversations and memories will be kept in
the suite's shared AI database (see Storage), which already exists.

## How it is built

```
crates/storage/              shared SQLite (rusqlite, bundled, FTS5): tuned connections,
                             migrations, the suite's AI memory
crates/core/terminal/        pure Rust: profiles, pty (portable-pty), output tracker (vte),
                             shell-integration scripts, history (SQLite + FTS5), fuzzy ranking
                             (nucleo), snippets, files (ignore), git (gix), process info
                             (sysinfo), watcher (notify), config
desktop/terminal/src-tauri/  thin shell: commands/{context,pty,history,snippets,files}.rs,
                             events, state
desktop/terminal/src/
  ipc/        typed backend (Tauri or the browser mock), payload parsing, events
  engine/     TerminalSession (one xterm per pane), SessionRegistry, PaneStore
  model/      split tree, tabs reducer, OSC parsing, paths, paste review: plain, unit-tested TS
  app/        TerminalProvider (state + actions), command registry, hotkeys, persistence
  features/   tabs, panes, side-panel, palette, dialogs, statusbar, titlebar, context-menu
```

- **Sessions live outside React.** Each pane's xterm is created once and moved, never
  remounted, so splitting, closing and switching tabs keep scrollback and WebGL state. Panes are
  placed absolutely from the split tree.
- **Output is raw bytes.** Each PTY streams through a Tauri channel as binary chunks; xterm
  decodes UTF-8 across chunk boundaries.
- **Shell integration** is injected at spawn (bash, zsh, PowerShell, cmd; fish and Nushell do
  it natively): OSC 133 marks, OSC 633 command lines and OSC 7 folders. The webview draws marks
  from them and the Rust tracker records history from the same bytes.
- **One command registry** (`app/commands.registry.ts`) feeds the palette, menus, shortcuts
  sheet and hotkeys.
- **Second launches** (`genslate-terminal --cwd <path> --profile <id>`) open a tab in the
  running window.

## Storage

Every app keeps its SQLite databases in `other/databases/genslate/<app>/`; suite-wide ones sit in
`other/databases/genslate/shared/`. Both move with the portable install.

- `terminal/history.sqlite`: every finished command with folder, shell, exit code and duration,
  searchable with FTS5. Commands typed with a leading space are never recorded; turn history off
  with `history = false`.
- `shared/ai-memory.sqlite`: conversations, messages and long-term memories for the assistant
  in any app (`genslate_storage::ai_memory`).

## Settings

`[terminal]` in `other/config/genslate/terminal/config.toml`: `default-profile`, `font-family`,
`font-size`, `line-height`, `cursor-style`, `cursor-blink`, `scrollback`, `copy-on-select`,
`right-click`, `paste-warning`, `bell`, `shell-integration`, `restore-session`,
`notify-when-done`, `confirm-close`, `history`. The settings dialog writes them back through
`set_setting` (comments are kept). Snippets live in `snippets.toml` next to it. Open tabs,
splits and recent output are remembered in the webview's storage.

## Known limits

- The native window hasn't been QA'd yet on Windows or macOS.
- Tabs can't be torn out into a new window yet.
- The assistant, `#` commands, Explain and Workflows are previews.
