import { Separator as BaseSeparator } from '@base-ui/react/separator';
import { cn } from '../../../utils/cn.util';
import type { SeparatorProps } from './separator.types';
import { separatorVariants } from './separator.variants';

/** A 1px hairline between groups (Base UI Separator, `role="separator"`). */
export function Separator({ tone = 'subtle', className, ...props }: SeparatorProps) {
  return (
    <BaseSeparator
      data-slot="separator"
      className={cn(separatorVariants({ tone }), className)}
      {...props}
    />
  );
}
