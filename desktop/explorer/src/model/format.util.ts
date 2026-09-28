/** Human formatting for sizes, dates, counts and file kinds. */
import type { Entry, FileKind } from '../ipc/explorer.types';

const UNITS = ['bytes', 'KB', 'MB', 'GB', 'TB'] as const;

/** `0 bytes`, `1 byte`, `12.4 KB`, `3 GB` (1 KB = 1024 bytes, like Windows). */
export function formatBytes(bytes: number): string {
  if (bytes === 1) return '1 byte';
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits).replace(/\.0$/, '')} ${UNITS[unit]}`;
}

/** `3 items`, `1 item`. */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

const TIME = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const DATE = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const FULL = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** `Today, 14:02` · `Yesterday, 09:15` · `12 Mar 2026`. */
export function formatDate(ms: number | null, now = Date.now()): string {
  if (ms === null) return '—';
  const date = new Date(ms);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (ms >= startOfToday && ms < startOfToday + 86_400_000) return `Today, ${TIME.format(date)}`;
  if (ms >= startOfToday - 86_400_000 && ms < startOfToday) {
    return `Yesterday, ${TIME.format(date)}`;
  }
  return DATE.format(date);
}

/** A full date and time, for Properties and tooltips. */
export function formatFullDate(ms: number | null): string {
  return ms === null ? '—' : FULL.format(new Date(ms));
}

const KIND_NAMES: Readonly<Record<FileKind, string>> = {
  folder: 'Folder',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  text: 'Text document',
  markdown: 'Markdown document',
  code: 'Source code',
  data: 'Data file',
  pdf: 'PDF document',
  document: 'Document',
  spreadsheet: 'Spreadsheet',
  presentation: 'Presentation',
  archive: 'Archive',
  'disk-image': 'Disk image',
  executable: 'Application',
  font: 'Font',
  other: 'File',
};

/** `PNG image`, `Folder`, `Markdown document`, `File`. */
export function kindLabel(entry: Pick<Entry, 'kind' | 'extension'>): string {
  const base = KIND_NAMES[entry.kind];
  if (entry.kind === 'folder' || entry.extension === null) return base;
  if (entry.kind === 'other') return `${entry.extension.toUpperCase()} file`;
  if (entry.kind === 'image' || entry.kind === 'video' || entry.kind === 'audio') {
    return `${entry.extension.toUpperCase()} ${base.toLowerCase()}`;
  }
  return base;
}
