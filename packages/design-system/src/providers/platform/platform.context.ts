import { createContext } from 'react';
import type { Platform } from '../../utils/platform.util';

/** `null` outside a provider: `usePlatform()` then falls back to `guessPlatform()`. */
export const PlatformContext = createContext<Platform | null>(null);
PlatformContext.displayName = 'PlatformContext';
