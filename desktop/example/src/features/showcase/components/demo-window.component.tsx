import { cn } from '@genslate/design-system';
import type { ReactNode } from 'react';

interface DemoWindowProps {
  children: ReactNode;
  /** Pixel height of the miniature window. */
  height?: number;
  /** Render this subtree as a background (unfocused) window. */
  inactive?: boolean;
  className?: string;
  label?: string;
}

/**
 * A miniature app window for chrome demos. `inactive` scopes `window-inactive:` styles to the subtree
 * (the variant matches any ancestor with `data-window-focused="false"`).
 */
export function DemoWindow({ children, height, inactive = false, className, label }: DemoWindowProps) {
  return (
    <figure
      className={cn('m-0 flex w-full flex-col overflow-hidden rounded-window bg-canvas shadow-dialog', className)}
      style={height ? { height } : undefined}
      data-window-focused={inactive ? 'false' : undefined}
      aria-label={label}
    >
      {children}
    </figure>
  );
}
