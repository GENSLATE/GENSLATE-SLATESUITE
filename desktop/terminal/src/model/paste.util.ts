/**
 * What might go wrong if a paste runs straight away. Several lines run as several commands the
 * moment they land (in shells without bracketed paste), and a few commands deserve a second look.
 */

export type PasteRisk = 'multiline' | 'runs-now' | 'hidden' | 'elevated' | 'destructive';

export interface PasteReview {
  /** Lines that would run. */
  readonly lines: number;
  readonly risks: readonly PasteRisk[];
}

const ELEVATED = /(^|[\s;&|(])(sudo|doas|runas|su)(\s|$)|Start-Process\b[^\n]*-Verb\s+RunAs/i;
const DESTRUCTIVE =
  /(^|[\s;&|(])(rm\s+-[a-z]*r[a-z]*f|rm\s+-[a-z]*f[a-z]*r|mkfs(\.\w+)?\s|dd\s+if=|format\s+[a-z]:|Remove-Item\b[^\n]*-Recurse|rd\s+\/s|del\s+\/[sq])/i;

/** C0 (but tab and line breaks), DEL and C1: escapes and the like, invisible in a preview. */
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching control characters is the point
const HIDDEN = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/;
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching control characters is the point
const HIDDEN_ALL = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g;

/** `text` without the control characters a paste must never carry into a shell. */
export function withoutControlCharacters(text: string): string {
  return text.replace(HIDDEN_ALL, '');
}

export function reviewPaste(text: string): PasteReview {
  const normalized = text.replace(/\r\n?/g, '\n');
  const body = normalized.replace(/\n+$/, '');
  const lines = body === '' ? 0 : body.split('\n').length;
  const risks: PasteRisk[] = [];
  if (lines > 1) risks.push('multiline');
  else if (lines === 1 && body !== normalized) risks.push('runs-now');
  if (HIDDEN.test(body)) risks.push('hidden');
  if (ELEVATED.test(body)) risks.push('elevated');
  if (DESTRUCTIVE.test(body)) risks.push('destructive');
  return { lines, risks };
}
