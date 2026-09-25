import type { Progress } from '@base-ui/react/progress';
import type { ReactNode } from 'react';

export interface ProgressBarProps
  extends Omit<Progress.Root.Props, 'className' | 'value' | 'children'> {
  /** 0–`max`, or `null` for indeterminate. @default null */
  value?: number | null | undefined;
  /** Visible label (also the accessible name). */
  label?: ReactNode | undefined;
  /** Accessible name when there's no visible label. */
  'aria-label'?: string | undefined;
  /** Show the formatted value to the right of the label. */
  showValue?: boolean | undefined;
  /** Track thickness: `sm` 2px (VS Code) · `md` 4px. @default 'md' */
  size?: 'sm' | 'md' | undefined;
  /** @default 'accent' */
  tone?: 'accent' | 'success' | 'warning' | 'danger' | undefined;
  className?: string | undefined;
}
