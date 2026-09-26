import type { ReactNode } from 'react';
import type { Platform } from '../../../utils/platform.util';
import type { CodiconRef } from '../../display/icon/icon.types';

export interface CommandPaletteItem {
  id: string;
  label: string;
  /** Items sharing a group render under one heading, in first-seen order. */
  group?: string | undefined;
  icon?: CodiconRef | undefined;
  /** Shortcut hint, e.g. `"mod+shift+p"`. */
  shortcut?: string | undefined;
  /** Secondary, muted text after the label (e.g. a path). */
  detail?: string | undefined;
  /** Extra search terms. */
  keywords?: readonly string[] | undefined;
  disabled?: boolean | undefined;
  onSelect: () => void;
}

export interface CommandPaletteLabels {
  /** Visually hidden dialog title. */
  title?: string | undefined;
  /** Accessible name of the results list. */
  results?: string | undefined;
  /** Shown when nothing matches. */
  empty?: string | undefined;
  navigate?: string | undefined;
  run?: string | undefined;
  close?: string | undefined;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: readonly CommandPaletteItem[];
  placeholder?: string | undefined;
  /** Custom empty state (defaults to `labels.empty`). */
  emptyState?: ReactNode | undefined;
  /** Hide the keyboard-hint footer. */
  hideFooter?: boolean | undefined;
  platform?: Platform | undefined;
  className?: string | undefined;
  labels?: CommandPaletteLabels | undefined;
}

/** A matched item with its score and the label indices to highlight. */
export interface CommandPaletteMatch {
  item: CommandPaletteItem;
  score: number;
  indices: readonly number[];
}
