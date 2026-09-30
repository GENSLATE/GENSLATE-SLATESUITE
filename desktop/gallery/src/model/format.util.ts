/** Human formatting for sizes, counts, dates, durations and camera settings. */
import type { MediaDetails, Place } from '../ipc/gallery.types';

const UNITS = ['bytes', 'KB', 'MB', 'GB', 'TB'] as const;

/** `0 bytes`, `12.4 KB`, `3 GB` (1 KB = 1024 bytes). */
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

/** `3 photos`, `1 photo`. */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

/** `1:05`, `1:02:09`. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`;
}

const DAY_TITLE = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const DAY_TITLE_YEAR = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const MONTH_TITLE = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const SHORT = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const FULL = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const MONTH_SHORT = new Intl.DateTimeFormat(undefined, { month: 'short' });

function startOfDay(ms: number): number {
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** `Today` · `Yesterday` · `Sat, 12 Sep` · `Sat, 12 Sep 2025`. */
export function formatDayTitle(ms: number, now = Date.now()): string {
  const today = startOfDay(now);
  const day = startOfDay(ms);
  if (day === today) return 'Today';
  if (day === today - 86_400_000) return 'Yesterday';
  return new Date(ms).getFullYear() === new Date(now).getFullYear()
    ? DAY_TITLE.format(ms)
    : DAY_TITLE_YEAR.format(ms);
}

/** `September 2026`. */
export function formatMonthTitle(ms: number): string {
  return MONTH_TITLE.format(ms);
}

/** `Sep` (for the date scrubber). */
export function formatMonthShort(ms: number): string {
  return MONTH_SHORT.format(ms);
}

/** `12 Sep 2026`. */
export function formatDate(ms: number): string {
  return SHORT.format(ms);
}

/** `12 Sep 2026, 14:02`. */
export function formatFullDate(ms: number | null): string {
  return ms === null ? '—' : FULL.format(ms);
}

let countryNames: Intl.DisplayNames | null | undefined;

/** "Portugal" for "PT" (the code itself where the runtime has no names). */
export function countryName(code: string): string {
  if (countryNames === undefined) {
    try {
      countryNames = new Intl.DisplayNames(undefined, { type: 'region' });
    } catch {
      // Old runtimes without DisplayNames show the ISO code instead.
      countryNames = null;
    }
  }
  return countryNames?.of(code) ?? code;
}

/** "Lisbon, Portugal". */
export function formatPlace(place: Place): string {
  return `${place.city}, ${countryName(place.country)}`;
}

/** `ƒ/2.8 · 1/250 s · ISO 200 · 35 mm`. */
export function formatExposure(details: MediaDetails): string | null {
  const parts = [
    details.fNumber === null ? null : `ƒ/${details.fNumber.toFixed(1).replace(/\.0$/, '')}`,
    details.exposure === null ? null : `${details.exposure} s`,
    details.iso === null ? null : `ISO ${details.iso}`,
    details.focalMm === null ? null : `${Math.round(details.focalMm)} mm`,
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? null : parts.join(' · ');
}

/** `6000 × 4000 · 24 MP`. */
export function formatDimensions(width: number | null, height: number | null): string | null {
  if (width === null || height === null) return null;
  const megapixels = (width * height) / 1e6;
  return `${width.toLocaleString()} × ${height.toLocaleString()}${megapixels >= 1 ? ` · ${Math.round(megapixels)} MP` : ''}`;
}
