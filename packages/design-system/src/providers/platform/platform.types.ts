import type { ReactNode } from 'react';
import type { Platform } from '../../utils/platform.util';

export interface PlatformProviderProps {
  children?: ReactNode | undefined;
  /** Where the UI runs. @default guessPlatform() */
  platform?: Platform | undefined;
}
