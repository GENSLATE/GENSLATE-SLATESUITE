import { Icon, Kbd, usePlatform } from '@genslate/design-system';

import { APP } from '../../app/app.meta';
import { command, shortcutFor } from '../../app/commands.registry';
import { useTerminal } from '../../app/terminal.context';
import { colorText, profileIcon } from '../tabs/profile-visual.util';

/** Every tab is closed (or no shell was found): pick a shell to start one. */
export function EmptyTerminal() {
  const api = useTerminal();
  const platform = usePlatform();
  const newTab = shortcutFor(command('new-tab'), platform);

  return (
    <div
      data-slot="empty-terminal"
      className="grid min-h-0 flex-1 place-items-center overflow-auto bg-terminal-bg p-10"
    >
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <img
          src={APP.icon}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none mb-4 size-16 select-none"
        />
        <h1 className="font-semibold text-fg-strong text-xl">
          {api.profiles.length === 0 ? 'No shells found' : 'Start a shell'}
        </h1>
        <p className="mt-1 text-fg-secondary text-sm">
          {api.profiles.length === 0
            ? 'Add one under [[profiles]] in the Terminal’s config.toml.'
            : 'Every tab is closed. Pick a shell to open a new one.'}
        </p>
        {api.profiles.length === 0 ? null : (
          <ul className="mt-6 flex w-full flex-col gap-1">
            {api.profiles.map((profile) => (
              <li key={profile.id}>
                <button
                  type="button"
                  onClick={() => api.newTab({ profileId: profile.id, cwd: null })}
                  className="focus-ring flex h-10 w-full cursor-interactive items-center gap-3 rounded-card px-3 text-left transition-colors duration-fast ease-standard hover:bg-fill-hover active:bg-fill-pressed"
                >
                  <Icon name={profileIcon(profile.icon)} className={colorText(profile.color)} />
                  <span className="min-w-0 flex-1 truncate text-fg">{profile.name}</span>
                  {profile.id === api.defaultProfileId && newTab !== undefined ? (
                    <Kbd shortcut={newTab} size="sm" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
