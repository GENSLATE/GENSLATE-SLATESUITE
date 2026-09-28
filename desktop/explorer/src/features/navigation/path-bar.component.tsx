import { cn, Icon, Menu, MenuItem, MenuPopup, MenuTrigger } from '@genslate/design-system';
import { type KeyboardEvent, useEffect, useEffectEvent, useState } from 'react';

import { useExplorer } from '../../app/explorer.context';
import { ancestry, baseName, joinPath, parentOf, separatorOf } from '../../model/path.util';
import { useDropTarget } from '../files/drag-drop.hook';

const MAX_SUGGESTIONS = 8;
const MAX_MENU_FOLDERS = 60;

/**
 * Where you are: a breadcrumb of folders (each a drop target, each chevron a menu of its
 * subfolders). Click the empty space, or press Ctrl/⌘+L, to type a path; Tab completes it.
 */
export function PathBar() {
  const api = useExplorer();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const start = () => setEditing(true);
    window.addEventListener('explorer:focus-path', start);
    return () => window.removeEventListener('explorer:focus-path', start);
  }, []);

  return (
    <div
      data-slot="path-bar"
      className={cn(
        'flex h-control-md min-w-0 flex-1 items-center rounded-control border border-border-subtle bg-field',
        editing && 'border-accent-border ring-2 ring-focus-halo',
      )}
    >
      {editing ? (
        <PathInput key={api.tab.path} onDone={() => setEditing(false)} />
      ) : (
        <Crumbs onEdit={() => setEditing(true)} />
      )}
    </div>
  );
}

function Crumbs({ onEdit }: { readonly onEdit: () => void }) {
  const api = useExplorer();
  const chain = ancestry(api.tab.path);
  return (
    <>
      <div
        key={api.tab.path}
        // Long paths keep their end (the current folder) in view.
        ref={(node) => {
          if (node !== null) node.scrollLeft = node.scrollWidth;
        }}
        className="scrollbar-none flex h-full min-w-0 shrink items-center overflow-x-auto pl-1"
      >
        <Icon name="codicon:folder-opened" size={14} className="mx-1.5 shrink-0 text-fg-muted" />
        {chain.map((crumb, index) => (
          <Crumb
            key={crumb.path}
            name={crumb.name}
            path={crumb.path}
            current={index === chain.length - 1}
          />
        ))}
      </div>
      <button
        type="button"
        aria-label="Type a path"
        title="Type a path (Ctrl+L)"
        onClick={onEdit}
        className="focus-ring-inset h-full min-w-6 flex-1 cursor-text rounded-r-control"
      />
    </>
  );
}

function Crumb({
  name,
  path,
  current,
}: {
  readonly name: string;
  readonly path: string;
  readonly current: boolean;
}) {
  const api = useExplorer();
  const drop = useDropTarget(current ? null : path);
  const listing = api.listingOf(path);
  const folders = (listing?.listing?.entries ?? [])
    .filter((entry) => entry.isDir)
    .slice(0, MAX_MENU_FOLDERS);

  return (
    <span className="flex shrink-0 items-center">
      <button
        type="button"
        aria-current={current ? 'location' : undefined}
        onClick={() => api.navigate(path)}
        {...drop.handlers}
        className={cn(
          'focus-ring-inset h-6 max-w-48 cursor-interactive truncate rounded-xs px-1.5 text-sm',
          'transition-colors duration-fast ease-standard hover:bg-fill-hover',
          current ? 'font-medium text-fg-strong' : 'text-fg-secondary hover:text-fg',
          drop.over && 'bg-accent-subtle text-fg-strong',
        )}
      >
        {name}
      </button>
      <Menu
        onOpenChange={(open) => {
          if (open) api.loadFolder(path);
        }}
      >
        <MenuTrigger
          aria-label={`Folders in ${name}`}
          className="focus-ring-inset grid h-6 w-4 cursor-interactive place-items-center rounded-xs text-fg-muted hover:bg-fill-hover hover:text-fg data-popup-open:bg-fill-pressed"
        >
          <Icon name="codicon:chevron-right" size={12} />
        </MenuTrigger>
        <MenuPopup align="start" className="max-h-96">
          {folders.length === 0 ? (
            <MenuItem disabled>
              {listing?.status === 'loading' ? 'Loading…' : 'No folders'}
            </MenuItem>
          ) : (
            folders.map((entry) => (
              <MenuItem
                key={entry.path}
                icon="codicon:folder"
                onClick={() => api.navigate(entry.path)}
              >
                {entry.name}
              </MenuItem>
            ))
          )}
        </MenuPopup>
      </Menu>
    </span>
  );
}

/** Expands `~` to the home folder. */
function expand(path: string, home: string | null): string {
  if (home === null || !(path === '~' || path.startsWith('~/') || path.startsWith('~\\'))) {
    return path;
  }
  return path === '~' ? home : joinPath(home, path.slice(2));
}

function PathInput({ onDone }: { readonly onDone: () => void }) {
  const api = useExplorer();
  const [value, setValue] = useState(api.tab.path);
  const [highlight, setHighlight] = useState(-1);

  // Suggest subfolders of the folder being typed.
  const typed = expand(value, api.context.home);
  const sep = separatorOf(typed);
  const endsWithSep = typed.endsWith(sep);
  const folder = endsWithSep ? typed : parentOf(typed);
  const partial = endsWithSep ? '' : baseName(typed).toLowerCase();
  const load = useEffectEvent((path: string) => api.loadFolder(path));
  useEffect(() => {
    if (folder !== null) load(folder);
  }, [folder]);
  const suggestions =
    folder === null
      ? []
      : (api.listingOf(folder)?.listing?.entries ?? [])
          .filter((entry) => entry.isDir && entry.name.toLowerCase().startsWith(partial))
          .filter((entry) => entry.path !== typed)
          .slice(0, MAX_SUGGESTIONS);

  const go = (path: string) => {
    onDone();
    const target = expand(path.trim(), api.context.home);
    if (target !== '' && target !== api.tab.path) api.navigate(target);
  };

  const complete = (path: string) => {
    setValue(joinPath(path, ''));
    setHighlight(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const chosen = suggestions[highlight];
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        go(chosen?.path ?? value);
        return;
      case 'Escape':
        event.preventDefault();
        onDone();
        return;
      case 'Tab': {
        const first = chosen ?? suggestions[0];
        if (first === undefined) return;
        event.preventDefault();
        complete(first.path);
        return;
      }
      case 'ArrowDown':
        event.preventDefault();
        setHighlight((current) => Math.min(suggestions.length - 1, current + 1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        setHighlight((current) => Math.max(-1, current - 1));
        return;
    }
  };

  const focus = (input: HTMLInputElement | null) => {
    input?.focus();
    input?.select();
  };

  return (
    <div className="relative flex h-full min-w-0 flex-1 items-center">
      <Icon name="codicon:go-to-file" size={14} className="mx-2 shrink-0 text-fg-muted" />
      <input
        ref={focus}
        aria-label="Folder path"
        aria-autocomplete="list"
        aria-controls="explorer-path-suggestions"
        aria-expanded={suggestions.length > 0}
        aria-activedescendant={highlight >= 0 ? `explorer-path-suggestion-${highlight}` : undefined}
        role="combobox"
        value={value}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => {
          setValue(event.target.value);
          setHighlight(-1);
        }}
        onKeyDown={onKeyDown}
        onBlur={onDone}
        className="h-full min-w-0 flex-1 cursor-text bg-transparent pr-2 font-mono text-fg-strong text-sm outline-none selection:bg-selection"
      />
      {suggestions.length > 0 ? (
        <div
          id="explorer-path-suggestions"
          role="listbox"
          aria-label="Matching folders"
          className="absolute top-full left-0 z-popover mt-1 w-full max-w-md rounded-popover bg-surface-popover p-1 shadow-popover ring-1 ring-border-subtle"
        >
          {suggestions.map((entry, index) => (
            // biome-ignore lint/a11y/useFocusableInteractive: the combobox input owns focus (aria-activedescendant).
            <div
              key={entry.path}
              id={`explorer-path-suggestion-${index}`}
              role="option"
              aria-selected={index === highlight}
              onMouseDown={(event) => {
                // Keep the input focused.
                event.preventDefault();
                complete(entry.path);
              }}
              className={cn(
                'flex h-menu-item cursor-interactive items-center gap-2 rounded-menu-item px-2 text-base',
                index === highlight ? 'bg-accent text-on-accent' : 'text-fg hover:bg-fill-hover',
              )}
            >
              <Icon name="codicon:folder" size={14} />
              <span className="truncate">{entry.name}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
