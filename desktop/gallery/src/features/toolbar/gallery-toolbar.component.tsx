import {
  Icon,
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
  SegmentedControl,
  SegmentedControlItem,
  Toolbar,
  ToolbarButton,
  ToolbarSpacer,
  ToolbarTextButton,
} from '@genslate/design-system';

import { type CommandId, command, runCommand } from '../../app/commands.registry';
import { useGallery } from '../../app/gallery.context';
import type { GroupBy, SortKey, ViewMode } from '../../ipc/gallery.types';
import { collectionIcon, collectionTitle } from '../../model/collection.util';
import { plural } from '../../model/format.util';
import { SearchBox } from './search-box.component';
import { SelectionBar } from './selection-bar.component';

const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  taken: 'Date taken',
  added: 'Date added',
  name: 'Name',
  size: 'Size',
};

const GROUP_LABELS: Readonly<Record<GroupBy, string>> = {
  day: 'Day',
  month: 'Month',
  year: 'Year',
};

const VIEWS: readonly { value: ViewMode; id: CommandId }[] = [
  { value: 'timeline', id: 'view-timeline' },
  { value: 'grid', id: 'view-grid' },
  { value: 'details', id: 'view-details' },
];

/**
 * Above the photos: the collection's name and counts (or the selection's actions) · search ·
 * filter, sort and view · thumbnail size.
 */
export function GalleryToolbar() {
  const api = useGallery();
  const { settings, items, filters } = api;
  const videos = items.filter((item) => item.kind === 'video').length;
  const filtered = filters.favoritesOnly || filters.minRating > 0 || filters.kind !== null;

  return (
    <Toolbar aria-label="Photo commands" variant="bar" className="h-12 shrink-0 gap-1 px-3">
      {api.selected.length > 0 ? (
        <SelectionBar />
      ) : (
        <div className="flex min-w-0 items-center gap-2 pr-2">
          <Icon name={collectionIcon(api.collection)} className="shrink-0 text-fg-muted" />
          <h2 className="truncate font-semibold text-fg-strong text-md">
            {collectionTitle(api.collection, api.summary)}
          </h2>
          <span className="shrink-0 text-fg-muted text-xs tabular-nums">
            {plural(items.length - videos, 'photo')}
            {videos > 0 ? ` · ${plural(videos, 'video')}` : ''}
          </span>
        </div>
      )}
      <ToolbarSpacer />
      <SearchBox />
      <Menu>
        <MenuTrigger
          render={<ToolbarButton icon="codicon:filter" label="Filter" toggled={filtered} />}
        />
        <MenuPopup align="end">
          <MenuCheckboxItem
            checked={filters.favoritesOnly}
            onCheckedChange={(checked) => api.setFilters({ ...filters, favoritesOnly: checked })}
          >
            Favorites only
          </MenuCheckboxItem>
          <MenuSeparator />
          <MenuGroup>
            <MenuGroupLabel>Show</MenuGroupLabel>
            <MenuRadioGroup
              value={filters.kind ?? 'all'}
              onValueChange={(value: string) =>
                api.setFilters({
                  ...filters,
                  kind: value === 'image' ? 'image' : value === 'video' ? 'video' : null,
                })
              }
            >
              <MenuRadioItem value="all">Photos and videos</MenuRadioItem>
              <MenuRadioItem value="image">Photos only</MenuRadioItem>
              <MenuRadioItem value="video">Videos only</MenuRadioItem>
            </MenuRadioGroup>
          </MenuGroup>
          <MenuSeparator />
          <MenuGroup>
            <MenuGroupLabel>Rating</MenuGroupLabel>
            <MenuRadioGroup
              value={String(filters.minRating)}
              onValueChange={(value: string) =>
                api.setFilters({ ...filters, minRating: Number(value) })
              }
            >
              <MenuRadioItem value="0">Any rating</MenuRadioItem>
              {[3, 4, 5].map((stars) => (
                <MenuRadioItem key={stars} value={String(stars)}>
                  {stars === 5 ? '5 stars' : `${stars} stars or more`}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuGroup>
        </MenuPopup>
      </Menu>
      <Menu>
        <MenuTrigger
          render={
            <ToolbarTextButton
              size="sm"
              variant="ghost"
              leadingIcon="codicon:list-ordered"
              trailingIcon="codicon:chevron-down"
            />
          }
        >
          {SORT_LABELS[settings.sortBy]}
        </MenuTrigger>
        <MenuPopup align="end">
          <MenuGroup>
            <MenuGroupLabel>Sort by</MenuGroupLabel>
            <MenuRadioGroup
              value={settings.sortBy}
              onValueChange={(value: SortKey) => api.updateSetting('sortBy', value)}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <MenuRadioItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuGroup>
          <MenuSeparator />
          <MenuRadioGroup
            value={settings.sortDescending ? 'descending' : 'ascending'}
            onValueChange={(value: string) =>
              api.updateSetting('sortDescending', value === 'descending')
            }
          >
            <MenuRadioItem value="descending">
              {settings.sortBy === 'name'
                ? 'Z to A'
                : settings.sortBy === 'size'
                  ? 'Largest first'
                  : 'Newest first'}
            </MenuRadioItem>
            <MenuRadioItem value="ascending">
              {settings.sortBy === 'name'
                ? 'A to Z'
                : settings.sortBy === 'size'
                  ? 'Smallest first'
                  : 'Oldest first'}
            </MenuRadioItem>
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuGroup>
            <MenuGroupLabel>Group the timeline by</MenuGroupLabel>
            <MenuRadioGroup
              value={settings.groupBy}
              onValueChange={(value: GroupBy) => api.updateSetting('groupBy', value)}
            >
              {(Object.keys(GROUP_LABELS) as GroupBy[]).map((key) => (
                <MenuRadioItem key={key} value={key}>
                  {GROUP_LABELS[key]}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuGroup>
          <MenuSeparator />
          <MenuCheckboxItem
            checked={settings.showVideos}
            onCheckedChange={(checked) => api.updateSetting('showVideos', checked)}
          >
            Show videos
          </MenuCheckboxItem>
        </MenuPopup>
      </Menu>
      <SegmentedControl
        size="sm"
        aria-label="View"
        value={settings.view}
        onValueChange={(value: ViewMode) => {
          const entry = VIEWS.find((view) => view.value === value);
          if (entry !== undefined) runCommand(entry.id, api);
        }}
      >
        {VIEWS.map((view) => {
          const entry = command(view.id);
          return (
            <SegmentedControlItem
              key={view.value}
              value={view.value}
              icon={entry.icon}
              label={entry.label}
            />
          );
        })}
      </SegmentedControl>
      <ToolbarButton
        icon="codicon:zoom-out"
        label="Smaller thumbnails"
        tooltipShortcut="mod+-"
        disabled={settings.thumbnailSize === 'small' || settings.view === 'details'}
        onClick={() => runCommand('zoom-out', api)}
      />
      <ToolbarButton
        icon="codicon:zoom-in"
        label="Bigger thumbnails"
        tooltipShortcut="mod+="
        disabled={settings.thumbnailSize === 'large' || settings.view === 'details'}
        onClick={() => runCommand('zoom-in', api)}
      />
    </Toolbar>
  );
}
