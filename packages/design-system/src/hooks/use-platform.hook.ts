import { use, useState } from 'react';
import { PlatformContext } from '../providers/platform/platform.context';
import { guessPlatform, type Platform } from '../utils/platform.util';

/** The platform from the nearest `PlatformProvider`, else a user-agent guess. */
export function usePlatform(): Platform {
  const platform = use(PlatformContext);
  const [guessed] = useState(guessPlatform);
  return platform ?? guessed;
}
