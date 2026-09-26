import { cn } from '../../../utils/cn.util';
import type { SpinnerProps } from './spinner.types';
import { spinnerVariants } from './spinner.variants';

/** A thin VS Code-style progress ring in the current text colour. */
export function Spinner({
  size = 16,
  label = 'Loading',
  decorative = false,
  className,
  ...props
}: SpinnerProps) {
  const styles = spinnerVariants({ size });
  // Thinner strokes on bigger rings keep the hairline look.
  const stroke = size >= 32 ? 2 : 1.5;
  const r = 8 - stroke / 2;
  const circumference = 2 * Math.PI * r;
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'status', 'aria-label': label };

  return (
    <span data-slot="spinner" className={cn(styles.root(), className)} {...a11y} {...props}>
      <svg className={styles.svg()} viewBox="0 0 16 16" fill="none" aria-hidden focusable="false">
        <circle
          className={styles.track()}
          cx="8"
          cy="8"
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
        />
        <circle
          className={styles.arc()}
          cx="8"
          cy="8"
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.28} ${circumference}`}
        />
      </svg>
    </span>
  );
}
