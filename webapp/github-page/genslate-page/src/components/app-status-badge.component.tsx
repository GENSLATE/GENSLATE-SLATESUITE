import { Badge } from '@genslate/design-system';

import type { AppStatus } from '../content/apps.content';

/** `Preview` (builds from source today) or `Planned`. */
export function AppStatusBadge({ status }: { readonly status: AppStatus }) {
  return status === 'preview' ? (
    <Badge tone="success" dot size="sm">
      Preview
    </Badge>
  ) : (
    <Badge tone="neutral" variant="outline" size="sm">
      Planned
    </Badge>
  );
}
