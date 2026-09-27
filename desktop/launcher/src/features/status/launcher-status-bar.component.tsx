import { cn, Icon, IconButton, ProgressBar, Tooltip } from '@genslate/design-system';
import { type ReactNode, useEffect, useState } from 'react';

import { useLauncher } from '../../app/launcher.context';
import type { StatusMode, Telemetry, VolumeInfo } from '../../ipc/launcher.types';
import { formatBytes, formatPercent, formatRate, formatTemp } from './format.util';

export interface LauncherStatusBarProps {
  readonly mode: StatusMode;
  readonly onModeChange: (mode: StatusMode) => void;
  readonly onOpenSettings: () => void;
}

/**
 * The frame's bottom edge: the install drive with its free space on the left (gliding with the
 * frame edge), CPU/GPU temperatures — or usage and network — on the right. Readings the machine
 * can't provide are hidden; sampling only runs while the launcher is visible.
 */
export function LauncherStatusBar({ mode, onModeChange, onOpenSettings }: LauncherStatusBarProps) {
  const { backend, stage, showCount, settings, context } = useLauncher();
  const [volume, setVolume] = useState<VolumeInfo | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);

  useEffect(() => {
    if (showCount === 0) return;
    backend.volume().then(setVolume, () => setVolume(null));
  }, [backend, showCount]);

  useEffect(() => {
    const open = stage === 'open';
    const stop = backend.on('telemetry', setTelemetry);
    backend.setTelemetryActive(open).catch(() => undefined);
    return () => {
      stop.then(
        (unsubscribe) => unsubscribe(),
        () => undefined,
      );
      backend.setTelemetryActive(false).catch(() => undefined);
    };
  }, [backend, stage]);

  const hasTemps =
    telemetry !== null && (telemetry.cpuTempC !== null || telemetry.gpuTempC !== null);
  const effective: StatusMode = mode === 'temps' && !hasTemps ? 'usage' : mode;

  return (
    <footer
      data-slot="launcher-status-bar"
      className="relative flex h-full items-center border-border-subtle border-t text-fg-muted text-xs tabular-nums"
    >
      <div className="launcher-follow-edge absolute inset-y-0 left-0 flex items-center gap-2 pl-3.5">
        {volume === null ? null : <VolumeMeter volume={volume} />}
      </div>
      <div className="ml-auto flex items-center gap-3 pr-1.5">
        {settings.issue === null ? null : (
          <Tooltip content={`Settings file ignored: ${settings.issue}`}>
            <button
              type="button"
              onClick={onOpenSettings}
              className="focus-ring flex cursor-default items-center gap-1 rounded-sm px-1 text-warning-fg hover:bg-fill-hover"
            >
              <Icon name="codicon:warning" size={12} />
              Settings
            </button>
          </Tooltip>
        )}
        {context.mode === 'dev' ? (
          <span className="rounded-sm bg-fill-hover px-1 font-semibold text-2xs tracking-wider">
            DEV
          </span>
        ) : null}
        {telemetry === null ? null : <Readings telemetry={telemetry} mode={effective} />}
        {hasTemps ? (
          <IconButton
            size="xs"
            label={effective === 'temps' ? 'Show usage' : 'Show temperatures'}
            icon="codicon:arrow-swap"
            onClick={() => onModeChange(effective === 'temps' ? 'usage' : 'temps')}
          />
        ) : null}
      </div>
    </footer>
  );
}

function VolumeMeter({ volume }: { volume: VolumeInfo }) {
  const free = volume.totalBytes > 0 ? (volume.availableBytes / volume.totalBytes) * 100 : 0;
  const used = 100 - free;
  const tone = free < 5 ? 'danger' : free < 15 ? 'warning' : 'accent';
  const title = `${volume.name ?? volume.label} — ${formatBytes(volume.availableBytes)} free of ${formatBytes(volume.totalBytes)}${volume.removable ? ' (removable)' : ''}`;
  return (
    <Tooltip content={title} side="top">
      <span className="flex cursor-default items-center gap-2">
        <Icon name={volume.removable ? 'codicon:archive' : 'codicon:database'} size={12} />
        <span className="font-semibold text-fg-secondary">{volume.label}</span>
        <ProgressBar value={used} size="md" tone={tone} aria-label="Space used" className="w-16" />
        <span>
          {formatPercent(free)} free · {formatBytes(volume.availableBytes)} /{' '}
          {formatBytes(volume.totalBytes)}
        </span>
      </span>
    </Tooltip>
  );
}

function Readings({ telemetry, mode }: { telemetry: Telemetry; mode: StatusMode }) {
  const items: ReactNode[] = [];
  if (mode === 'temps') {
    if (telemetry.cpuTempC !== null)
      items.push(<Reading key="cpu" label="CPU" value={formatTemp(telemetry.cpuTempC)} />);
    if (telemetry.gpuTempC !== null)
      items.push(<Reading key="gpu" label="GPU" value={formatTemp(telemetry.gpuTempC)} />);
  } else {
    if (telemetry.cpuUsagePct !== null)
      items.push(<Reading key="cpu" label="CPU" value={formatPercent(telemetry.cpuUsagePct)} />);
    if (telemetry.gpuUsagePct !== null)
      items.push(<Reading key="gpu" label="GPU" value={formatPercent(telemetry.gpuUsagePct)} />);
    if (telemetry.netDownBps !== null)
      items.push(<Reading key="down" icon="down" value={formatRate(telemetry.netDownBps)} />);
    if (telemetry.netUpBps !== null)
      items.push(<Reading key="up" icon="up" value={formatRate(telemetry.netUpBps)} />);
  }
  return (
    <span key={mode} className="launcher-fade-up flex items-center gap-2.5" aria-live="off">
      {items}
    </span>
  );
}

function Reading({ label, icon, value }: { label?: string; icon?: 'down' | 'up'; value: string }) {
  return (
    <span className="flex items-center gap-1">
      {icon === undefined ? null : (
        <Icon name={icon === 'down' ? 'codicon:arrow-down' : 'codicon:arrow-up'} size={12} />
      )}
      {label === undefined ? null : <span>{label}</span>}
      <span className={cn('font-medium text-fg-secondary')}>{value}</span>
    </span>
  );
}
