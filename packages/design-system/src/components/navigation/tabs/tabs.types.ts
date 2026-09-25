import type { Tabs as BaseTabs } from '@base-ui/react/tabs';
import type { CodiconRef } from '../../display/icon/icon.types';

/** `underline`: VS Code panel/editor tabs with a sliding bar. `pill`: macOS segmented control. */
export type TabsVariant = 'underline' | 'pill';

export interface TabsProps extends Omit<BaseTabs.Root.Props, 'className'> {
  variant?: TabsVariant | undefined;
  className?: string | undefined;
}

export interface TabsListProps extends Omit<BaseTabs.List.Props, 'className'> {
  /** Render the sliding `TabsIndicator` automatically (default true). */
  indicator?: boolean | undefined;
  className?: string | undefined;
}

export interface TabProps extends Omit<BaseTabs.Tab.Props, 'className'> {
  icon?: CodiconRef | undefined;
  className?: string | undefined;
}

export interface TabsPanelProps extends Omit<BaseTabs.Panel.Props, 'className'> {
  className?: string | undefined;
}

export interface TabsIndicatorProps extends Omit<BaseTabs.Indicator.Props, 'className'> {
  className?: string | undefined;
}
