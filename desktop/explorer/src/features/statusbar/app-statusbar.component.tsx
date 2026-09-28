import { StatusBar, StatusBarItem, StatusBarSection, useTheme } from '@genslate/design-system';
import type { AppInfo } from '@genslate/tauri-bridge';

import { APP } from '../../app/app.meta';
import type { TransferTask } from '../../app/explorer.context';
import { useExplorer } from '../../app/explorer.context';
import { formatBytes, plural } from '../../model/format.util';
import { baseName, isInside } from '../../model/path.util';

const THEME_NAME = { 'polar-night': 'Polar Night', 'snow-storm': 'Snow Storm' } as const;
const THEME_ORDER = ['polar-night', 'snow-storm', 'system'] as const;

interface AppStatusBarProps {
  /** Build metadata from the running binary; `null` in a browser. */
  readonly info: AppInfo | null;
}

function taskText(task: TransferTask): string {
  const verb = task.mode === 'copy' ? 'Copying' : 'Moving';
  const what = plural(task.count, 'item');
  const progress = task.progress;
  if (progress === null || progress.totalBytes === 0) return `${verb} ${what}…`;
  const percent = Math.min(100, Math.round((progress.doneBytes / progress.totalBytes) * 100));
  return `${verb} ${what} · ${percent}%`;
}

/** Counts and selection · running copies and moves · free space · clipboard · theme · version. */
export function AppStatusBar({ info }: AppStatusBarProps) {
  const api = useExplorer();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { visible, selected, tab, listing, tasks, clipboard } = api;
  const cycleTheme = () => {
    setTheme(THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length] ?? 'system');
  };

  const selectedBytes = selected.reduce(
    (sum, entry) => sum + (entry.isDir ? 0 : (entry.size ?? 0)),
    0,
  );
  const hidden = tab.search === null ? (listing?.listing?.hiddenCount ?? 0) : 0;
  const volume = api.context.volumes
    .filter((candidate) => isInside(tab.path, candidate.path))
    .sort((a, b) => b.path.length - a.path.length)[0];

  return (
    <StatusBar>
      <StatusBarSection>
        <StatusBarItem accent icon="codicon:folder-library" label={APP.productName}>
          {APP.name}
        </StatusBarItem>
        <StatusBarItem label="Items in view">
          {tab.search === null ? plural(visible.length, 'item') : plural(visible.length, 'result')}
          {hidden > 0 ? ` · ${hidden.toLocaleString()} hidden` : ''}
        </StatusBarItem>
        {selected.length > 0 ? (
          <StatusBarItem label="Selection">
            {plural(selected.length, 'selected', 'selected')}
            {selectedBytes > 0 ? ` · ${formatBytes(selectedBytes)}` : ''}
          </StatusBarItem>
        ) : null}
        {tasks.map((task) => (
          <StatusBarItem
            key={task.id}
            icon="codicon:sync"
            label={`${taskText(task)} to ${baseName(task.destination)}. Click to stop.`}
            onClick={() => api.cancelTask(task.id)}
          >
            {taskText(task)}
          </StatusBarItem>
        ))}
      </StatusBarSection>
      <StatusBarSection align="end">
        {clipboard === null ? null : (
          <StatusBarItem
            icon={clipboard.mode === 'move' ? 'codicon:clippy' : 'codicon:copy'}
            label="Paste to put them here · click to clear"
            onClick={() => api.setClipboard(clipboard.mode, [])}
          >
            {plural(clipboard.paths.length, 'item')} to{' '}
            {clipboard.mode === 'move' ? 'move' : 'copy'}
          </StatusBarItem>
        )}
        {volume === undefined ? null : (
          <StatusBarItem
            icon="codicon:database"
            label={`${volume.label}: ${formatBytes(volume.availableBytes)} free of ${formatBytes(volume.totalBytes)}`}
          >
            {formatBytes(volume.availableBytes)} free
          </StatusBarItem>
        )}
        <StatusBarItem
          icon="codicon:color-mode"
          label="Change theme (click to cycle)"
          onClick={cycleTheme}
        >
          {THEME_NAME[resolvedTheme]}
          {theme === 'system' ? ' · System' : ''}
        </StatusBarItem>
        <StatusBarItem
          icon="codicon:tag"
          label={info ? `${info.name} ${info.version} (${info.os} ${info.arch})` : 'App version'}
        >
          v{info?.version ?? APP.version}
          {info?.debug ? ' · debug' : ''}
        </StatusBarItem>
      </StatusBarSection>
    </StatusBar>
  );
}
