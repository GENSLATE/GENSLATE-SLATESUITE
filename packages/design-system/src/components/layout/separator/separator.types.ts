import type { Separator as BaseSeparator } from '@base-ui/react/separator';

export interface SeparatorProps extends Omit<BaseSeparator.Props, 'className'> {
  /** `subtle` hairline (default) or the stronger `default` border. */
  tone?: 'subtle' | 'default' | undefined;
  className?: string | undefined;
}
