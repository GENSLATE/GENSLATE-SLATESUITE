import { createContext } from 'react';
import type { CursorContextValue } from './cursor.types';

export const CursorContext = createContext<CursorContextValue | null>(null);
CursorContext.displayName = 'CursorContext';
