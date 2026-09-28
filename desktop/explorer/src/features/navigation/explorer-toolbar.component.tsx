import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
  SegmentedControl,
  SegmentedControlItem,
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
  ToolbarSpacer,
  ToolbarTextButton,
} from '@genslate/design-system';

import { type CommandId, command, isEnabled, runCommand } from '../../app/commands.registry';
import { useExplorer } from '../../app/explorer.context';
import type { SortKey, ViewMode } from '../../ipc/explorer.types';

const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  name: 'Name',
  modified: 'Date modified',
  kind: 'Kind',
  size: 'Size',
};

const VIEWS: readonly { value: ViewMode; id: CommandId }[] = [
  { value: 'details', id: 'view-details' },
  { value: 'icons', id: 'view-icons' },
  { value: 'tiles', id: 'view-tiles' },
];

/** New ▾ · clipboard and file commands · Sort ▾ · view · hidden files, preview pane. */
export function ExplorerToolbar() {
  const api = useExplorer();
  const { tab, settings } = api;

  const button = (id: CommandId, label?: string) => {
    const entry = command(id);
    return (
      <ToolbarButton
        icon={entry.icon ?? 'codicon:circle'}
        label={label ?? entry.label}
        tooltipShortcut={entry.shortcut}
        disabled={!isEnabled(entry, api)}
        onClick={() => entry.run(api)}
      />
    );
  };

  return (
    <Toolbar aria-label="File commands" variant="bar" className="shrink-0 gap-1 px-2">
      <Menu>
        <MenuTrigger
          render={
            <ToolbarTextButton
              size="sm"
              variant="ghost"
              leadingIcon="codicon:add"
              trailingIcon="codicon:chevron-down"
              disabled={!isEnabled(command('new-folder'), api)}
            />
          }
        >
          New
        </MenuTrigger>
        <MenuPopup align="start">
          {(['new-folder', 'new-text-file', 'new-note'] as const).map((id) => {
            const entry = command(id);
            return (
              <MenuItem
                key={id}
                icon={entry.icon}
                shortcut={entry.shortcut}
                onClick={() => runCommand(id, api)}
              >
                {entry.label.replace(/^New /, '').replace(/^./, (first) => first.toUpperCase())}
              </MenuItem>
            );
          })}
        </MenuPopup>
      </Menu>
      <ToolbarSeparator />
      <ToolbarGroup aria-label="Clipboard">
        {button('cut')}
        {button('copy')}
        {button('paste')}
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup aria-label="Organize">
        {button('rename')}
        {button('duplicate')}
        {button('trash')}
        {button('undo', api.undoLabel === null ? 'Undo' : `Undo ${api.undoLabel}`)}
      </ToolbarGroup>
      <ToolbarSeparator />
      <Menu>
        <MenuTrigger
          render={
            <ToolbarTextButton
              size="sm"
              variant="ghost"
              leadingIcon="codicon:list-ordered"
              trailingIcon="codicon:chevron-down"
              disabled={tab.search !== null}
            />
          }
        >
          Sort
        </MenuTrigger>
        <MenuPopup align="start">
          <MenuGroup>
            <MenuGroupLabel>Sort by</MenuGroupLabel>
            <MenuRadioGroup
              value={tab.sortBy}
              onValueChange={(value: SortKey) =>
                api.dispatch({ type: 'sort', sortBy: value, sortDescending: tab.sortDescending })
              }
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
            value={tab.sortDescending ? 'descending' : 'ascending'}
            onValueChange={(value: string) =>
              api.dispatch({
                type: 'sort',
                sortBy: tab.sortBy,
                sortDescending: value === 'descending',
              })
            }
          >
            <MenuRadioItem value="ascending">Ascending</MenuRadioItem>
            <MenuRadioItem value="descending">Descending</MenuRadioItem>
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuCheckboxItem
            checked={settings.foldersFirst}
            onCheckedChange={(checked) => api.updateSetting('foldersFirst', checked)}
          >
            Folders first
          </MenuCheckboxItem>
        </MenuPopup>
      </Menu>
      <SegmentedControl
        size="sm"
        aria-label="View"
        value={tab.view}
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
      <ToolbarSpacer />
      <ToolbarButton
        icon={settings.showHidden ? 'codicon:eye' : 'codicon:eye-closed'}
        label={settings.showHidden ? 'Hide hidden items' : 'Show hidden items'}
        tooltipShortcut="mod+h"
        toggled={settings.showHidden}
        onClick={() => runCommand('toggle-hidden', api)}
      />
      <ToolbarButton
        icon="codicon:layout-sidebar-right"
        label={api.previewOpen ? 'Hide the preview pane' : 'Show the preview pane'}
        tooltipShortcut="alt+p"
        toggled={api.previewOpen}
        onClick={() => runCommand('toggle-preview', api)}
      />
    </Toolbar>
  );
}
