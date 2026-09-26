import { useLayoutEffect, useState } from 'react';
import { guessPlatform } from '../../utils/platform.util';
import { PlatformContext } from './platform.context';
import type { PlatformProviderProps } from './platform.types';

/** Shares the platform and writes `<html data-platform>` (enables the `macos:`/`windows:`/`linux:` variants). */
export function PlatformProvider({ children, platform: platformProp }: PlatformProviderProps) {
  const [guessed] = useState(guessPlatform);
  const platform = platformProp ?? guessed;

  useLayoutEffect(() => {
    document.documentElement.dataset['platform'] = platform;
  }, [platform]);

  return <PlatformContext value={platform}>{children}</PlatformContext>;
}
