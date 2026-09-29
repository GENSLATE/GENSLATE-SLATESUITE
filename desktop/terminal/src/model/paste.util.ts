/**
 * What might go wrong if a paste runs straight away. Several lines run as several commands the
 * moment they land (in shells without bracketed paste), and a few commands deserve a second look.
 */

export type PasteRisk = 'multiline' | 'elevated' | 'destructive';

export interface PasteReview {
  /** Lines that would run. */
  readonly lines: number;
  readonly risks: readonly PasteRisk[];
}

const ELEVATED = /(^|[\s;&|(])(sudo|doas|runas|su)(\s|$)|Start-Process\b[^\n]*-Verb\s+RunAs/i;
const DESTRUCTIVE =
  /(^|[\s;&|(])(rm\s+-[a-z]*r[a-z]*f|rm\s+-[a-z]*f[a-z]*r|mkfs(\.\w+)?\s|dd\s+if=|format\s+[a-z]:|Remove-Item\b[^\n]*-Recurse|rd\s+\/s|del\s+\/[sq])/i;

export function reviewPaste(text: string): PasteReview {
  const body = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  const lines = body === '' ? 0 : body.split('\n').length;
  const risks: PasteRisk[] = [];
  if (lines > 1) risks.push('multiline');
  if (ELEVATED.test(body)) risks.push('elevated');
  if (DESTRUCTIVE.test(body)) risks.push('destructive');
  return { lines, risks };
}
