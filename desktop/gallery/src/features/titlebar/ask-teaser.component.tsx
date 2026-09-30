import {
  Badge,
  Button,
  IconButton,
  Popover,
  PopoverDescription,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from '@genslate/design-system';
import { useState } from 'react';

import { runCommand } from '../../app/commands.registry';
import { useGallery } from '../../app/gallery.context';

/**
 * The AI entry point, reserved: a sparkle that explains what is coming and opens the
 * Assistant preview. Every Gallery action is already a typed command the assistant will run.
 */
export function AskTeaser() {
  const api = useGallery();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <IconButton
            size="sm"
            icon="codicon:sparkle"
            label="Ask about your photos"
            tooltip="Ask about your photos · coming soon"
            toggled={open}
          />
        }
      />
      <PopoverPopup side="bottom" align="end" sideOffset={8} className="w-80">
        <div className="flex items-center gap-2">
          <PopoverTitle className="text-fg-strong">Ask about your photos</PopoverTitle>
          <Badge tone="accent" size="sm" pill>
            Coming soon
          </Badge>
        </div>
        <PopoverDescription className="mt-1.5 text-fg-secondary text-sm">
          “Show me the beach days from last summer”, “which of these are blurry?”, “make an album of
          the best shots from Iceland”. The assistant will look at the pictures themselves, run on
          your computer, and ask before it changes anything.
        </PopoverDescription>
        <div className="mt-3 flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            leadingIcon="codicon:search-sparkle"
            onClick={() => {
              setOpen(false);
              runCommand('describe-search', api);
            }}
          >
            Describe a photo
          </Button>
          <Button
            size="sm"
            variant="secondary"
            leadingIcon="codicon:chat-sparkle"
            onClick={() => {
              setOpen(false);
              runCommand('ask', api);
            }}
          >
            Preview the assistant
          </Button>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
