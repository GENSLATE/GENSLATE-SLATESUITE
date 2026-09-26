import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { cn } from '../../../utils/cn.util';
import type { ToggleGroupProps } from './toggle-button.types';
import { toggleGroupVariants } from './toggle-button.variants';

/** Shared pressed state for `ToggleButton`s, with arrow-key roving focus (Base UI ToggleGroup). */
export function ToggleGroup<Value extends string = string>({
  className,
  ...props
}: ToggleGroupProps<Value>) {
  return (
    <BaseToggleGroup<Value>
      data-slot="toggle-group"
      className={cn(toggleGroupVariants(), className)}
      {...props}
    />
  );
}
