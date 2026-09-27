import { cn, IconButton } from '@genslate/design-system';

import markUrl from '../../assets/genslate-mark.svg';

export interface LauncherTitleBarProps {
  readonly pinned: boolean;
  readonly pinShortcut: string;
  readonly onTogglePin: () => void;
  readonly onMinimize: () => void;
  readonly onClose: () => void;
}

/**
 * The launcher's own titlebar — identical on Windows, macOS and Linux (no traffic lights): the
 * GENSLATE mark and wordmark on the left (gliding with the frame edge when the tools open),
 * pin / minimise / close on the right. The whole bar drags the window.
 */
export function LauncherTitleBar({
  pinned,
  pinShortcut,
  onTogglePin,
  onMinimize,
  onClose,
}: LauncherTitleBarProps) {
  return (
    <header
      data-slot="launcher-titlebar"
      data-tauri-drag-region
      className="relative flex h-full items-center justify-end gap-0.5 pr-2"
    >
      <div
        data-tauri-drag-region
        className="launcher-follow-edge pointer-events-none absolute inset-y-0 left-0 flex items-center gap-2 pl-3.5"
      >
        <img src={markUrl} alt="" className="size-4.5" draggable={false} />
        <span className="font-semibold text-fg-strong text-xs tracking-[0.14em]">GENSLATE</span>
        <span className="text-fg-muted text-sm">Launcher</span>
      </div>
      <IconButton
        size="sm"
        label={pinned ? 'Unpin' : 'Pin on top'}
        icon={pinned ? 'codicon:pinned' : 'codicon:pin'}
        toggled={pinned}
        tooltipShortcut={pinShortcut}
        onClick={onTogglePin}
      />
      <IconButton size="sm" label="Minimise" icon="codicon:chrome-minimize" onClick={onMinimize} />
      <IconButton
        size="sm"
        label="Close"
        tooltip="Hide to tray"
        icon="codicon:chrome-close"
        className={cn('hover:bg-danger hover:text-on-danger active:bg-danger-hover')}
        onClick={onClose}
      />
    </header>
  );
}
