import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogPopup,
  DialogTitle,
  Select,
  type SelectOption,
  Slider,
  Switch,
} from '@genslate/design-system';
import type { ReactNode } from 'react';

import { useGallery } from '../../app/gallery.context';
import type { GroupBy, SortKey, ThumbnailSize, ViewMode } from '../../ipc/gallery.types';

const VIEW_OPTIONS: readonly SelectOption<ViewMode>[] = [
  { value: 'timeline', label: 'Timeline', icon: 'codicon:calendar' },
  { value: 'grid', label: 'Grid', icon: 'codicon:table' },
  { value: 'details', label: 'Details', icon: 'codicon:list-flat' },
];

const GROUP_OPTIONS: readonly SelectOption<GroupBy>[] = [
  { value: 'day', label: 'Day' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const SORT_OPTIONS: readonly SelectOption<SortKey>[] = [
  { value: 'taken', label: 'Date taken' },
  { value: 'added', label: 'Date added' },
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
];

const SIZE_OPTIONS: readonly SelectOption<ThumbnailSize>[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

/** Gallery settings, saved to the app's `config.toml` (`[gallery]`). */
export function SettingsDialog() {
  const api = useGallery();
  const { settings, updateSetting } = api;

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <DialogPopup size="md" showClose>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>Saved in Gallery’s gallery.config.toml.</DialogDescription>
        <DialogBody className="flex flex-col gap-5">
          <Group title="View">
            <div className="grid grid-cols-2 gap-3">
              <Select<ViewMode>
                label="Show photos as"
                options={VIEW_OPTIONS}
                value={settings.view}
                onValueChange={(value) =>
                  value === null ? undefined : updateSetting('view', value)
                }
              />
              <Select<GroupBy>
                label="Group the timeline by"
                options={GROUP_OPTIONS}
                value={settings.groupBy}
                onValueChange={(value) =>
                  value === null ? undefined : updateSetting('groupBy', value)
                }
              />
              <Select<SortKey>
                label="Sort by"
                options={SORT_OPTIONS}
                value={settings.sortBy}
                onValueChange={(value) =>
                  value === null ? undefined : updateSetting('sortBy', value)
                }
              />
              <Select<string>
                label="Order"
                options={[
                  { value: 'descending', label: 'Newest or largest first' },
                  { value: 'ascending', label: 'Oldest or smallest first' },
                ]}
                value={settings.sortDescending ? 'descending' : 'ascending'}
                onValueChange={(value) => updateSetting('sortDescending', value === 'descending')}
              />
              <Select<ThumbnailSize>
                label="Thumbnails"
                options={SIZE_OPTIONS}
                value={settings.thumbnailSize}
                onValueChange={(value) =>
                  value === null ? undefined : updateSetting('thumbnailSize', value)
                }
              />
            </div>
            <Switch
              label="Show videos"
              checked={settings.showVideos}
              onCheckedChange={(checked) => updateSetting('showVideos', checked)}
            />
            <Switch
              label="Info panel"
              description="Details of the selected photo beside the grid and the viewer."
              checked={settings.infoPanel}
              onCheckedChange={(checked) => updateSetting('infoPanel', checked)}
            />
          </Group>
          <Group title="Library">
            <Switch
              label="Include hidden folders"
              description="Folders starting with a dot and system-hidden ones. Applies on the next scan."
              checked={settings.includeHidden}
              onCheckedChange={(checked) => updateSetting('includeHidden', checked)}
            />
            <Switch
              label="Suggest the Pictures folder"
              description="Offer it on the welcome screen while the library is empty."
              checked={settings.suggestPictures}
              onCheckedChange={(checked) => updateSetting('suggestPictures', checked)}
            />
          </Group>
          <Group title="Slideshow">
            <Slider
              label="Seconds per photo"
              showValue
              min={1}
              max={60}
              defaultValue={settings.slideshowSeconds}
              onValueCommitted={(value) => updateSetting('slideshowSeconds', value)}
            />
          </Group>
          <Group title="Safety">
            <Switch
              label="Ask before moving to the Trash"
              checked={settings.confirmTrash}
              onCheckedChange={(checked) => updateSetting('confirmTrash', checked)}
            />
          </Group>
        </DialogBody>
        <DialogFooter>
          <DialogClose tone="primary">Done</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function Group({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold text-2xs text-fg-muted uppercase tracking-wider">{title}</h3>
      {children}
    </section>
  );
}
