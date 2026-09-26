# IPC (frontend ↔ Rust)

Apps never call `@tauri-apps/api` from UI code directly. They use **`@genslate/tauri-bridge`**, which gives typed functions and safe fallbacks when the frontend runs in a plain browser (`bun x moon run example:web-dev`).

## The bridge

| Export | Purpose |
|---|---|
| `isTauri()` | `true` inside a Tauri webview |
| `detectPlatform()` / `Platform` | `macos` · `windows` · `linux` · `web` — drives `html[data-platform]` and chrome layout |
| `useWindowControls()` | minimize / toggle maximize / close / start dragging, plus `isMaximized` / `isFocused` state |
| `useSystemTheme()`, `setNativeTheme()` | follow the OS theme and sync the native window theme with the app theme |
| `commands` | typed wrappers for the app's Rust commands and plugins (`commands.appInfo()`, `commands.openExternal(url)`) |
| `CommandError`, `isCommandError()` | the typed rejection shape |

The design system stays Tauri-free: apps pass bridge callbacks/state into window components (`onMinimize`, `onToggleMaximize`, `onClose`, `isMaximized`, `isFocused`, `platform`).

## Adding a command

1. **Core logic** in `crates/core/<app>` — plain Rust, unit-tested.
2. **Command** in `desktop/<app>/src-tauri/src/commands/<name>.rs`:
   ```rust
   /// Returns the product name, versions, OS/arch and build profile.
   #[tauri::command]
   pub fn get_app_info<R: Runtime>(app: AppHandle<R>) -> Result<AppInfo, AppError> { … }
   ```
   Register it in `lib.rs` with `tauri::generate_handler![commands::<name>::<fn>]` (full module path).
3. **Errors**: return `Result<T, AppError>`. `AppError` (`thiserror`) serialises as `{ kind, message }` with a stable `kind` (`missing-config`, `paths`, …) — never leak secrets or absolute paths in `message`.
4. **Permissions**: app commands are allowed by default for the app's windows; plugin APIs need explicit entries in `src-tauri/capabilities/*.json` (least privilege — e.g. `opener:allow-open-url` scoped to `https://*`).
5. **Typed wrapper** in `packages/tauri-bridge/src/ipc/commands.ts`, with a browser fallback (`null` or a web equivalent), and its result type in `src/ipc/*.types.ts`.
6. **Tests**: Rust unit tests for the core; bun tests for the wrapper's browser fallback.

## Conventions

- Command names are `snake_case` verbs (`get_app_info`); wrapper names are camelCase (`appInfo`).
- Arguments are owned and validated on the Rust side; paths are canonicalised and checked against `genslate-paths` roots.
- Keep calls coarse-grained (one call per user action, not per render).
- Events (`emit`/`listen`) are typed in the bridge too, and every `listen` is paired with its `unlisten` in effect cleanup.
