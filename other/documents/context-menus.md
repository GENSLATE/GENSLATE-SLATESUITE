# Context menus

Every GENSLATE window has its own right-click menu instead of the webview's (Back, Reload, Inspect…). One design-system component, `WindowContextMenu`, wraps the whole window, reads what was clicked and shows the matching rows. Apps add their own rows per area.

## What the user sees

| Right-click on… | Rows |
|---|---|
| **Titlebar** | the app's rows · Theme ▸ (Polar Night · Snow Storm · Match System) · Minimize · Zoom (macOS) / Maximize · Restore · Close Window |
| **Text field** (input, textarea, `contenteditable`) | Undo · Redo — Cut · Copy · Paste · Delete — Select All |
| **Link** | Open Link (when the app can open it) · Copy Link Address |
| **Content** | Copy “value” (from `data-context-copy`) · Copy (selected text) · Select All (when the area is selectable) · Theme ▸ |
| **Status bar** | the app's rows · Copy “value” of the item under the pointer |

The app's rows always come first, then the built-in groups, separated by hairlines. Empty groups never leave a stray separator. A menu with nothing in it doesn't open at all.

Rows are disabled rather than hidden when they don't apply. For example:
- Cut, Copy and Delete are disabled without a selection.
- Paste, Cut, Undo and Redo are disabled in read-only fields.
- Cut and Copy are always disabled in password fields.

Undo/Redo use the platform shortcut hint (Redo is Ctrl+Y on Windows, ⇧⌘Z elsewhere).

**Keyboard:** Shift+F10 and the Menu (ContextMenu) key open the menu for the focused element. Focus returns to the text field when the menu closes.

**Webview menu:** hidden everywhere, portals included. With `allowNativeMenu` (the apps set it in dev builds), Shift+right-click still opens the webview's own menu, so Inspect stays one click away while developing.

## Adding it to an app

The suite apps and the `tauri-app` template already do this in `src/features/context-menu/app-context-menu.component.tsx`:

```tsx
import { useToast, WindowContextMenu } from '@genslate/design-system';
import { commands, useWindowControls } from '@genslate/tauri-bridge';

export function AppContextMenu({ children }: { readonly children: ReactNode }) {
  const { minimize, toggleMaximize, close } = useWindowControls();
  const toast = useToast();
  const report = (error: unknown) => toast.add({ title: 'Clipboard unavailable', type: 'error' });
  return (
    <WindowContextMenu
      allowNativeMenu={import.meta.env.DEV}
      onMinimize={() => void minimize()}
      onToggleMaximize={() => void toggleMaximize()}
      onClose={() => void close()}
      onOpenLink={(href) => void commands.openExternal(href).catch(report)}
      onError={report}
    >
      {children}
    </WindowContextMenu>
  );
}
```

Wrap the whole window, including titlebar, content and status bar, once, inside the design-system providers:

```tsx
<AppContextMenu>
  <AppShell titlebar={…} statusbar={…}>…</AppShell>
</AppContextMenu>
```

The design system stays Tauri-free: window commands, link opening and the clipboard are callbacks. Leave a callback out and its row disappears.

## Marking up the window

The menu picks the area from the DOM, so apps steer it with data attributes:

| Attribute | Effect |
|---|---|
| `data-context-zone="<name>"` | Names the area. `TitleBar` sets `titlebar` and `StatusBar` sets `statusbar`. Any other name (for example `rail` or `sidebar`) is passed to `items` as `target.zone`, and Select All then selects that zone. |
| `data-context-copy="<text>"` | The value that Copy “…” copies. On status items it replaces the item's text; use it for icon-only items or values that differ from the label. |
| `data-context-menu="none"` | No menu at all on this element and its children. The webview menu stays hidden too. |

Chrome that sets `user-select: none` (titlebar, status bar, most app chrome) never offers Copy or Select All. Its content menu shows only the app's rows and Theme.

A nested `ContextMenu` inside the window, such as the launcher's per-app row menu, wins over the window menu.

## App rows

`items(target)` returns rows for the area that was clicked, or `null` for none. The target is a discriminated union, `field | titlebar | statusbar | content`, with `zone`, the clicked `element` and the details of each kind (selected text, link, copy text, read-only…):

```tsx
<WindowContextMenu
  items={(target) =>
    target.kind === 'titlebar' ? (
      <ContextMenuItem icon="codicon:layout-sidebar-left" shortcut="mod+b" onClick={toggleSidebar}>
        Show Sidebar
      </ContextMenuItem>
    ) : target.zone === 'rail' ? (
      <ContextMenuItem icon="codicon:folder-opened" onClick={() => openFolder(target.element)}>
        Open Folder
      </ContextMenuItem>
    ) : null
  }
/>
```

Give every app row an `icon` so it lines up with the built-in rows.

What the apps add:
- **Launcher:**
  - Titlebar: Pin on Top / Unpin, Open Tools, Help. Close is relabelled Hide to Tray (`labels={{ close: 'Hide to Tray' }}`).
  - Status bar: Show Usage / Show Temperatures (when sensors report temperatures), Open Settings File.
  - Documents rail: Open <Folder>.
  - Its per-app row menu is unchanged. Theme changes are written to `config.toml`.
- **Design Kit:**
  - Titlebar and status bar: Search Components…, Show/Hide Sidebar, Open/Close Appearance Inspector.
  - The **Window › Window Context Menu** page demonstrates every area.

## Props

| Prop | Default | Purpose |
|---|---|---|
| `items` | none | The app's rows per target, shown first. |
| `onMinimize` · `onToggleMaximize` · `onClose` | none | Titlebar window rows. Each row is shown only when its callback is set. |
| `onOpenLink` | none | Adds Open Link. Without it, links only offer Copy Link Address. |
| `clipboard` | `navigator.clipboard` | `{ writeText, readText? }` for Cut, Copy and Paste. Paste is disabled without `readText`. |
| `onError` | none | A clipboard read or write failed. Show a toast; it never throws. |
| `hideTheme` | `false` | Drops the Theme submenu (apps with a fixed theme). |
| `allowNativeMenu` | `false` | Shift+right-click opens the webview menu (dev builds). |
| `onOpenChange` | none | The menu opened or closed. The launcher uses it to keep its click-through window solid while a menu is open. |
| `labels` | English | Overrides any row label (for example `close`, `copyValue`, `themeSystem`). |
| `platform` · `glass` | provider · `false` | Shortcut hints and labels per OS, and the translucent macOS material. |

Also exported: `resolveContextTarget(element)` (the target the menu would build for an element) and `NO_MENU_SELECTOR`.

## How editing works

Edit commands run on the field that was right-clicked. Its selection is snapshotted when the menu opens and restored before each command, because opening the menu moves focus. Commands go through `document.execCommand`, which keeps the browser's undo stack and fires React's input events. Where `execCommand` is unavailable, the command falls back to `setRangeText` plus a dispatched `input` event and the clipboard adapter.

**Known limitation:** Paste reads the webview clipboard, so the OS or webview may ask for permission the first time. Passing a `clipboard` backed by Tauri's clipboard plugin would remove the prompt.

## Tests

`packages/design-system/tests/unit/window/window-context-menu.test.tsx` covers:
- area detection;
- the rows per area and their disabled states;
- Cut, Copy and Paste through a mock clipboard, and clipboard errors;
- links;
- app rows and opt-outs;
- Shift+F10 and `allowNativeMenu`;
- that no stray separator or empty menu appears.
