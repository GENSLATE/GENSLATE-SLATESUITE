/** The codicon for each file kind. */
import type { CodiconRef } from '@genslate/design-system';

import type { Entry, FileKind } from '../ipc/explorer.types';

const ICONS: Readonly<Record<FileKind, CodiconRef>> = {
  folder: 'codicon:folder',
  image: 'codicon:file-media',
  video: 'codicon:device-camera-video',
  audio: 'codicon:music',
  text: 'codicon:file-text',
  markdown: 'codicon:markdown',
  code: 'codicon:file-code',
  data: 'codicon:bracket-dot',
  pdf: 'codicon:file-pdf',
  document: 'codicon:book',
  spreadsheet: 'codicon:table',
  presentation: 'codicon:preview',
  archive: 'codicon:file-zip',
  'disk-image': 'codicon:database',
  executable: 'codicon:gear',
  font: 'codicon:text-size',
  other: 'codicon:file-binary',
};

/** The icon for an entry (links get the symlink glyph). */
export function entryIcon(entry: Pick<Entry, 'kind' | 'symlink' | 'isDir'>): CodiconRef {
  if (entry.symlink)
    return entry.isDir ? 'codicon:file-symlink-directory' : 'codicon:file-symlink-file';
  return ICONS[entry.kind];
}
