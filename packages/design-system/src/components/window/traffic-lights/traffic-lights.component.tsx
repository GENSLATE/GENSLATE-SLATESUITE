import { useWindowState } from '../../../hooks/use-window-state.hook';
import { cn } from '../../../utils/cn.util';
import type { TrafficLightsProps } from './traffic-lights.types';
import { trafficLightsVariants } from './traffic-lights.variants';

const GLYPH_PROPS = { viewBox: '0 0 12 12', fill: 'none', focusable: 'false' } as const;

function CloseGlyph({ className }: { className: string }) {
  return (
    <svg {...GLYPH_PROPS} aria-hidden="true" className={className}>
      <path
        d="M3.75 3.75l4.5 4.5M8.25 3.75l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MinimizeGlyph({ className }: { className: string }) {
  return (
    <svg {...GLYPH_PROPS} aria-hidden="true" className={className}>
      <path d="M3.1 6h5.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** Two opposed triangles: outwards to enter full screen, inwards to leave it. */
function FullscreenGlyph({ className, exit }: { className: string; exit: boolean }) {
  return (
    <svg {...GLYPH_PROPS} aria-hidden="true" className={className}>
      {exit ? (
        <path d="M6.6 1.9v3.5h3.5zM5.4 10.1V6.6H1.9z" fill="currentColor" />
      ) : (
        <path d="M3.3 3.3h4.1L3.3 7.4zM8.7 8.7H4.6l4.1-4.1z" fill="currentColor" />
      )}
    </svg>
  );
}

/** macOS window buttons (close, minimize, zoom) for custom titlebars on non-mac platforms. */
export function TrafficLights({
  onClose,
  onMinimize,
  onToggleMaximize,
  isFocused: isFocusedProp,
  isFullscreen = false,
  disabled,
  labels,
  className,
  ...props
}: TrafficLightsProps) {
  const windowState = useWindowState();
  const isFocused = isFocusedProp ?? windowState.isFocused;
  const styles = trafficLightsVariants();
  const glyph = styles.glyph();

  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would bring form semantics to window chrome
    <div
      data-slot="traffic-lights"
      data-inactive={isFocused ? undefined : ''}
      role="group"
      aria-label={labels?.group ?? 'Window controls'}
      className={cn(styles.root(), className)}
      {...props}
    >
      <button
        type="button"
        data-slot="traffic-light-close"
        aria-label={labels?.close ?? 'Close'}
        disabled={disabled?.close}
        onClick={onClose}
        className={trafficLightsVariants({ kind: 'close' }).light()}
      >
        <CloseGlyph className={glyph} />
      </button>
      <button
        type="button"
        data-slot="traffic-light-minimize"
        aria-label={labels?.minimize ?? 'Minimize'}
        disabled={disabled?.minimize}
        onClick={onMinimize}
        className={trafficLightsVariants({ kind: 'minimize' }).light()}
      >
        <MinimizeGlyph className={glyph} />
      </button>
      <button
        type="button"
        data-slot="traffic-light-maximize"
        aria-label={
          isFullscreen
            ? (labels?.exitFullscreen ?? 'Exit Full Screen')
            : (labels?.maximize ?? 'Zoom')
        }
        disabled={disabled?.maximize}
        onClick={onToggleMaximize}
        className={trafficLightsVariants({ kind: 'maximize' }).light()}
      >
        <FullscreenGlyph className={glyph} exit={isFullscreen} />
      </button>
    </div>
  );
}
