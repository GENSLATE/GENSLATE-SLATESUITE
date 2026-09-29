import { Badge, Icon, IconButton, Kbd } from '@genslate/design-system';
import { type KeyboardEvent, useState } from 'react';

import { useTerminal } from '../../app/terminal.context';

const EXAMPLES = [
  {
    ask: 'find files over 100 MB here',
    command: 'Get-ChildItem -Recurse | Where Length -gt 100MB',
  },
  { ask: 'what is using port 3000?', command: 'Get-NetTCPConnection -LocalPort 3000' },
  { ask: 'undo my last commit but keep the changes', command: 'git reset --soft HEAD~1' },
] as const;

/**
 * The natural-language command bar, a preview: `#` at an empty prompt opens it. It will turn
 * plain words into a command for this shell and folder, shown for review before it runs.
 */
export function CommandBar({ paneId }: { readonly paneId: string }) {
  const api = useTerminal();
  const [text, setText] = useState('');
  const [asked, setAsked] = useState(false);

  const close = () => {
    api.setCommandBarPane(null);
    api.session(paneId)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Enter' && text.trim() !== '') {
      event.preventDefault();
      setAsked(true);
    }
  };

  return (
    <div className="absolute inset-x-4 bottom-4 z-popover flex justify-center">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-popover bg-surface-popover shadow-popover ring-1 ring-border-subtle">
        <div className="flex h-11 items-center gap-2.5 px-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent-subtle text-accent-fg">
            <Icon name="codicon:sparkle" size={14} />
          </span>
          <input
            // biome-ignore lint/a11y/noAutofocus: opened by typing # and takes over the keys
            autoFocus
            type="text"
            aria-label="Describe a command in plain words"
            placeholder="Describe what you want to do…"
            spellCheck={false}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setAsked(false);
            }}
            onKeyDown={onKeyDown}
            className="min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-fg-muted focus:outline-none"
          />
          <Badge tone="accent" size="sm" pill>
            Coming soon
          </Badge>
          <IconButton size="sm" icon="codicon:close" label="Close" onClick={close} />
        </div>
        <div className="hairline-t flex flex-col gap-1 bg-surface-sunken px-3 py-2.5">
          {asked ? (
            <p className="text-fg-secondary text-sm">
              Soon the assistant will write this as a command for{' '}
              {api.profile(api.store.get(paneId)?.profileId ?? api.defaultProfileId).name}, in this
              folder, and wait for you to run it.
            </p>
          ) : (
            <>
              <p className="font-semibold text-2xs text-fg-muted uppercase tracking-wider">
                For example
              </p>
              <ul aria-hidden className="pointer-events-none flex select-none flex-col gap-1">
                {EXAMPLES.map((example) => (
                  <li key={example.ask} className="flex min-w-0 items-center gap-2 text-sm">
                    <span className="shrink-0 text-fg-secondary">“{example.ask}”</span>
                    <Icon name="codicon:arrow-right" size={12} className="shrink-0 text-fg-muted" />
                    <code className="truncate font-mono text-accent-fg text-xs">
                      {example.command}
                    </code>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-1 flex items-center gap-1.5 text-fg-muted text-xs">
            <Kbd shortcut="enter" size="sm" /> review the command
            <Kbd shortcut="escape" size="sm" className="ml-2" /> back to the shell
          </p>
        </div>
      </div>
    </div>
  );
}
