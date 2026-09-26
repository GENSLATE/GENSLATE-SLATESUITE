import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { Children, type CSSProperties, isValidElement, type ReactElement, useMemo } from 'react';
import { useControllableState } from '../../../hooks/use-controllable-state.hook';
import { cn } from '../../../utils/cn.util';
import { SegmentedControlContext } from './segmented-control.context';
import type { SegmentedControlItemProps, SegmentedControlProps } from './segmented-control.types';
import { segmentedControlVariants } from './segmented-control.variants';

function segmentValues(children: SegmentedControlProps['children']): string[] {
  return Children.toArray(children)
    .filter((child): child is ReactElement<SegmentedControlItemProps> => isValidElement(child))
    .map((child) => child.props.value);
}

/**
 * Single-choice segmented control (macOS). Arrow keys move between segments, Space/Enter select.
 * Exactly one segment stays selected.
 */
export function SegmentedControl<Value extends string = string>({
  value,
  defaultValue,
  onValueChange,
  size = 'md',
  fullWidth = false,
  disabled = false,
  className,
  children,
  ...aria
}: SegmentedControlProps<Value>) {
  const values = segmentValues(children) as Value[];
  const [selected, setSelected] = useControllableState<Value | undefined>({
    value,
    defaultValue: () => defaultValue ?? values[0],
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next);
    },
  });
  const index = selected === undefined ? -1 : values.indexOf(selected);
  const styles = segmentedControlVariants({ size, fullWidth });
  const context = useMemo(() => ({ size }), [size]);

  return (
    <SegmentedControlContext value={context}>
      <BaseToggleGroup<Value>
        data-slot="segmented-control"
        className={cn(styles.root(), className)}
        value={selected === undefined ? [] : [selected]}
        onValueChange={(next) => {
          // Pressing the selected segment would empty the group: keep it selected.
          const [first] = next;
          if (first !== undefined) setSelected(first);
        }}
        disabled={disabled}
        style={
          {
            '--segment-count': values.length,
            '--segment-index': Math.max(index, 0),
          } as CSSProperties
        }
        {...aria}
      >
        {index >= 0 && (
          <span data-slot="segmented-control-thumb" aria-hidden className={styles.thumb()} />
        )}
        {children}
      </BaseToggleGroup>
    </SegmentedControlContext>
  );
}
