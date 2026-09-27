import {
  Badge,
  Menu,
  MenuHeader,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from '@genslate/design-system';
import { useEffect, useId, useState } from 'react';

import { useLauncher } from '../../app/launcher.context';
import markUrl from '../../assets/genslate-mark.svg';
import type { TrayMenuAnchor } from '../../ipc/launcher.types';
import { describeInstall, favoriteApps, recentApps } from './tray-menu.model';
import {
  TrayAppearanceSubmenu,
  TrayAppsSubmenu,
  TrayFoldersSubmenu,
  TraySettingsSubmenu,
} from './tray-menu-submenus.component';

/** The menu is failing silently otherwise: it has closed by the time a call fails. */
function report(error: unknown) {
  console.error('tray menu:', error);
}

export interface TrayMenuProps {
  /** Anchor to open at straight away (the browser preview); the shell sends one per click. */
  readonly initialAnchor?: TrayMenuAnchor | undefined;
}

/**
 * The tray icon's right-click menu, drawn in its own transparent window: a header (mark, name,
 * install, version), then Show and Pin, the Recent / Favorites / Folders submenus, Appearance,
 * Settings and Help, and Quit. The shell places the window next to the cursor and sends the
 * anchor; the window hides once the menu's exit animation finishes.
 */
export function TrayMenu({ initialAnchor }: TrayMenuProps) {
  const { backend, context, settings, list, pinned } = useLauncher();
  const [anchor, setAnchor] = useState<TrayMenuAnchor | undefined>(initialAnchor);
  const [open, setOpen] = useState(initialAnchor !== undefined);
  // Every open starts fresh (no submenu left open from last time).
  const [generation, setGeneration] = useState(0);
  const titleId = useId();

  useEffect(() => {
    const unsubscribers = [
      backend.on('trayMenuOpen', (next) => {
        setAnchor(next);
        setGeneration((count) => count + 1);
        setOpen(true);
      }),
      backend.on('trayMenuClose', () => setOpen(false)),
    ];
    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe.then(
          (stop) => stop(),
          () => undefined,
        );
      }
    };
  }, [backend]);

  const toggleShortcut = settings.keybindings.global.toggle;

  return (
    <Menu
      key={generation}
      open={open && anchor !== undefined}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) backend.hideTrayMenu().catch(report);
      }}
    >
      <MenuTrigger
        nativeButton={false}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none fixed size-0"
        style={{ left: anchor?.x ?? 0, top: anchor?.y ?? 0 }}
        render={<span />}
      />
      <MenuPopup
        side={anchor?.opensUp === false ? 'bottom' : 'top'}
        align={anchor?.alignEnd === false ? 'start' : 'end'}
        sideOffset={0}
        // Named by the header, not by the invisible anchor that stands in for a trigger.
        aria-labelledby={titleId}
        className="w-68"
      >
        <MenuHeader
          media={<img src={markUrl} alt="" draggable={false} />}
          title={<span id={titleId}>GENSLATE Launcher</span>}
          description={describeInstall(context)}
          accessory={
            <Badge tone="neutral" variant="subtle">
              v{context.version}
            </Badge>
          }
        />
        <MenuSeparator />
        <MenuItem
          icon="codicon:window"
          shortcut={toggleShortcut}
          onClick={() => backend.show().catch(report)}
        >
          Show Launcher
        </MenuItem>
        <MenuItem
          icon={pinned ? 'codicon:pinned' : 'codicon:pin'}
          onClick={() => backend.setPinned(!pinned).catch(report)}
        >
          {pinned ? 'Unpin from Top' : 'Pin on Top'}
        </MenuItem>
        <MenuSeparator />
        <TrayAppsSubmenu
          label="Recent"
          icon="codicon:history"
          apps={recentApps(list)}
          empty="No recent apps"
          report={report}
        />
        <TrayAppsSubmenu
          label="Favorites"
          icon="codicon:star-empty"
          apps={favoriteApps(list)}
          empty="No favorites yet"
          report={report}
        />
        <TrayFoldersSubmenu report={report} />
        <MenuSeparator />
        <TrayAppearanceSubmenu report={report} />
        <TraySettingsSubmenu report={report} />
        <MenuItem icon="codicon:question" onClick={() => backend.show('help').catch(report)}>
          Help
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon="codicon:close" onClick={() => backend.quit().catch(report)}>
          Quit GENSLATE Launcher
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}
