import {
  type CodiconRef,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
} from '@genslate/design-system';

import { useLauncher } from '../../app/launcher.context';
import type { AppEntry, SharedFolder, SizePreset, ThemeSetting } from '../../ipc/launcher.types';
import { AppIcon } from '../apps/app-icon.component';
import { isLaunchable } from '../apps/catalog.model';

/** Called with any failed backend call (the menu has already closed). */
type Report = (error: unknown) => void;

const THEMES: readonly { value: ThemeSetting; label: string }[] = [
  { value: 'polar-night', label: 'Polar Night' },
  { value: 'snow-storm', label: 'Snow Storm' },
  { value: 'system', label: 'Match System' },
];

const SIZES: readonly { value: SizePreset; label: string }[] = [
  { value: 's', label: 'Small' },
  { value: 'm', label: 'Medium' },
  { value: 'l', label: 'Large' },
];

const FOLDERS: readonly { folder: SharedFolder; label: string; icon: CodiconRef }[] = [
  { folder: 'desktop', label: 'Desktop', icon: 'codicon:vm' },
  { folder: 'documents', label: 'Documents', icon: 'codicon:file-text' },
  { folder: 'downloads', label: 'Downloads', icon: 'codicon:desktop-download' },
  { folder: 'music', label: 'Music', icon: 'codicon:music' },
  { folder: 'pictures', label: 'Pictures', icon: 'codicon:file-media' },
  { folder: 'videos', label: 'Videos', icon: 'codicon:device-camera-video' },
];

const isTheme = (value: unknown): value is ThemeSetting =>
  THEMES.some((theme) => theme.value === value);
const isSize = (value: unknown): value is SizePreset => SIZES.some((size) => size.value === value);

export interface TrayAppsSubmenuProps {
  readonly label: string;
  readonly icon: CodiconRef;
  readonly apps: readonly AppEntry[];
  /** Shown (disabled) when `apps` is empty. */
  readonly empty: string;
  readonly report: Report;
}

/** Recent or Favorites: one row per app with its icon; unavailable apps are disabled. */
export function TrayAppsSubmenu({ label, icon, apps, empty, report }: TrayAppsSubmenuProps) {
  const { backend } = useLauncher();
  return (
    <MenuSubmenuRoot>
      <MenuSubmenuTrigger icon={icon}>{label}</MenuSubmenuTrigger>
      <MenuPopup className="min-w-52">
        {apps.length === 0 ? <MenuItem disabled>{empty}</MenuItem> : null}
        {apps.map((app) => (
          <MenuItem
            key={app.id}
            media={<AppIcon app={app} size="sm" />}
            disabled={!isLaunchable(app)}
            onClick={() => backend.launch(app.id).catch(report)}
          >
            {app.name}
          </MenuItem>
        ))}
      </MenuPopup>
    </MenuSubmenuRoot>
  );
}

/** The portable folders (`storage/users/shared/*`) and the storage root. */
export function TrayFoldersSubmenu({ report }: { readonly report: Report }) {
  const { backend } = useLauncher();
  const open = (folder: SharedFolder) => backend.openFolder(folder).catch(report);
  return (
    <MenuSubmenuRoot>
      <MenuSubmenuTrigger icon="codicon:folder">Folders</MenuSubmenuTrigger>
      <MenuPopup>
        {FOLDERS.map(({ folder, label, icon }) => (
          <MenuItem key={folder} icon={icon} onClick={() => open(folder)}>
            {label}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem icon="codicon:database" onClick={() => open('storage')}>
          Storage Folder
        </MenuItem>
      </MenuPopup>
    </MenuSubmenuRoot>
  );
}

/** Theme and window size, written to config.toml (the shell applies them live). */
export function TrayAppearanceSubmenu({ report }: { readonly report: Report }) {
  const { backend, settings } = useLauncher();
  const { theme, size } = settings.config.appearance;
  return (
    <MenuSubmenuRoot>
      <MenuSubmenuTrigger icon="codicon:color-mode">Appearance</MenuSubmenuTrigger>
      <MenuPopup>
        <MenuGroup>
          <MenuRadioGroup
            value={theme}
            onValueChange={(value) => {
              if (isTheme(value)) backend.setSetting('theme', value).catch(report);
            }}
          >
            <MenuGroupLabel inset>Theme</MenuGroupLabel>
            {THEMES.map(({ value, label }) => (
              <MenuRadioItem key={value} value={value} closeOnClick>
                {label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuRadioGroup
            value={size}
            onValueChange={(value) => {
              if (isSize(value)) backend.setSetting('size', value).catch(report);
            }}
          >
            <MenuGroupLabel inset>Window Size</MenuGroupLabel>
            {SIZES.map(({ value, label }) => (
              <MenuRadioItem key={value} value={value} closeOnClick>
                {label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
      </MenuPopup>
    </MenuSubmenuRoot>
  );
}

/**
 * The launcher's own files, a rescan and start-with-system. Rows are inset so their icons line up
 * with the checkbox row's (the macOS check column).
 */
export function TraySettingsSubmenu({ report }: { readonly report: Report }) {
  const { backend, settings } = useLauncher();
  const autostart = settings.config.behavior.autostart;
  return (
    <MenuSubmenuRoot>
      <MenuSubmenuTrigger icon="codicon:settings-gear">Settings</MenuSubmenuTrigger>
      <MenuPopup className="min-w-52">
        <MenuItem
          inset
          icon="codicon:go-to-file"
          onClick={() => backend.openConfigFile('settings').catch(report)}
        >
          Edit Settings…
        </MenuItem>
        <MenuItem
          inset
          icon="codicon:record-keys"
          onClick={() => backend.openConfigFile('keybindings').catch(report)}
        >
          Edit Keybindings…
        </MenuItem>
        <MenuItem
          inset
          icon="codicon:output"
          onClick={() => backend.openConfigFile('logs').catch(report)}
        >
          Open Logs
        </MenuItem>
        <MenuSeparator />
        <MenuItem inset icon="codicon:refresh" onClick={() => backend.rescan().catch(report)}>
          Rescan Apps
        </MenuItem>
        <MenuCheckboxItem
          icon="codicon:rocket"
          checked={autostart}
          closeOnClick
          onCheckedChange={(checked) =>
            backend.setSetting('autostart', checked ? 'true' : 'false').catch(report)
          }
        >
          Start with System
        </MenuCheckboxItem>
      </MenuPopup>
    </MenuSubmenuRoot>
  );
}
