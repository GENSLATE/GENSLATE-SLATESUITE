/** Compact number formatting for the status bar (tabular, short, locale-neutral units). */

const GB = 1024 ** 3;

/** `99.4 GB`, `512 MB`. */
export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${trim(bytes / GB)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/** `1.2 MB/s`, `82 KB/s`, `0 B/s`. */
export function formatRate(bytesPerSecond: number): string {
  if (bytesPerSecond >= 1024 ** 2) return `${trim(bytesPerSecond / 1024 ** 2)} MB/s`;
  if (bytesPerSecond >= 1024) return `${Math.round(bytesPerSecond / 1024)} KB/s`;
  return `${Math.round(bytesPerSecond)} B/s`;
}

/** `48°` */
export function formatTemp(celsius: number): string {
  return `${Math.round(celsius)}°`;
}

/** `12%` */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** One decimal below 100, none above: `9.4`, `161`. */
function trim(value: number): string {
  return value >= 100 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, '');
}
