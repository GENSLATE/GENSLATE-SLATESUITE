import { IconButton, SearchField } from '@genslate/design-system';
import { useEffect, useRef, useState } from 'react';

import { command, isEnabled } from '../../app/commands.registry';
import { useExplorer } from '../../app/explorer.context';
import { baseName } from '../../model/path.util';
import { PathBar } from './path-bar.component';

/** Back · Forward · Up · Refresh, the path bar, and the filter / search box. */
export function NavBar() {
  const api = useExplorer();

  return (
    <div data-slot="nav-bar" className="flex h-11 shrink-0 items-center gap-1 bg-canvas px-2">
      {(['back', 'forward', 'up', 'refresh'] as const).map((id) => {
        const entry = command(id);
        return (
          <IconButton
            key={id}
            size="md"
            icon={entry.icon ?? 'codicon:circle'}
            label={entry.label}
            tooltipShortcut={entry.shortcut}
            disabled={!isEnabled(entry, api)}
            onClick={() => entry.run(api)}
          />
        );
      })}
      <div className="mx-1 flex min-w-0 flex-1">
        <PathBar />
      </div>
      <SearchBox key={api.tab.id} />
    </div>
  );
}

/**
 * Typing filters the folder instantly; Enter searches it and its subfolders (names, or names
 * and contents with the toggle).
 */
function SearchBox() {
  const api = useExplorer();
  const { tab } = api;
  const [text, setText] = useState(tab.search?.text ?? tab.filter);
  const [contents, setContents] = useState(tab.search?.contents ?? false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focus = () => {
      input.current?.focus();
      input.current?.select();
    };
    window.addEventListener('explorer:focus-search', focus);
    return () => window.removeEventListener('explorer:focus-search', focus);
  }, []);

  const change = (value: string) => {
    setText(value);
    if (tab.search !== null && value === '') api.clearSearch();
    if (tab.search === null) api.dispatch({ type: 'filter', filter: value });
  };

  return (
    <SearchField
      ref={input}
      size="md"
      className="w-64 shrink-0"
      aria-label={`Filter or search ${baseName(tab.path)}`}
      placeholder={`Search ${baseName(tab.path)}`}
      shortcut="mod+f"
      value={text}
      onValueChange={change}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && text.trim() !== '') {
          event.preventDefault();
          api.dispatch({ type: 'filter', filter: '' });
          api.search(text, contents);
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          document.querySelector<HTMLElement>('[data-file-view]')?.focus();
        }
      }}
      trailing={
        <IconButton
          size="xs"
          icon="codicon:file-text"
          label={contents ? 'Searching names and contents' : 'Also search inside files'}
          tooltip={contents ? 'Searching names and contents (Enter)' : 'Also search inside files'}
          toggled={contents}
          onClick={() => {
            setContents(!contents);
            if (tab.search !== null) api.search(tab.search.text, !contents);
          }}
        />
      }
    />
  );
}
