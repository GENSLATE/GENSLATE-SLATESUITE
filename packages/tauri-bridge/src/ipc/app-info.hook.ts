import { useEffect, useState } from 'react';

import type { AppInfo } from './app-info.types';
import { commands } from './commands';

/**
 * Build metadata from the app's `get_app_info` command, fetched once on mount. `null` while it
 * loads, in a plain browser, and if the command fails — callers fall back to their bundled
 * `package.json` version.
 */
export function useAppInfo(): AppInfo | null {
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    let active = true;
    commands.appInfo().then(
      (next) => {
        if (active) setInfo(next);
      },
      // Metadata is informational: keep `null` so the UI shows its fallback.
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, []);

  return info;
}
