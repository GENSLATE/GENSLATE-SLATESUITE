import { cn } from '../../../utils/cn.util';
import type { IconProps } from './icon.types';
import { iconVariants } from './icon.variants';

/**
 * One icon API for the whole kit.
 *  - `<Icon name="codicon:search" />` — VS Code Codicons (the default for chrome and editor UI)
 *  - `<Icon icon={Sparkles} />` — Lucide, drawn at a 1.5 stroke to sit with Codicons
 * Decorative unless `label` is given.
 */
export function Icon({ size = 16, label, className, spin = false, ...props }: IconProps) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  const classes = cn(iconVariants({ size, spin }), className);

  if (props.icon) {
    const Svg = props.icon;
    return (
      <span data-slot="icon" className={classes} {...a11y}>
        <Svg size={size} strokeWidth={1.5} aria-hidden focusable="false" />
      </span>
    );
  }

  const glyph = props.name.slice('codicon:'.length);
  return <span data-slot="icon" className={cn('codicon', `codicon-${glyph}`, classes)} {...a11y} />;
}
