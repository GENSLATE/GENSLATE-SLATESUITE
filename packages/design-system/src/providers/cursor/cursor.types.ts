import type { ReactNode } from 'react';

/** `themed`: the GENSLATE cursor family in the current theme. `system`: the OS cursors. */
export type CursorStyle = 'themed' | 'system';

export interface CursorContextValue {
  cursorStyle: CursorStyle;
  setCursorStyle: (style: CursorStyle) => void;
}

export interface CursorProviderProps {
  children?: ReactNode | undefined;
  /** Controlled style. */
  cursorStyle?: CursorStyle | undefined;
  /** Uncontrolled initial style when nothing is stored. @default 'themed' */
  defaultCursorStyle?: CursorStyle | undefined;
  onCursorStyleChange?: ((style: CursorStyle) => void) | undefined;
  /** localStorage key for the uncontrolled style. `null` disables persistence. @default 'genslate.cursor' */
  cursorStorageKey?: string | null | undefined;
}
