import type { MouseEvent } from 'react';
import { usePlatform } from '../../../hooks/use-platform.hook';
import { useWindowState } from '../../../hooks/use-window-state.hook';
import { PlatformContext } from '../../../providers/platform/platform.context';
import { cn } from '../../../utils/cn.util';
import type { Platform } from '../../../utils/platform.util';
import { TrafficLights } from '../traffic-lights/traffic-lights.component';
import { WindowControls } from '../window-controls/window-controls.component';
import type { TitleBarControls, TitleBarProps } from './title-bar.types';
import { titleBarVariants } from './title-bar.variants';

export function defaultTitleBarControls(platform: Platform): TitleBarControls {
  if (platform === 'macos') return 'none';
  if (platform === 'windows') return 'windows';
  return 'traffic-lights';
}

/**
 * The custom window titlebar. Empty areas carry `data-tauri-drag-region` so the window drags from them;
 * interactive children do not. Layout: [controls · leading] [center] [actions · windows controls].
 */
export function TitleBar({
  title,
  platform: platformProp,
  controls: controlsProp,
  isFocused: isFocusedProp,
  isMaximized: isMaximizedProp,
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
  const controls = controlsProp ?? defaultTitleBarControls(platform);
  const isFocused = isFocusedProp ?? windowState.isFocused;
  const isMaximized = isMaximizedProp ?? windowState.isMaximized;
  const isFullscreen = isFullscreenProp ?? windowState.isFullscreen;
  const styles = titleBarVariants({ controls });
  const maximizeOnDoubleClick = (doubleClickToMaximize ?? false) && platform !== 'macos';

  const handleDoubleClick = (event: MouseEvent<HTMLElement>) => {
    onDoubleClick?.(event);
    if (event.defaultPrevented || !maximizeOnDoubleClick) return;
    // Only empty drag areas maximize; buttons and other controls keep their own behaviour.
    if ((event.target as HTMLElement).closest('[data-tauri-drag-region]') !== event.target) return;
    onToggleMaximize?.();
  };

  // Native macOS lights overlay the webview; reserve their space unless full screen hides them.
  const showMacSpacer = platform === 'macos' && controls === 'none' && !isFullscreen;

  return (
    // Children (e.g. the command center's shortcut hint) follow the titlebar's platform.
    <PlatformContext value={platform}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: double-click-to-maximize is a pointer shortcut; the window buttons cover keyboard use */}
      <header
        data-slot="titlebar"
        data-tauri-drag-region
        data-platform={platform}
        data-inactive={isFocused ? undefined : ''}
        className={cn(styles.root(), className)}
        onDoubleClick={handleDoubleClick}
        {...props}
      >
        <div data-slot="titlebar-start" data-tauri-drag-region className={styles.start()}>
          {showMacSpacer && <div data-tauri-drag-region className={styles.spacer()} />}
          {controls === 'traffic-lights' && (
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
          )}
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
          {controls === 'windows' && (
            <WindowControls
              isMaximized={isMaximized}
              onMinimize={onMinimize}
              onToggleMaximize={onToggleMaximize}
              onClose={onClose}
              labels={{
                ...(labels?.minimize ? { minimize: labels.minimize } : {}),
                ...(labels?.maximize ? { maximize: labels.maximize } : {}),
                ...(labels?.restore ? { restore: labels.restore } : {}),
                ...(labels?.close ? { close: labels.close } : {}),
              }}
            />
          )}
        </div>
      </header>
    </PlatformContext>
  );
}
