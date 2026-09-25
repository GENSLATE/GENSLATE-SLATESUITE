import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { listItem, listItemHint, popupSurface } from '../../../recipes';
import { cn } from '../../../utils/cn.util';
import { guessPlatform } from '../../../utils/platform.util';
import { formatShortcut } from '../../../utils/shortcut.util';
import { Icon } from '../../display/icon';
import { filterCommands } from './command-palette.filter';
import type { CommandPaletteMatch, CommandPaletteProps } from './command-palette.types';
import { commandPaletteVariants } from './command-palette.variants';

const styles = commandPaletteVariants();

function Highlighted({ text, indices }: { text: string; indices: readonly number[] }) {
  if (indices.length === 0) return <>{text}</>;
  const marked = new Set(indices);
  const parts: { text: string; match: boolean }[] = [];
  for (const [index, char] of [...text].entries()) {
    const match = marked.has(index);
    const last = parts.at(-1);
    if (last && last.match === match) last.text += char;
    else parts.push({ text: char, match });
  }
  return (
    <>
      {parts.map((part, index) =>
        part.match ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static segments of one label.
          <mark key={index} className={styles.match()}>
            {part.text}
          </mark>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: static segments of one label.
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

/**
 * VS Code quick-open / macOS Spotlight: a search field over grouped, fuzzy-ranked commands.
 * ↑/↓ move the highlighted row (`aria-activedescendant`), Enter runs it, Escape closes.
 */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  placeholder = 'Type a command or search…',
  emptyState,
  hideFooter = false,
  platform,
  className,
  labels,
}: CommandPaletteProps) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const os = platform ?? guessPlatform();

  const matches = filterCommands(items, query);
  const enabled = matches.filter((match) => !match.item.disabled);
  const activeMatch: CommandPaletteMatch | undefined =
    enabled[Math.min(active, enabled.length - 1)];
  const optionId = (itemId: string) => `${id}-option-${itemId}`;
  const activeId = activeMatch ? optionId(activeMatch.item.id) : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeId]);

  const run = (match: CommandPaletteMatch | undefined) => {
    if (!match || match.item.disabled) return;
    onOpenChange(false);
    match.item.onSelect();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const count = enabled.length;
    const current = activeMatch ? enabled.indexOf(activeMatch) : 0;
    switch (event.key) {
      case 'ArrowDown':
        if (count) setActive((current + 1) % count);
        break;
      case 'ArrowUp':
        if (count) setActive((current - 1 + count) % count);
        break;
      case 'PageDown':
        if (count) setActive(Math.min(current + 8, count - 1));
        break;
      case 'PageUp':
        if (count) setActive(Math.max(current - 8, 0));
        break;
      case 'Enter':
        run(activeMatch);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  // Render groups in match order.
  const groups: { name: string | undefined; matches: CommandPaletteMatch[] }[] = [];
  for (const match of matches) {
    const last = groups.at(-1);
    if (last && last.name === match.item.group) last.matches.push(match);
    else groups.push({ name: match.item.group, matches: [match] });
  }

  return (
    <BaseDialog.Root
      open={open}
      onOpenChange={(next) => onOpenChange(next)}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) {
          setQuery('');
          setActive(0);
        }
      }}
    >
      <BaseDialog.Portal>
        <BaseDialog.Viewport data-slot="command-palette-viewport" className={styles.viewport()}>
          <BaseDialog.Popup
            data-slot="command-palette"
            initialFocus={inputRef}
            className={cn(popupSurface({ size: 'dialog' }), styles.popup(), className)}
          >
            <BaseDialog.Title className="sr-only">
              {labels?.title ?? 'Command palette'}
            </BaseDialog.Title>
            <div data-slot="command-palette-search" className={styles.search()}>
              <Icon name="codicon:search" size={16} />
              <input
                ref={inputRef}
                data-slot="command-palette-input"
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeId}
                aria-label={labels?.title ?? 'Command palette'}
                autoComplete="off"
                spellCheck={false}
                placeholder={placeholder}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={handleKeyDown}
                className={styles.input()}
              />
            </div>
            {matches.length === 0 ? (
              <div data-slot="command-palette-empty" role="status" className={styles.empty()}>
                {emptyState ?? (
                  <>
                    <Icon name="codicon:search-fuzzy" size={20} />
                    <span>{labels?.empty ?? 'No matching commands'}</span>
                  </>
                )}
              </div>
            ) : (
              <div
                id={listId}
                role="listbox"
                aria-label={labels?.results ?? 'Commands'}
                data-slot="command-palette-list"
                className={styles.list()}
              >
                {groups.map((group, groupIndex) => {
                  const rows = group.matches.map((match) => {
                    const { item } = match;
                    const highlighted = match === activeMatch;
                    return (
                      // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard is handled by the combobox input (aria-activedescendant).
                      <div
                        key={item.id}
                        tabIndex={-1}
                        id={optionId(item.id)}
                        role="option"
                        aria-selected={highlighted}
                        aria-disabled={item.disabled || undefined}
                        data-slot="command-palette-item"
                        data-highlighted={highlighted ? '' : undefined}
                        data-disabled={item.disabled ? '' : undefined}
                        className={cn(listItem(), styles.row())}
                        onPointerMove={() => {
                          if (!item.disabled && !highlighted) setActive(enabled.indexOf(match));
                        }}
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={() => run(match)}
                      >
                        {item.icon != null && (
                          <Icon name={item.icon} size={16} className={styles.icon()} />
                        )}
                        <span className={styles.label()}>
                          <Highlighted text={item.label} indices={match.indices} />
                        </span>
                        {item.detail != null ? (
                          <span className={styles.detail()}>{item.detail}</span>
                        ) : null}
                        {item.shortcut != null && (
                          <kbd className={cn(listItemHint(), 'font-sans')}>
                            {formatShortcut(item.shortcut, os)}
                          </kbd>
                        )}
                      </div>
                    );
                  });
                  if (group.name == null) return rows;
                  const labelId = `${id}-group-${groupIndex}`;
                  return (
                    // biome-ignore lint/a11y/useSemanticElements: a listbox group must be role="group", not a fieldset.
                    <div
                      key={group.name}
                      role="group"
                      aria-labelledby={labelId}
                      data-slot="command-palette-group"
                    >
                      <div id={labelId} className={styles.groupLabel()}>
                        {group.name}
                      </div>
                      {rows}
                    </div>
                  );
                })}
              </div>
            )}
            {!hideFooter && (
              <div data-slot="command-palette-footer" aria-hidden className={styles.footer()}>
                <span>
                  <kbd className={styles.key()}>↑</kbd>
                  <kbd className={styles.key()}>↓</kbd>
                  {labels?.navigate ?? 'Navigate'}
                </span>
                <span>
                  <kbd className={styles.key()}>↵</kbd>
                  {labels?.run ?? 'Run'}
                </span>
                <span>
                  <kbd className={styles.key()}>esc</kbd>
                  {labels?.close ?? 'Close'}
                </span>
              </div>
            )}
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
