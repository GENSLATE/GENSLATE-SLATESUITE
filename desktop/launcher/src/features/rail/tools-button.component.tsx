import { cn, Icon, Tooltip } from '@genslate/design-system';

export interface ToolsButtonProps {
  readonly expanded: boolean;
  readonly shortcut: string;
  readonly onToggle: () => void;
}

/** Opens the wide tools view (and closes it again), level with the command bar. */
export function ToolsButton({ expanded, shortcut, onToggle }: ToolsButtonProps) {
  return (
    <div className="flex h-full items-center px-2">
      <Tooltip content={expanded ? 'Close tools' : 'Tools'} shortcut={shortcut} side="top">
        <button
          type="button"
          aria-pressed={expanded}
          aria-label={expanded ? 'Close tools' : 'Open tools'}
          onClick={onToggle}
          className={cn(
            'flex h-9 w-full cursor-default items-center justify-center gap-2 rounded-lg font-medium text-sm ring-1',
            'focus-ring transition-colors duration-fast ease-standard',
            expanded
              ? 'bg-accent-subtle text-accent-fg ring-accent-border'
              : 'bg-control text-fg-secondary ring-border-subtle hover:bg-control-hover hover:text-fg-strong active:bg-control-pressed',
          )}
        >
          <Icon
            name={expanded ? 'codicon:chevron-right' : 'codicon:tools'}
            size={14}
            className="transition-transform duration-moderate ease-spring"
          />
          {expanded ? 'Close' : 'Tools'}
        </button>
      </Tooltip>
    </div>
  );
}
