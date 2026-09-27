import {
  Badge,
  IconButton,
  Popover,
  PopoverDescription,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from '@genslate/design-system';

export interface AiTeaserProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * The AI entry point, reserved: a sparkle in the command bar (and `/ask`) that explains what
 * is coming. Every launcher action is already a typed command an assistant will be able to run.
 */
export function AiTeaser({ open, onOpenChange }: AiTeaserProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <IconButton
            size="sm"
            label="AI assistant"
            tooltip="AI assistant — coming soon"
            icon="codicon:sparkle"
            toggled={open}
          />
        }
      />
      <PopoverPopup side="top" align="end" sideOffset={10} className="w-72">
        <div className="flex items-center gap-2">
          <PopoverTitle className="text-fg-strong">AI assistant</PopoverTitle>
          <Badge tone="accent" size="sm" pill>
            Coming soon
          </Badge>
        </div>
        <PopoverDescription className="mt-1.5 text-fg-secondary text-sm">
          Ask in plain words — “open my notes and start the terminal in Documents”. Every launcher
          action is already a command the assistant will be able to run for you.
        </PopoverDescription>
      </PopoverPopup>
    </Popover>
  );
}
