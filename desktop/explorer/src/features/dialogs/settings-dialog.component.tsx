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
  Switch,
} from '@genslate/design-system';
import type { ReactNode } from 'react';

import { useExplorer } from '../../app/explorer.context';
import type { SortKey, ViewMode } from '../../ipc/explorer.types';
import { baseName } from '../../model/path.util';

const VIEW_OPTIONS: readonly SelectOption<ViewMode>[] = [
  { value: 'details', label: 'Details', icon: 'codicon:list-flat' },
  { value: 'icons', label: 'Icons', icon: 'codicon:table' },
  { value: 'tiles', label: 'Tiles', icon: 'codicon:list-unordered' },
];

const SORT_OPTIONS: readonly SelectOption<SortKey>[] = [
  { value: 'name', label: 'Name' },
  { value: 'modified', label: 'Date modified' },
  { value: 'kind', label: 'Kind' },
  { value: 'size', label: 'Size' },
];

/** Explorer settings, saved to the app's `config.toml` (`[explorer]`). */
export function SettingsDialog() {
  const api = useExplorer();
  const { settings, updateSetting, context } = api;

  const startOptions: SelectOption<string>[] = context.places.map((place) => ({
    value: place.id,
    label: place.label,
  }));
  const known = startOptions.some((option) => option.value === settings.startFolder);
  if (!known)
    startOptions.push({ value: settings.startFolder, label: baseName(settings.startFolder) });
  if (!startOptions.some((option) => option.value === api.tab.path)) {
    startOptions.push({ value: api.tab.path, label: `This folder (${baseName(api.tab.path)})` });
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <DialogPopup size="md" showClose>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>
          Saved in the Explorer’s config.toml and used by new windows and tabs.
        </DialogDescription>
        <DialogBody className="flex flex-col gap-5">
          <Group title="View">
            <Select<ViewMode>
              label="New tabs open in"
              options={VIEW_OPTIONS}
              value={settings.view}
              onValueChange={(value) => (value === null ? undefined : updateSetting('view', value))}
            />
            <div className="grid grid-cols-2 gap-3">
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
                  { value: 'ascending', label: 'Ascending' },
                  { value: 'descending', label: 'Descending' },
                ]}
                value={settings.sortDescending ? 'descending' : 'ascending'}
                onValueChange={(value) => updateSetting('sortDescending', value === 'descending')}
              />
            </div>
            <Switch
              label="Folders first"
              description="Keep folders above files whatever the sort."
              checked={settings.foldersFirst}
              onCheckedChange={(checked) => updateSetting('foldersFirst', checked)}
            />
            <Switch
              label="Show hidden items"
              checked={settings.showHidden}
              onCheckedChange={(checked) => updateSetting('showHidden', checked)}
            />
            <Switch
              label="Preview pane"
              checked={settings.previewPane}
              onCheckedChange={(checked) => updateSetting('previewPane', checked)}
            />
          </Group>
          <Group title="Startup">
            <Select<string>
              label="Open at"
              options={startOptions}
              value={settings.startFolder}
              onValueChange={(value) =>
                value === null ? undefined : updateSetting('startFolder', value)
              }
            />
            <Switch
              label="Reopen last session’s tabs"
              checked={settings.restoreTabs}
              onCheckedChange={(checked) => updateSetting('restoreTabs', checked)}
            />
          </Group>
          <Group title="Safety">
            <Switch
              label="Ask before moving to the Trash"
              description="Deleting permanently always asks."
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
