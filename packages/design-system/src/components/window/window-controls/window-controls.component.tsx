import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon/icon.component';
import type { WindowControlsProps } from './window-controls.types';
import { windowControlsVariants } from './window-controls.variants';

/** Windows-style minimize / maximize / close caption buttons. */
export function WindowControls({
  onMinimize,
  onToggleMaximize,
  onClose,
  isMaximized = false,
  labels,
  className,
  ...props
}: WindowControlsProps) {
  const button = windowControlsVariants().button();
  const close = windowControlsVariants({ kind: 'close' }).button();
  const maximizeLabel = isMaximized
    ? (labels?.restore ?? 'Restore')
    : (labels?.maximize ?? 'Maximize');
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would bring form semantics to window chrome
    <div
      data-slot="window-controls"
      role="group"
      aria-label={labels?.group ?? 'Window controls'}
      className={cn(windowControlsVariants().root(), className)}
      {...props}
    >
      <button
        type="button"
        aria-label={labels?.minimize ?? 'Minimize'}
        title={labels?.minimize ?? 'Minimize'}
        className={button}
        onClick={onMinimize}
      >
        <Icon name="codicon:chrome-minimize" />
      </button>
      <button
        type="button"
        aria-label={maximizeLabel}
        title={maximizeLabel}
        className={button}
        onClick={onToggleMaximize}
      >
        <Icon name={isMaximized ? 'codicon:chrome-restore' : 'codicon:chrome-maximize'} />
      </button>
      <button
        type="button"
        aria-label={labels?.close ?? 'Close'}
        title={labels?.close ?? 'Close'}
        className={close}
        onClick={onClose}
      >
        <Icon name="codicon:chrome-close" />
      </button>
    </div>
  );
}
