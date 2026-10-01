import { Kbd } from '@genslate/design-system';

import type { ActionSpec, Keybindings } from '../../ipc/launcher.types';
import { WellSheet } from './well-sheet.component';

export interface HelpViewProps {
  readonly actions: readonly ActionSpec[];
  readonly keybindings: Keybindings;
  readonly onBack: () => void;
}

/** Shortcuts and slash commands, straight from keybindings.toml and the command registry. */
export function HelpView({ actions, keybindings, onBack }: HelpViewProps) {
  const keys = keybindings.launcher;
  const shortcuts: readonly (readonly [string, string])[] = [
    ['Show / hide anywhere', keybindings.global.toggle.toLowerCase()],
    ['Search', keys.focusSearch],
    ['Move', 'arrowdown'],
    ['Open', 'enter'],
    ['Favorite', keys.toggleFavorite],
    ['Tools', keys.toggleTools],
    ['Pin on top', keys.togglePin],
    ['Tabs', keys.tabGenslate],
    ['Back / hide', 'escape'],
  ];
  return (
    <WellSheet title="Help" onBack={onBack}>
      <h3 className="mb-1.5 font-semibold text-2xs text-fg-muted uppercase tracking-wider">
        Shortcuts
      </h3>
      <dl className="mb-4 flex flex-col">
        {shortcuts
          .filter(([, shortcut]) => shortcut !== '')
          .map(([label, shortcut]) => (
            <div key={label} className="flex h-7 items-center justify-between gap-2 text-sm">
              <dt className="text-fg-secondary">{label}</dt>
              <dd>
                <Kbd shortcut={shortcut} size="sm" />
              </dd>
            </div>
          ))}
      </dl>
      <h3 className="mb-1.5 font-semibold text-2xs text-fg-muted uppercase tracking-wider">
        Commands
      </h3>
      <dl className="flex flex-col gap-1">
        {actions.map((action) => (
          <div key={action.id} className="flex flex-col py-0.5">
            <dt className="font-mono text-fg-strong text-sm">
              /{action.id}
              {action.params[0] === undefined ? null : (
                <span className="text-fg-muted">
                  {' '}
                  ‹{action.params[0].description.toLowerCase()}›
                </span>
              )}
            </dt>
            <dd className="text-fg-muted text-xs">{action.description}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-fg-muted text-xs">
        Every setting lives in{' '}
        <span className="font-mono">other/config/slatesuite/apps/launcher.*.toml</span> — edit the
        files, the launcher updates as you save. Try <span className="font-mono">/config</span>.
      </p>
    </WellSheet>
  );
}
