import {
  cn,
  Icon,
  IconButton,
  Menu,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
  usePlatform,
} from '@genslate/design-system';

import { command, runCommand, shortcutFor } from '../../app/commands.registry';
import { useTerminal } from '../../app/terminal.context';
import { colorText, profileIcon } from './profile-visual.util';

/**
 * `+` opens a tab with the default shell; the chevron lists every shell (Alt+click one to
 * split the current pane with it instead), then settings and help.
 */
export function NewTabButton() {
  const api = useTerminal();
  const platform = usePlatform();

  return (
    <div className="flex shrink-0 items-center rounded-control">
      <IconButton
        size="sm"
        icon="codicon:add"
        label="New tab"
        tooltipShortcut={shortcutFor(command('new-tab'), platform)}
        onClick={() => api.newTab()}
        className="rounded-r-none"
      />
      <Menu>
        <MenuTrigger
          aria-label="Open a shell"
          className={cn(
            'focus-ring grid h-control-sm w-4 cursor-interactive place-items-center rounded-r-control text-titlebar-fg',
            'transition-colors duration-fast ease-standard hover:bg-fill-hover data-popup-open:bg-fill-pressed',
          )}
        >
          <Icon name="codicon:chevron-down" size={12} />
        </MenuTrigger>
        <MenuPopup align="start" className="min-w-64">
          <MenuGroupLabel>New tab · Alt+click to split</MenuGroupLabel>
          {api.profiles.map((profile, index) => (
            <MenuItem
              key={profile.id}
              media={
                <Icon
                  name={profileIcon(profile.icon)}
                  size={16}
                  className={colorText(profile.color)}
                />
              }
              shortcut={
                index < 9 ? shortcutFor(command(`new-tab-${index + 1}`), platform) : undefined
              }
              onClick={(event) => {
                if (event.altKey) api.split('row', { profileId: profile.id });
                else api.newTab({ profileId: profile.id });
              }}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{profile.name}</span>
                {profile.id === api.defaultProfileId ? (
                  <span className="text-fg-muted text-xs">default</span>
                ) : null}
              </span>
            </MenuItem>
          ))}
          <MenuSeparator />
          {(['settings', 'palette', 'shortcuts'] as const).map((id) => {
            const entry = command(id);
            return (
              <MenuItem
                key={id}
                icon={entry.icon}
                shortcut={shortcutFor(entry, platform)}
                onClick={() => runCommand(id, api)}
              >
                {entry.label}
              </MenuItem>
            );
          })}
        </MenuPopup>
      </Menu>
    </div>
  );
}
