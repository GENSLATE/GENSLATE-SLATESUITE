/**
 * Shell-integration sequences (see `crates/core/terminal/src/integration`): the scripts mark
 * each prompt and command with OSC 133 / 633 and report the folder with OSC 7 or OSC 9;9.
 * These parse the payloads xterm hands to `registerOscHandler` (everything after `ESC ]<n>;`).
 */

/** A shell-integration mark (`OSC 133 ; <kind>`). */
export type PromptMark =
  | { readonly kind: 'prompt-start' }
  | { readonly kind: 'prompt-end' }
  | { readonly kind: 'command-start' }
  | { readonly kind: 'command-end'; readonly exitCode: number | null };

/** Parses the payload of `OSC 133` (`A`, `B`, `C`, `D;<code>`); `null` for anything else. */
export function parsePromptMark(data: string): PromptMark | null {
  const [kind, code] = data.split(';');
  switch (kind) {
    case 'A':
      return { kind: 'prompt-start' };
    case 'B':
      return { kind: 'prompt-end' };
    case 'C':
      return { kind: 'command-start' };
    case 'D': {
      const exitCode = code === undefined || code === '' ? null : Number.parseInt(code, 10);
      return { kind: 'command-end', exitCode: Number.isNaN(exitCode) ? null : exitCode };
    }
    default:
      return null;
  }
}

/** Undoes VS Code's `OSC 633` escaping: `\\` → `\`, `\xHH` → the character. */
export function unescapeCommandLine(value: string): string {
  return value.replace(/\\(\\|x([0-9a-fA-F]{2}))/g, (_match, escaped: string, hex?: string) =>
    hex === undefined ? escaped : String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

/** The command line from an `OSC 633` payload (`E;<command>[;<nonce>]`), else `null`. */
export function parseCommandLine(data: string): string | null {
  if (!data.startsWith('E;')) return null;
  const rest = data.slice(2);
  // A nonce may follow after an unescaped `;` (escaped ones are `\x3b`).
  const end = rest.indexOf(';');
  return unescapeCommandLine(end === -1 ? rest : rest.slice(0, end));
}

/**
 * The folder from `OSC 7` (`file://host/path`, percent-encoded). Windows paths arrive as
 * `/C:/Users/…` and come back with backslashes.
 */
export function parseCwdUri(data: string): string | null {
  const match = /^file:\/\/[^/]*(\/.*)$/.exec(data);
  if (match?.[1] === undefined) return null;
  let path: string;
  try {
    path = decodeURIComponent(match[1]);
  } catch {
    // Malformed escapes: keep the raw text rather than dropping the folder.
    path = match[1];
  }
  const drive = /^\/([A-Za-z]:)(\/.*)?$/.exec(path);
  if (drive?.[1] !== undefined) return `${drive[1]}${(drive[2] ?? '/').replaceAll('/', '\\')}`;
  return path;
}

/** The folder from Windows Terminal's `OSC 9 ; 9 ; <path>` (payload `9;<path>`). */
export function parseOsc9Cwd(data: string): string | null {
  if (!data.startsWith('9;')) return null;
  const path = data.slice(2).replace(/^"(.*)"$/, '$1');
  return path === '' ? null : path;
}
