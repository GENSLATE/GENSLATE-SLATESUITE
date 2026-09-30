import { StatusBar, StatusBarItem, StatusBarSection, useTheme } from '@genslate/design-system';
import type { AppInfo } from '@genslate/tauri-bridge';

import { APP } from '../../app/app.meta';
import type { Task } from '../../app/gallery.context';
import { useGallery } from '../../app/gallery.context';
import { formatBytes, plural } from '../../model/format.util';
import { baseName } from '../../model/path.util';

const THEME_NAME = { 'polar-night': 'Polar Night', 'snow-storm': 'Snow Storm' } as const;
const THEME_ORDER = ['polar-night', 'snow-storm', 'system'] as const;

interface AppStatusBarProps {
  /** Build metadata from the running binary; `null` in a browser. */
  readonly info: AppInfo | null;
}

function taskText(task: Task): string {
  if (task.total === 0) return `${task.label}…`;
  const percent = Math.min(100, Math.round((task.done / task.total) * 100));
  return `${task.label} · ${percent}%`;
}

/** Counts and selection · scan and task progress · library size · theme · version. */
export function AppStatusBar({ info }: AppStatusBarProps) {
  const api = useGallery();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { items, selected, scan, tasks, summary } = api;
  const cycleTheme = () => {
    setTheme(THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length] ?? 'system');
  };

  const videos = items.filter((item) => item.kind === 'video').length;
  const photos = items.length - videos;
  const selectedBytes = selected.reduce((sum, item) => sum + item.size, 0);

  return (
    <StatusBar>
      <StatusBarSection>
        <StatusBarItem accent icon="codicon:device-camera" label={APP.productName}>
          {APP.name}
        </StatusBarItem>
        <StatusBarItem label="Items in view">
          {plural(photos, 'photo')}
          {videos > 0 ? ` · ${plural(videos, 'video')}` : ''}
        </StatusBarItem>
        {selected.length > 0 ? (
          <StatusBarItem label="Selection">
            {plural(selected.length, 'selected', 'selected')} · {formatBytes(selectedBytes)}
          </StatusBarItem>
        ) : null}
        {scan === null ? null : (
          <StatusBarItem
            icon="codicon:sync"
            label={`Scanning ${scan.folder}: ${scan.read.toLocaleString()} of ${scan.toRead.toLocaleString()} new or changed files read`}
          >
            Scanning “{baseName(scan.folder)}”
            {scan.toRead > 0
              ? ` · ${scan.read.toLocaleString()} of ${scan.toRead.toLocaleString()}`
              : '…'}
          </StatusBarItem>
        )}
        {tasks.map((task) => (
          <StatusBarItem
            key={task.id}
            icon="codicon:sync"
            label={`${taskText(task)}. Click to stop.`}
            onClick={() => api.cancelTask(task.id)}
          >
            {taskText(task)}
          </StatusBarItem>
        ))}
      </StatusBarSection>
      <StatusBarSection align="end">
        {summary === null ? null : (
          <StatusBarItem
            icon="codicon:database"
            label={`Library: ${plural(summary.counts.all, 'item')} in ${plural(summary.roots.length, 'folder')}, ${formatBytes(summary.counts.bytes)}`}
          >
            {formatBytes(summary.counts.bytes)}
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
