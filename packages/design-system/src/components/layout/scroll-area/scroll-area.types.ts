import type { ScrollArea as BaseScrollArea } from '@base-ui/react/scroll-area';
import type { Ref } from 'react';

export interface ScrollAreaProps extends Omit<BaseScrollArea.Root.Props, 'className'> {
  /** Which scrollbars to render. @default 'vertical' */
  orientation?: 'vertical' | 'horizontal' | 'both' | undefined;
  /** Show a hairline shadow at the top edge when scrolled (VS Code). @default true */
  scrollShadow?: boolean | undefined;
  className?: string | undefined;
  viewportClassName?: string | undefined;
  viewportRef?: Ref<HTMLDivElement> | undefined;
  /** Accessible name of the scrollable region (makes the viewport a focusable `region`). */
  'aria-label'?: string | undefined;
}
