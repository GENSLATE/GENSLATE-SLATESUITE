import type { MouseEvent } from 'react';
import { usePlatform } from '../../../hooks/use-platform.hook';
import { useWindowState } from '../../../hooks/use-window-state.hook';
import { PlatformContext } from '../../../providers/platform/platform.context';
import { cn } from '../../../utils/cn.util';
import { TrafficLights } from '../traffic-lights/traffic-lights.component';
import type { TitleBarProps } from './title-bar.types';
import { titleBarVariants } from './title-bar.variants';

/**
 * The custom window titlebar — the same on every OS: macOS-style traffic lights on the left
 * (every app window is frameless, so these are the only window buttons). Empty areas carry
 * `data-tauri-drag-region` so the window drags from them; interactive children do not.
 * Layout: [traffic lights · leading] [center] [actions].
 */
export function TitleBar({
  title,
  platform: platformProp,
  isFocused: isFocusedProp,
  isFullscreen: isFullscreenProp,
  onMinimize,
  onToggleMaximize,
  onClose,
  doubleClickToMaximize,
  leading,
  center,
  actions,
  labels,
  className,
  onDoubleClick,
  ...props
}: TitleBarProps) {
  const contextPlatform = usePlatform();
  const windowState = useWindowState();
  const platform = platformProp ?? contextPlatform;
  const isFocused = isFocusedProp ?? windowState.isFocused;
  const isFullscreen = isFullscreenProp ?? windowState.isFullscreen;
  const styles = titleBarVariants();

  const handleDoubleClick = (event: MouseEvent<HTMLElement>) => {
    onDoubleClick?.(event);
    if (event.defaultPrevented || !(doubleClickToMaximize ?? false)) return;
    // Only empty drag areas maximize; buttons and other controls keep their own behaviour.
    if ((event.target as HTMLElement).closest('[data-tauri-drag-region]') !== event.target) return;
    onToggleMaximize?.();
  };

  return (
    // Children (e.g. the command center's shortcut hint) follow the titlebar's platform.
    <PlatformContext value={platform}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: double-click-to-maximize is a pointer shortcut; the traffic lights cover keyboard use */}
      <header
        data-slot="titlebar"
        data-context-zone="titlebar"
        data-tauri-drag-region
        data-platform={platform}
        data-inactive={isFocused ? undefined : ''}
        className={cn(styles.root(), className)}
        onDoubleClick={handleDoubleClick}
        {...props}
      >
        <div data-slot="titlebar-start" data-tauri-drag-region className={styles.start()}>
          <div data-tauri-drag-region className={styles.lights()}>
            <TrafficLights
              isFocused={isFocused}
              isFullscreen={isFullscreen}
              onClose={onClose}
              onMinimize={onMinimize}
              onToggleMaximize={onToggleMaximize}
              labels={labels ?? {}}
            />
          </div>
          {leading}
        </div>
        <div data-slot="titlebar-center" data-tauri-drag-region className={styles.center()}>
          {center ?? (
            <span data-tauri-drag-region className={styles.title()}>
              {title}
            </span>
          )}
        </div>
        <div data-slot="titlebar-end" data-tauri-drag-region className={styles.end()}>
          {actions != null && (
            <div data-tauri-drag-region className={styles.actions()}>
              {actions}
            </div>
          )}
        </div>
      </header>
    </PlatformContext>
  );
}
