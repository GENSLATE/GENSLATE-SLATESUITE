import type { CodiconRef } from '@genslate/design-system';
import { cn, Icon, Kbd } from '@genslate/design-system';

import type { Effect } from '../../ipc/launcher.types';
import { AppIcon } from '../apps/app-icon.component';
import type { SlashSuggestion } from './slash.model';

const EFFECT_ICON: Record<Effect, CodiconRef> = {
  ui: 'codicon:layout',
  window: 'codicon:window',
  read: 'codicon:refresh',
  launch: 'codicon:rocket',
  open: 'codicon:folder-opened',
  'writes-config': 'codicon:settings-gear',
  ai: 'codicon:sparkle',
};

export interface SlashMenuProps {
  readonly id: string;
  readonly suggestions: readonly SlashSuggestion[];
  readonly activeIndex: number;
  /** Shown when there is nothing to suggest (e.g. `/ask` free text, or an error). */
  readonly hint: string | undefined;
  readonly onHover: (index: number) => void;
  readonly onChoose: (index: number) => void;
}

export function suggestionId(menuId: string, index: number): string {
  return `${menuId}-${index}`;
}

/**
 * Command suggestions, floating above the command bar inside the frame: commands while the
 * name is typed, then its values (apps, themes, folders…).
 */
export function SlashMenu({
  id,
  suggestions,
  activeIndex,
  hint,
  onHover,
  onChoose,
}: SlashMenuProps) {
  return (
    <div
      data-slot="slash-menu"
      className={cn(
        'launcher-fade-up absolute inset-x-0 bottom-full mb-1.5 overflow-hidden rounded-popover',
        'bg-surface-popover shadow-popover',
      )}
    >
      {suggestions.length > 0 ? (
        <div
          id={id}
          role="listbox"
          aria-label="Commands"
          className="scrollbar-thin max-h-64 overflow-y-auto p-1"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={
                suggestion.kind === 'action'
                  ? suggestion.action.id
                  : `${suggestion.action.id}:${suggestion.value}`
              }
              id={suggestionId(id, index)}
              role="option"
              tabIndex={-1}
              aria-selected={index === activeIndex}
              data-active={index === activeIndex || undefined}
              onMouseDown={(event) => event.preventDefault()}
              onPointerMove={() => onHover(index)}
              onClick={() => onChoose(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onChoose(index);
              }}
              className="group flex h-8 cursor-default items-center gap-2 rounded-menu-item px-2 data-active:bg-selection data-active:text-fg-strong"
            >
              <SuggestionContent suggestion={suggestion} />
            </div>
          ))}
        </div>
      ) : null}
      {hint === undefined ? null : (
        <div className="flex items-center gap-2 border-border-subtle border-t px-3 py-2 text-fg-muted text-xs first:border-t-0">
          <Icon name="codicon:info" size={12} />
          <span className="min-w-0 flex-1">{hint}</span>
        </div>
      )}
    </div>
  );
}

function SuggestionContent({ suggestion }: { suggestion: SlashSuggestion }) {
  if (suggestion.kind === 'action') {
    const { action } = suggestion;
    return (
      <>
        <Icon name={EFFECT_ICON[action.effect]} size={14} className="shrink-0 text-fg-muted" />
        <span className="shrink-0 font-medium font-mono text-fg-strong text-sm">/{action.id}</span>
        <span className="ml-auto min-w-0 truncate pl-2 text-fg-muted text-xs">
          {action.description}
        </span>
      </>
    );
  }
  return (
    <>
      {suggestion.app === undefined ? (
        <Icon name="codicon:arrow-right" size={14} className="shrink-0 text-fg-muted" />
      ) : (
        <AppIcon app={suggestion.app} className="size-5" />
      )}
      <span className="max-w-[65%] shrink-0 truncate text-fg-strong text-sm">
        {suggestion.label}
      </span>
      {suggestion.detail === undefined ? null : (
        <span className="ml-auto min-w-0 truncate pl-2 text-fg-muted text-xs">
          {suggestion.detail}
        </span>
      )}
      <Kbd
        shortcut="enter"
        variant="inline"
        size="sm"
        className="ml-auto shrink-0 opacity-0 group-data-active:opacity-100"
      />
    </>
  );
}
