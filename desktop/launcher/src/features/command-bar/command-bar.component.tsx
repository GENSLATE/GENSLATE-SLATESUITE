import { cn, Icon, Kbd } from '@genslate/design-system';
import type { KeyboardEvent, Ref } from 'react';

import { AiTeaser } from './ai-teaser.component';
import { SlashMenu, type SlashMenuProps } from './slash-menu.component';

export interface CommandBarProps {
  readonly inputRef: Ref<HTMLInputElement>;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** The listbox the input controls (apps or slash suggestions). */
  readonly controls: string;
  readonly activeDescendant: string | undefined;
  /** Shown while a slash command is being typed. */
  readonly slash: SlashMenuProps | null;
  readonly focusShortcut: string;
  readonly aiOpen: boolean;
  readonly onAiOpenChange: (open: boolean) => void;
}

/**
 * The bottom band's search / slash bar: plain text searches every tab; `/` opens commands
 * (their suggestions float above). The sparkle is the reserved AI entry point.
 */
export function CommandBar({
  inputRef,
  value,
  onChange,
  onKeyDown,
  controls,
  activeDescendant,
  slash,
  focusShortcut,
  aiOpen,
  onAiOpenChange,
}: CommandBarProps) {
  const isSlash = value.startsWith('/');
  return (
    <div
      data-slot="command-bar"
      className="absolute inset-y-0 right-0 flex w-[calc(var(--launcher-normal)-var(--spacing-launcher-rail))] items-center pr-1 pl-2"
    >
      <div className="relative w-full">
        {slash === null ? null : <SlashMenu {...slash} />}
        <div
          className={cn(
            'flex h-9 items-center gap-2 rounded-lg bg-field pr-1 pl-2.5 ring-1 ring-border-subtle',
            'focus-ring-within transition-shadow duration-fast ease-standard',
          )}
        >
          <Icon
            name={isSlash ? 'codicon:terminal' : 'codicon:search'}
            size={14}
            className={cn(
              'shrink-0 transition-colors duration-fast',
              isSlash ? 'text-accent-fg' : 'text-fg-muted',
            )}
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="Search apps or type / for commands"
            aria-expanded={slash !== null || undefined}
            aria-controls={controls}
            aria-activedescendant={activeDescendant}
            aria-autocomplete="list"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search apps or type /"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            className="min-w-0 flex-1 bg-transparent text-fg-strong text-sm outline-none placeholder:text-fg-muted"
          />
          {value === '' ? <Kbd shortcut={focusShortcut} size="sm" className="shrink-0" /> : null}
          <AiTeaser open={aiOpen} onOpenChange={onAiOpenChange} />
        </div>
      </div>
    </div>
  );
}
