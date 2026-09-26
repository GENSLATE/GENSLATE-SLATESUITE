import { Progress } from '@base-ui/react/progress';
import { cn } from '../../../utils/cn.util';
import type { ProgressBarProps } from './progress-bar.types';
import { progressBarVariants } from './progress-bar.variants';

/** A thin determinate or indeterminate (`value={null}`) progress bar (Base UI Progress). */
export function ProgressBar({
  value = null,
  label,
  showValue = false,
  size = 'md',
  tone = 'accent',
  className,
  ...props
}: ProgressBarProps) {
  const styles = progressBarVariants({ size, tone });
  const hasHeader = label != null || (showValue && value !== null);
  return (
    <Progress.Root
      data-slot="progress-bar"
      value={value}
      className={cn(styles.root(), className)}
      {...props}
    >
      {hasHeader && (
        <div data-slot="progress-bar-header" className={styles.header()}>
          {label != null && <Progress.Label className={styles.label()}>{label}</Progress.Label>}
          {showValue && value !== null && <Progress.Value className={styles.value()} />}
        </div>
      )}
      <Progress.Track data-slot="progress-bar-track" className={styles.track()}>
        <Progress.Indicator data-slot="progress-bar-indicator" className={styles.indicator()} />
      </Progress.Track>
    </Progress.Root>
  );
}
