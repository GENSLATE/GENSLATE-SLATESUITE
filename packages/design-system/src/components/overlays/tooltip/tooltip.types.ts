import type { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import type { ReactElement, ReactNode } from 'react';
import type { Platform } from '../../../utils/platform.util';

export interface TooltipProviderProps extends BaseTooltip.Provider.Props {}

export interface TooltipProps extends Omit<BaseTooltip.Root.Props, 'children'> {
  /** Tooltip text. */
  content: ReactNode;
  /** Optional shortcut shown after the text, e.g. `"mod+s"` → `⌘S`. */
  shortcut?: string | undefined;
  platform?: Platform | undefined;
  /** The trigger element (rendered via Base UI's `render` prop; must accept a ref and props). */
  children: ReactElement;
  side?: BaseTooltip.Positioner.Props['side'] | undefined;
  align?: BaseTooltip.Positioner.Props['align'] | undefined;
  sideOffset?: number | undefined;
  /** Hover delay in ms (default 600, macOS-like). */
  delay?: number | undefined;
  className?: string | undefined;
}
