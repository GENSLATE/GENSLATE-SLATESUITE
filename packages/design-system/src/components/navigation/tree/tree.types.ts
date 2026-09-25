import type { ComponentProps, ReactNode } from 'react';
import type { CodiconRef } from '../../display/icon/icon.types';

export interface TreeLabels {
  /** Accessible name of the tree when no `aria-label` / `aria-labelledby` is given. */
  tree?: string | undefined;
}

export interface TreeProps
  extends Omit<
    ComponentProps<'ul'>,
    'className' | 'onSelect' | 'role' | 'defaultValue' | 'children'
  > {
  children?: ReactNode | undefined;
  /** Selected item id (controlled). */
  selected?: string | null | undefined;
  defaultSelected?: string | null | undefined;
  /** Called when an item is selected by click, Enter or Space. */
  onSelect?: ((id: string) => void) | undefined;
  /** Called on Enter or double-click (e.g. open the file). */
  onAction?: ((id: string) => void) | undefined;
  /** Expanded item ids (controlled). */
  expanded?: readonly string[] | undefined;
  defaultExpanded?: readonly string[] | undefined;
  onExpandedChange?: ((ids: string[]) => void) | undefined;
  /** Arrow keys also select (VS Code explorer behaviour). Default false. */
  selectionFollowsFocus?: boolean | undefined;
  /** Indent guides: always, on hover of the tree (VS Code default), or never. */
  indentGuides?: 'always' | 'hover' | 'none' | undefined;
  className?: string | undefined;
  labels?: TreeLabels | undefined;
}

export interface TreeItemProps
  extends Omit<ComponentProps<'li'>, 'className' | 'id' | 'role' | 'children' | 'onSelect'> {
  /** Unique id within the tree. */
  id: string;
  /** Row content. */
  label: ReactNode;
  /** Text used for type-ahead when `label` is not plain text. */
  textValue?: string | undefined;
  /** Leading icon; `expandedIcon` swaps it while open (e.g. folder / folder-opened). */
  icon?: CodiconRef | undefined;
  expandedIcon?: CodiconRef | undefined;
  /** Trailing, muted content (badges, counts, git status). */
  trailing?: ReactNode | undefined;
  disabled?: boolean | undefined;
  /** Nested `TreeItem`s. */
  children?: ReactNode | undefined;
  className?: string | undefined;
}
