import { use } from 'react';
import { CursorContext } from '../providers/cursor/cursor.context';
import type { CursorContextValue } from '../providers/cursor/cursor.types';

/** The cursor style (`themed` or `system`) and its setter. Must be used inside `CursorProvider` / `DesignSystemProvider`. */
export function useCursorStyle(): CursorContextValue {
  const value = use(CursorContext);
  if (!value)
    throw new Error(
      'useCursorStyle() must be used inside <CursorProvider> or <DesignSystemProvider>.',
    );
  return value;
}
