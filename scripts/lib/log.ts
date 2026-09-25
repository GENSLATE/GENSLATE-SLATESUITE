/**
 * Pretty, dependency-free console output. Colours are disabled when stdout is not a TTY or
 * `NO_COLOR` is set (https://no-color.org), and forced with `FORCE_COLOR`.
 */

const useColor = (): boolean => {
  if (process.env['NO_COLOR'] !== undefined) return false;
  if (process.env['FORCE_COLOR'] !== undefined) return true;
  return process.stdout.isTTY;
};

const paint =
  (open: number, close: number) =>
  (text: string): string =>
    useColor() ? `\u001B[${open}m${text}\u001B[${close}m` : text;

export const color = {
  bold: paint(1, 22),
  dim: paint(2, 22),
  red: paint(31, 39),
  green: paint(32, 39),
  yellow: paint(33, 39),
  blue: paint(34, 39),
  cyan: paint(36, 39),
} as const;

export const log = {
  /** A section heading. */
  title(text: string): void {
    console.log(`\n${color.bold(color.cyan('◆'))} ${color.bold(text)}`);
  },
  /** A step about to run. */
  step(text: string): void {
    console.log(`${color.blue('›')} ${text}`);
  },
  info(text: string): void {
    console.log(`${color.dim('·')} ${text}`);
  },
  success(text: string): void {
    console.log(`${color.green('✓')} ${text}`);
  },
  warn(text: string): void {
    console.warn(`${color.yellow('!')} ${text}`);
  },
  error(text: string): void {
    console.error(`${color.red('✗')} ${text}`);
  },
  /** The command line about to be executed. */
  command(argv: readonly string[], cwd?: string): void {
    const where = cwd === undefined ? '' : color.dim(` (in ${cwd})`);
    console.log(color.dim(`$ ${argv.map(quote).join(' ')}`) + where);
  },
} as const;

function quote(arg: string): string {
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replaceAll("'", "'\\''")}'`;
}
