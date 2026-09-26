import { Slider as BaseSlider } from '@base-ui/react/slider';
import { cn } from '../../../utils/cn.util';
import type { SliderProps } from './slider.types';
import { sliderVariants } from './slider.variants';

function tickValues(
  ticks: SliderProps['ticks'],
  min: number,
  max: number,
  step: number,
): readonly number[] {
  if (!ticks) return [];
  if (ticks !== true) return ticks;
  const count = Math.floor((max - min) / step);
  if (count > 100) return [];
  return Array.from({ length: count + 1 }, (_, index) => min + index * step);
}

/** A thin track with an accent fill and a round, shadowed thumb. Pass an array for a range. */
export function Slider<Value extends number | readonly number[] = number>({
  label,
  showValue = false,
  ticks,
  getAriaLabel,
  onValueChange,
  onValueCommitted,
  min = 0,
  max = 100,
  step = 1,
  className,
  ...props
}: SliderProps<Value>) {
  const styles = sliderVariants();
  const current = props.value ?? props.defaultValue;
  const thumbCount = Array.isArray(current) ? current.length : 1;
  const marks = tickValues(ticks, min, max, step);
  // An `aria-label` on the slider also names its thumb(s): the thumb's range input is the control.
  const rootLabel = props['aria-label'];
  const thumbLabel = getAriaLabel ?? (rootLabel == null ? null : () => rootLabel);

  return (
    <BaseSlider.Root<Value>
      data-slot="slider"
      min={min}
      max={max}
      step={step}
      thumbAlignment="edge"
      onValueChange={(value) => onValueChange?.(value)}
      onValueCommitted={(value) => onValueCommitted?.(value)}
      className={cn(styles.root(), className)}
      {...props}
    >
      {(label != null || showValue) && (
        <div data-slot="slider-header" className={styles.header()}>
          {label != null && (
            <BaseSlider.Label data-slot="slider-label" className={styles.label()}>
              {label}
            </BaseSlider.Label>
          )}
          {showValue && <BaseSlider.Value data-slot="slider-value" className={styles.value()} />}
        </div>
      )}
      <BaseSlider.Control
        data-slot="slider-control"
        className={cn(styles.control(), marks.length > 0 && 'mb-1.5')}
      >
        <BaseSlider.Track data-slot="slider-track" className={styles.track()}>
          <BaseSlider.Indicator data-slot="slider-indicator" className={styles.indicator()} />
          {Array.from({ length: thumbCount }, (_, index) => (
            <BaseSlider.Thumb
              // biome-ignore lint/suspicious/noArrayIndexKey: thumbs are positional.
              key={index}
              index={index}
              data-slot="slider-thumb"
              getAriaLabel={thumbLabel}
              className={styles.thumb()}
            />
          ))}
        </BaseSlider.Track>
        {marks.length > 0 && (
          <div data-slot="slider-ticks" aria-hidden className={styles.ticks()}>
            {marks.map((mark) => (
              <span
                key={mark}
                className={styles.tick()}
                style={{ left: `${((mark - min) / (max - min)) * 100}%` }}
              />
            ))}
          </div>
        )}
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
