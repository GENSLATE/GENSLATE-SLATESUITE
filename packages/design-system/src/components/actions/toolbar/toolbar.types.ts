import type { Toolbar as BaseToolbar } from '@base-ui/react/toolbar';
import type { ComponentPropsWithRef } from 'react';
import type { ButtonProps } from '../button/button.types';
import type { IconButtonProps } from '../icon-button/icon-button.types';

export interface ToolbarProps extends Omit<BaseToolbar.Root.Props, 'className'> {
  /** `bar`: a 36px strip with a bottom hairline. `inline`: no chrome. @default 'inline' */
  variant?: 'bar' | 'inline' | undefined;
  /** Accessible name (toolbars should be labelled). */
  'aria-label'?: string | undefined;
  className?: string | undefined;
}

export interface ToolbarGroupProps extends Omit<BaseToolbar.Group.Props, 'className'> {
  className?: string | undefined;
}

export interface ToolbarSeparatorProps extends Omit<BaseToolbar.Separator.Props, 'className'> {
  className?: string | undefined;
}

/** An icon button that joins the toolbar's roving focus. */
export type ToolbarButtonProps = IconButtonProps;

/** A text button that joins the toolbar's roving focus. */
export type ToolbarTextButtonProps = ButtonProps;

export type ToolbarSpacerProps = ComponentPropsWithRef<'div'>;
