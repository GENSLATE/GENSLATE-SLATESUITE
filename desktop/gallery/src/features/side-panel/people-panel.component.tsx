import { Icon, ScrollArea } from '@genslate/design-system';

import { useGallery } from '../../app/gallery.context';
import { MediaThumb } from '../library/media-thumb.component';
import { TeaserHero, TeaserSample } from './teaser.component';

/** Placeholder names for the sample. */
const NAMES = ['Ana', 'Kenji', 'Sigrid', 'Milo', 'Luna', 'Add a name'] as const;

/**
 * The People tab, a preview: faces and pets found on this computer, grouped so you can name
 * them once and find every photo of someone.
 */
export function PeoplePanel() {
  const { items } = useGallery();
  const samples = items.filter((item) => item.kind === 'image' && item.thumbnail).slice(0, 6);

  return (
    <ScrollArea className="min-h-0 flex-1" aria-label="People and pets">
      <TeaserHero icon="codicon:person" title="People">
        Gallery will group the faces in your photos, on this computer, so you can name someone once
        and find every photo of them. Nothing leaves your device.
      </TeaserHero>
      <TeaserSample label="Example">
        <div className="grid grid-cols-3 gap-3 pb-4">
          {NAMES.map((name, index) => {
            const item = samples[index];
            return (
              <div key={name} className="flex flex-col items-center gap-1.5">
                <span className="size-16 overflow-hidden rounded-full bg-surface-sunken ring-1 ring-border-subtle">
                  {item === undefined ? null : <MediaThumb item={item} />}
                </span>
                <span className="text-fg-secondary text-xs">{name}</span>
              </div>
            );
          })}
        </div>
      </TeaserSample>
      <ul className="flex flex-col gap-2 px-4 pb-4 text-fg-secondary text-sm">
        {['Find every photo of someone', 'Merge and hide faces', 'Pets get their own albums'].map(
          (line) => (
            <li key={line} className="flex items-center gap-2">
              <Icon name="codicon:check" size={14} className="text-accent-fg" />
              {line}
            </li>
          ),
        )}
      </ul>
    </ScrollArea>
  );
}
