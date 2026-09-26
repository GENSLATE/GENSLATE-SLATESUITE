import { cn } from '../../../utils/cn.util';
import type { ColorSwatchProps } from './color-swatch.types';
import { colorSwatchVariants } from './color-swatch.variants';

/** A colour chip with its name and value — for token documentation and pickers. */
export function ColorSwatch({
  color,
  name,
  value,
  layout = 'tile',
  className,
  ...props
}: ColorSwatchProps) {
  const styles = colorSwatchVariants({ layout });
  return (
    <div data-slot="color-swatch" className={cn(styles.root(), className)} {...props}>
      <div data-slot="color-swatch-chip" className={styles.chip()}>
        <div className={styles.fill()} style={{ background: color }} />
      </div>
      {(name != null || value != null) && (
        <div className={styles.caption()}>
          {name != null && <span className={styles.name()}>{name}</span>}
          {value != null && <span className={styles.value()}>{value}</span>}
        </div>
      )}
    </div>
  );
}
