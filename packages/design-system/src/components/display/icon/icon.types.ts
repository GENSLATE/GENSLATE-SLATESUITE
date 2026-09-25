import type { ComponentType, SVGProps } from 'react';
import type { CodiconName } from '../../../icons/codicon-names.generated';

/** Codicon glyph reference, e.g. `"codicon:search"`. */
export type CodiconRef = `codicon:${CodiconName}`;

export type IconSize = 12 | 14 | 16 | 20;

/** A Lucide (or any SVG) icon component. */
export type SvgIconComponent = ComponentType<
  SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }
>;

interface IconBaseProps {
  /** Pixel size. Codicons are drawn on a 16px grid; 14 in dense spots. */
  size?: IconSize | undefined;
  /** Accessible name. Omit for decorative icons (they are hidden from assistive tech). */
  label?: string | undefined;
  className?: string | undefined;
  /** Spin (e.g. `codicon:loading`, `codicon:sync`). Honours reduced motion. */
  spin?: boolean | undefined;
}

export interface CodiconIconProps extends IconBaseProps {
  name: CodiconRef;
  icon?: never;
}

export interface SvgIconProps extends IconBaseProps {
  /** A Lucide icon — only where no Codicon fits. */
  icon: SvgIconComponent;
  name?: never;
}

export type IconProps = CodiconIconProps | SvgIconProps;
