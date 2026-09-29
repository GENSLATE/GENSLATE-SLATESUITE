import { cn, Icon, IconButton, ToggleButton } from '@genslate/design-system';
import { type KeyboardEvent, useState } from 'react';

import { useTerminal } from '../../app/terminal.context';
import { usePaneState } from '../../engine/pane-store';
import type { FindOptions } from '../../engine/terminal-session';

/**
 * Find in the scrollback, VS Code style: matches light up in the text and the overview ruler;
 * Enter and Shift+Enter step through them, Escape closes.
 */
export function FindBar({ paneId }: { readonly paneId: string }) {
  const api = useTerminal();
  const state = usePaneState(api.store, paneId);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<FindOptions>({
    caseSensitive: false,
    wholeWord: false,
    regex: false,
  });
  const session = api.session(paneId);

  const find = (text: string, next: FindOptions, direction: 'next' | 'previous', typing = false) =>
    session?.find(text, { ...next, incremental: typing }, direction);

  const close = () => {
    session?.clearFind();
    api.setFindOpen(false);
    session?.focus();
  };

  const toggle = (key: keyof FindOptions) => (pressed: boolean) => {
    const next = { ...options, [key]: pressed };
    setOptions(next);
    find(query, next, 'next', true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      find(query, options, event.shiftKey ? 'previous' : 'next');
    }
  };

  const search = state?.search ?? null;
  const count =
    query === '' || search === null
      ? null
      : search.count === 0
        ? 'No results'
        : search.index < 0
          ? `${search.count.toLocaleString()} found`
          : `${(search.index + 1).toLocaleString()} of ${search.count.toLocaleString()}`;

  return (
    <search
      aria-label="Find in the terminal"
      className="absolute top-2 right-4 z-popover flex items-center gap-0.5 rounded-popover bg-surface-popover p-1 shadow-popover ring-1 ring-border-subtle"
    >
      <div
        className={cn(
          'flex h-control-sm w-60 items-center gap-1.5 rounded-control bg-field px-2 ring-1 ring-border-subtle',
          'focus-within:ring-focus',
          count === 'No results' && 'ring-danger-border focus-within:ring-danger-border',
        )}
      >
        <Icon name="codicon:search" size={14} className="shrink-0 text-fg-muted" />
        <input
          // biome-ignore lint/a11y/noAutofocus: the bar opens on request (Find) and takes the keys
          autoFocus
          type="text"
          aria-label="Find"
          placeholder="Find"
          spellCheck={false}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            find(event.target.value, options, 'next', true);
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent font-mono text-fg text-sm placeholder:font-sans placeholder:text-fg-muted focus:outline-none"
        />
        <ToggleButton
          size="xs"
          icon="codicon:case-sensitive"
          label="Match case"
          pressed={options.caseSensitive}
          onPressedChange={toggle('caseSensitive')}
        />
        <ToggleButton
          size="xs"
          icon="codicon:whole-word"
          label="Match whole word"
          pressed={options.wholeWord}
          onPressedChange={toggle('wholeWord')}
        />
        <ToggleButton
          size="xs"
          icon="codicon:regex"
          label="Use regular expression"
          pressed={options.regex}
          onPressedChange={toggle('regex')}
        />
      </div>
      <output
        aria-live="polite"
        className="w-20 shrink-0 px-1.5 text-center text-fg-muted text-xs tabular-nums"
      >
        {count ?? ''}
      </output>
      <IconButton
        size="sm"
        icon="codicon:arrow-up"
        label="Previous match"
        tooltipShortcut="shift+enter"
        disabled={query === ''}
        onClick={() => find(query, options, 'previous')}
      />
      <IconButton
        size="sm"
        icon="codicon:arrow-down"
        label="Next match"
        tooltipShortcut="enter"
        disabled={query === ''}
        onClick={() => find(query, options, 'next')}
      />
      <IconButton
        size="sm"
        icon="codicon:close"
        label="Close"
        tooltipShortcut="escape"
        onClick={close}
      />
    </search>
  );
}
