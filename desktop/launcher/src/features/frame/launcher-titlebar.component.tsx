import { IconButton, TrafficLights } from '@genslate/design-system';

import markUrl from '../../assets/genslate-mark.svg';

export interface LauncherTitleBarProps {
  readonly pinned: boolean;
  readonly pinShortcut: string;
  readonly onTogglePin: () => void;
  readonly onMinimize: () => void;
  readonly onClose: () => void;
}

/**
 * The launcher's own titlebar — identical on Windows, macOS and Linux: the GENSLATE traffic
 * lights (close and minimise hide to the tray; zoom is disabled because the launcher has a fixed
 * size), then the GENSLATE mark and wordmark — all gliding with the frame edge when the tools
 * open — and pin on the right. The whole bar drags the window.
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
        className="launcher-follow-edge pointer-events-none absolute inset-y-0 left-0 flex items-center"
      >
        <div className="px-traffic-inset-x">
          {/* Only the lights take the pointer; the gaps around them still drag the window. */}
          <TrafficLights
            className="pointer-events-auto"
            disabled={{ maximize: true }}
            labels={{ close: 'Hide to tray', minimize: 'Minimise' }}
            onClose={onClose}
            onMinimize={onMinimize}
          />
        </div>
        <div className="flex items-center gap-2">
          <img src={markUrl} alt="" className="size-4.5" draggable={false} />
          <span className="font-semibold text-fg-strong text-xs tracking-[0.14em]">GENSLATE</span>
          <span className="text-fg-muted text-sm">Launcher</span>
        </div>
      </div>
      <IconButton
        size="sm"
        label={pinned ? 'Unpin' : 'Pin on top'}
        icon={pinned ? 'codicon:pinned' : 'codicon:pin'}
        toggled={pinned}
        tooltipShortcut={pinShortcut}
        onClick={onTogglePin}
      />
    </header>
  );
}
