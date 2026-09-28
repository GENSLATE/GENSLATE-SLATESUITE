import { cn } from '@genslate/design-system';
import { useRef, useState } from 'react';

import { useExplorer } from '../../app/explorer.context';
import type { Entry } from '../../ipc/explorer.types';

interface RenameFieldProps {
  readonly entry: Entry;
  readonly className?: string | undefined;
}

/**
 * Inline rename: selects the name without its extension, Enter or leaving the field renames,
 * Escape cancels.
 */
export function RenameField({ entry, className }: RenameFieldProps) {
  const api = useExplorer();
  const [value, setValue] = useState(entry.name);
  // Enter commits, then the field unmounts and blurs: commit only once.
  const settled = useRef(false);

  const settle = (commit: boolean) => {
    if (settled.current) return;
    settled.current = true;
    if (commit) api.commitRename(entry.path, value.trim());
    else api.cancelRename();
  };

  const focus = (input: HTMLInputElement | null) => {
    if (input === null) return;
    input.focus();
    const dot = entry.isDir ? -1 : entry.name.lastIndexOf('.');
    input.setSelectionRange(0, dot > 0 ? dot : entry.name.length);
  };

  return (
    <input
      ref={focus}
      data-slot="rename-field"
      aria-label={`Rename ${entry.name}`}
      value={value}
      spellCheck={false}
      autoComplete="off"
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Enter') settle(true);
        if (event.key === 'Escape') settle(false);
      }}
      onBlur={() => settle(true)}
      onMouseDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      className={cn(
        'h-5 min-w-0 rounded-xs bg-field px-1 text-base text-fg-strong outline-none ring-1 ring-focus',
        'cursor-text selection:bg-selection',
        className,
      )}
    />
  );
}
