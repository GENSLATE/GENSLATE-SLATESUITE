/**
 * A pretend shell for the browser build: line editing, a handful of commands with realistic
 * coloured output, and the same shell-integration marks the real scripts send (OSC 133 / 633 /
 * 7), so command blocks, history and the folder tracking all work without a desktop app.
 */
import { MOCK_HOME, mockCanonical, mockChildren, mockLookup } from './terminal.mock-data';
import type { Profile } from './terminal.types';

const ESC = '\x1b';
/** The rest of a CSI sequence after `ESC` (arrow keys arrive as `ESC [ A`). */
const CSI = /^\[[0-9;]*[A-Za-z~]/;
const BEL = '\x07';
const osc = (code: number | string, data: string) => `${ESC}]${code};${data}${BEL}`;
const sgr = (codes: string, text: string) => `${ESC}[${codes}m${text}${ESC}[0m`;
const dim = (text: string) => sgr('2', text);
const bold = (text: string) => sgr('1', text);
const red = (text: string) => sgr('31', text);
const green = (text: string) => sgr('32', text);
const yellow = (text: string) => sgr('33', text);
const blue = (text: string) => sgr('34', text);
const magenta = (text: string) => sgr('35', text);
const cyan = (text: string) => sgr('36', text);

export interface MockCommandResult {
  readonly command: string;
  readonly cwd: string;
  readonly exitCode: number;
  readonly startedAt: number;
  readonly durationMs: number;
}

interface Step {
  readonly delay: number;
  readonly text: string;
}

interface Outcome {
  readonly steps: readonly Step[];
  readonly exitCode: number;
  readonly cwd?: string;
  readonly clear?: boolean;
  readonly exit?: boolean;
}

const now = (text: string): Step => ({ delay: 0, text });
const later = (delay: number, text: string): Step => ({ delay, text });

function lines(...rows: readonly string[]): string {
  return `${rows.join('\r\n')}\r\n`;
}

function tildeWin(path: string): string {
  return path.toLowerCase().startsWith(MOCK_HOME.toLowerCase())
    ? `~${path.slice(MOCK_HOME.length)}`
    : path;
}

export class MockShell {
  readonly #profile: Profile;
  readonly #emit: (text: string) => void;
  readonly #onCommand: (result: MockCommandResult) => void;
  readonly #onExit: (code: number) => void;
  readonly #nonce: string;
  #cwd: string;
  #line = '';
  #busy = false;
  #typeAhead = '';
  #history: string[] = [];
  #historyIndex = -1;
  #timers: ReturnType<typeof setTimeout>[] = [];
  #closed = false;
  cols: number;

  constructor(options: {
    readonly profile: Profile;
    readonly cwd: string;
    readonly cols: number;
    /** Appended to command reports, as the real integration scripts do. */
    readonly nonce: string;
    readonly emit: (text: string) => void;
    readonly onCommand: (result: MockCommandResult) => void;
    readonly onExit: (code: number) => void;
  }) {
    this.#profile = options.profile;
    this.#cwd = options.cwd;
    this.cols = options.cols;
    this.#emit = options.emit;
    this.#onCommand = options.onCommand;
    this.#onExit = options.onExit;
    this.#nonce = options.nonce;
  }

  get busy(): boolean {
    return this.#busy;
  }

  get cwd(): string {
    return this.#cwd;
  }

  get lastCommand(): string | null {
    return this.#history.at(-1) ?? null;
  }

  /** Greets and shows the first prompt. */
  start(): void {
    this.#emit(osc(0, this.#title()));
    this.#emit(this.#banner());
    this.#prompt();
  }

  /** Typed input from the terminal. */
  write(data: string): void {
    if (this.#closed) return;
    const input = data.replaceAll(`${ESC}[200~`, '').replaceAll(`${ESC}[201~`, '');
    for (let index = 0; index < input.length; index += 1) {
      const char = input[index] ?? '';
      if (char === ESC) {
        const sequence = CSI.exec(input.slice(index + 1))?.[0] ?? '';
        index += sequence.length;
        this.#key(`${ESC}${sequence}`);
        continue;
      }
      if (this.#busy) {
        // Typed ahead while a command runs: kept for the next prompt, as a real shell does.
        if (char === '\x03') this.#interrupt();
        else this.#typeAhead += char;
        continue;
      }
      if (char === '\r' || char === '\n') this.#submit();
      else if (char === '\x7f' || char === '\b') this.#backspace();
      else if (char === '\x03') {
        this.#emit(`${dim('^C')}\r\n`);
        this.#line = '';
        this.#prompt();
      } else if (char === '\x0c') {
        this.#emit(`${ESC}[2J${ESC}[3J${ESC}[H`);
        this.#prompt(this.#line);
      } else if (char >= ' ') {
        this.#line += char;
        this.#emit(char);
      }
    }
  }

  close(): void {
    this.#closed = true;
    for (const timer of this.#timers) clearTimeout(timer);
  }

  #key(sequence: string): void {
    if (this.#busy) return;
    if (sequence === `${ESC}[A` || sequence === `${ESC}[B`) {
      if (this.#history.length === 0) return;
      const up = sequence === `${ESC}[A`;
      this.#historyIndex =
        this.#historyIndex === -1
          ? up
            ? this.#history.length - 1
            : -1
          : Math.min(this.#history.length, Math.max(0, this.#historyIndex + (up ? -1 : 1)));
      const recalled = this.#history[this.#historyIndex] ?? '';
      this.#emit('\b \b'.repeat(this.#line.length));
      this.#line = recalled;
      this.#emit(recalled);
    }
  }

  #backspace(): void {
    if (this.#line === '') return;
    this.#line = this.#line.slice(0, -1);
    this.#emit('\b \b');
  }

  #interrupt(): void {
    for (const timer of this.#timers) clearTimeout(timer);
    this.#timers = [];
    this.#emit(`${dim('^C')}\r\n${osc(133, 'D;130')}`);
    this.#busy = false;
    this.#typeAhead = '';
    this.#prompt();
  }

  #submit(): void {
    const command = this.#line.trim();
    this.#line = '';
    this.#historyIndex = -1;
    this.#emit('\r\n');
    if (command === '') {
      this.#prompt();
      return;
    }
    this.#history.push(command);
    const outcome = this.#run(command);
    const startedAt = Date.now();
    this.#busy = true;
    const escaped = command.replaceAll('\\', '\\\\').replaceAll(';', '\\x3b');
    this.#emit(osc(633, `E;${escaped};${this.#nonce}`));
    this.#emit(osc(133, 'C'));
    if (outcome.clear === true) this.#emit(`${ESC}[2J${ESC}[3J${ESC}[H`);
    let elapsed = 0;
    for (const step of outcome.steps) {
      elapsed += step.delay;
      this.#after(elapsed, () => this.#emit(step.text));
    }
    this.#after(elapsed + 10, () => {
      this.#busy = false;
      if (outcome.cwd !== undefined) this.#cwd = outcome.cwd;
      this.#emit(osc(133, `D;${outcome.exitCode}`));
      this.#onCommand({
        command,
        cwd: this.#cwd,
        exitCode: outcome.exitCode,
        startedAt,
        durationMs: Date.now() - startedAt,
      });
      if (outcome.exit === true) {
        this.#closed = true;
        this.#onExit(0);
        return;
      }
      this.#prompt();
      const pending = this.#typeAhead;
      this.#typeAhead = '';
      if (pending !== '') this.write(pending);
    });
  }

  #after(delay: number, task: () => void): void {
    this.#timers.push(
      setTimeout(() => {
        if (!this.#closed) task();
      }, delay),
    );
  }

  #title(): string {
    return this.#profile.kind === 'wsl' ? `you@genslate: ${this.#unixCwd()}` : this.#profile.name;
  }

  #unixCwd(): string {
    return tildeWin(this.#cwd).replaceAll('\\', '/');
  }

  #banner(): string {
    switch (this.#profile.kind) {
      case 'pwsh':
        return lines(dim('PowerShell 7.5.3'), '');
      case 'powershell':
        return lines(
          'Windows PowerShell',
          'Copyright (C) Microsoft Corporation. All rights reserved.',
          '',
        );
      case 'cmd':
        return lines(
          'Microsoft Windows [Version 10.0.26100.4652]',
          '(c) Microsoft Corporation. All rights reserved.',
          '',
        );
      case 'wsl':
        return lines(
          'Welcome to Ubuntu 24.04.3 LTS (GNU/Linux 6.6.87.2-microsoft-standard-WSL2 x86_64)',
          '',
        );
      default:
        return '';
    }
  }

  #prompt(pending = ''): void {
    const cwdUri = `file://genslate/${this.#cwd.replaceAll('\\', '/')}`;
    const inRepo = this.#cwd.toLowerCase().includes('projects\\genslate');
    let text: string;
    switch (this.#profile.kind) {
      case 'cmd':
        text = `${this.#cwd}>`;
        break;
      case 'wsl':
      case 'bash':
        text = `${sgr('1;32', 'you@genslate')}:${sgr('1;34', this.#unixCwd())}$ `;
        break;
      default: {
        const git = inRepo ? ` ${dim('on')} ${magenta('main')} ${yellow('!3 ?2')}` : '';
        text = `${sgr('1;36', tildeWin(this.#cwd))}${git}\r\n${green('❯')} `;
      }
    }
    this.#emit(
      `${osc(133, 'A')}${osc(7, cwdUri)}${osc(0, this.#title())}${text}${osc(133, 'B')}${pending}`,
    );
  }

  #resolve(target: string): string | null {
    const trimmed = target.trim().replace(/^["']|["']$/g, '');
    if (trimmed === '' || trimmed === '~') return MOCK_HOME;
    let base = this.#cwd;
    let rest = trimmed;
    if (/^[A-Za-z]:[\\/]/.test(trimmed)) {
      base = trimmed.slice(0, 2);
      rest = trimmed.slice(3);
    } else if (trimmed.startsWith('~')) {
      base = MOCK_HOME;
      rest = trimmed.slice(1);
    } else if (trimmed.startsWith('/')) {
      return null;
    }
    const parts = base.split('\\');
    for (const part of rest.split(/[\\/]/)) {
      if (part === '' || part === '.') continue;
      if (part === '..') {
        if (parts.length > 1) parts.pop();
      } else parts.push(part);
    }
    const path = parts.join('\\');
    const entry = mockLookup(path);
    return entry?.dir === undefined ? null : mockCanonical(path);
  }

  #run(command: string): Outcome {
    const [name = '', ...args] = command.split(/\s+/);
    const verb = name.toLowerCase();
    switch (verb) {
      case 'help':
        return {
          exitCode: 0,
          steps: [
            now(
              lines(
                bold('GENSLATE Terminal · browser preview'),
                dim(
                  'This is a simulated shell. In the desktop app every tab runs your real shell.',
                ),
                '',
                `  ${cyan('ls')}, ${cyan('cd')} <folder>, ${cyan('pwd')}, ${cyan('echo')}, ${cyan('clear')}`,
                `  ${cyan('git status')}, ${cyan('git log')}, ${cyan('bun test')}, ${cyan('cargo test')}`,
                `  ${cyan('genslate')}, ${cyan('date')}, ${cyan('whoami')}, ${cyan('exit')}`,
              ),
            ),
          ],
        };
      case 'ls':
      case 'dir':
      case 'get-childitem':
      case 'gci':
        return {
          exitCode: 0,
          steps: [now(this.#listing(args.includes('-a') || args.includes('-Force')))],
        };
      case 'cd':
      case 'set-location': {
        const target = this.#resolve(args.join(' '));
        if (target === null) {
          return {
            exitCode: 1,
            steps: [now(lines(red(`cd: no such folder: ${args.join(' ')}`)))],
          };
        }
        return { exitCode: 0, steps: [], cwd: target };
      }
      case 'pwd':
      case 'get-location':
        return { exitCode: 0, steps: [now(lines(this.#cwd))] };
      case 'echo':
      case 'write-output':
        return { exitCode: 0, steps: [now(lines(args.join(' ').replace(/^["']|["']$/g, '')))] };
      case 'clear':
      case 'cls':
      case 'clear-host':
        return { exitCode: 0, steps: [], clear: true };
      case 'whoami':
        return { exitCode: 0, steps: [now(lines('genslate\\you'))] };
      case 'date':
      case 'get-date':
        return { exitCode: 0, steps: [now(lines(new Date().toString()))] };
      case 'exit':
        return { exitCode: 0, steps: [], exit: true };
      case 'genslate':
      case 'fastfetch':
      case 'neofetch':
        return { exitCode: 0, steps: [now(this.#fetch())] };
      case 'git':
        return this.#git(args);
      case 'bun':
        return this.#bun(args);
      case 'cargo':
        return this.#cargo(args);
      case 'node':
        return { exitCode: 0, steps: [now(lines('v24.9.0'))] };
      default:
        return {
          exitCode: 1,
          steps: [
            now(
              lines(
                red(
                  `${name}: The term '${name}' is not recognized as a name of a cmdlet, function, script file, or executable program.`,
                ),
                dim('Type "help" to see what this preview shell can do.'),
              ),
            ),
          ],
        };
    }
  }

  #listing(showHidden: boolean): string {
    const entries = mockChildren(this.#cwd, showHidden);
    if (entries.length === 0) return '';
    const width = Math.max(...entries.map((entry) => entry.name.length)) + 3;
    const perRow = Math.max(1, Math.floor(Math.max(this.cols, 40) / width));
    const cells = entries.map((entry) => {
      const pad = ' '.repeat(Math.max(0, width - entry.name.length - (entry.isDir ? 1 : 0)));
      if (entry.isDir) return `${sgr('1;34', entry.name)}${blue('/')}${pad}`;
      const tone = /\.(toml|json|lock|yml)$/.test(entry.name)
        ? yellow(entry.name)
        : /\.md$/.test(entry.name)
          ? cyan(entry.name)
          : entry.name;
      return `${tone}${pad}`;
    });
    const rows: string[] = [];
    for (let index = 0; index < cells.length; index += perRow) {
      rows.push(
        cells
          .slice(index, index + perRow)
          .join('')
          .trimEnd(),
      );
    }
    return lines(...rows);
  }

  #fetch(): string {
    const logo = [
      '   ▄▄▄▄▄▄▄▄▄   ',
      '  █▀       ▀█  ',
      '  █  ▄▄▄▄▄  █  ',
      '  █  █   ▀▀▀   ',
      '  █  █  ▀▀█▀█  ',
      '  █  ▀▄▄▄▄█ █  ',
      '  ▀▄▄▄▄▄▄▄▄▄▀  ',
    ];
    const info = [
      `${bold(cyan('you'))}@${bold(cyan('genslate'))}`,
      dim('─────────────────'),
      `${cyan('OS')}        Windows 11 Pro 24H2`,
      `${cyan('Shell')}     ${this.#profile.name}`,
      `${cyan('Terminal')}  GENSLATE Terminal`,
      `${cyan('Theme')}     Nord`,
      `${sgr('40', '   ')}${sgr('41', '   ')}${sgr('42', '   ')}${sgr('43', '   ')}${sgr('44', '   ')}${sgr('45', '   ')}${sgr('46', '   ')}${sgr('47', '   ')}`,
    ];
    return lines('', ...logo.map((row, index) => `${sgr('36', row)}  ${info[index] ?? ''}`), '');
  }

  #git(args: readonly string[]): Outcome {
    const sub = args[0] ?? '';
    if (!this.#cwd.toLowerCase().includes('projects\\genslate')) {
      return {
        exitCode: 128,
        steps: [
          now(lines(red('fatal: not a git repository (or any of the parent directories): .git'))),
        ],
      };
    }
    if (sub === 'status') {
      return {
        exitCode: 0,
        steps: [
          later(
            60,
            lines(
              'On branch main',
              "Your branch is up to date with 'origin/main'.",
              '',
              'Changes not staged for commit:',
              dim('  (use "git add <file>..." to update what will be committed)'),
              `        ${red('modified:   Cargo.toml')}`,
              `        ${red('modified:   desktop/terminal/package.json')}`,
              `        ${red('modified:   packages/tokens/src/token.keys.ts')}`,
              '',
              'Untracked files:',
              dim('  (use "git add <file>..." to include in what will be committed)'),
              `        ${red('crates/storage/')}`,
              '',
            ),
          ),
        ],
      };
    }
    if (sub === 'log') {
      return {
        exitCode: 0,
        steps: [
          later(
            40,
            lines(
              `${yellow('300d61f')} ${cyan('(HEAD -> main, origin/main)')} Merge pull request #11 from GENSLATE/feat/explorer-app`,
              `${yellow('ff2b247')} test(explorer): cover the model, backend mock, layout, session and commands`,
              `${yellow('e7e5e58')} feat(explorer): add the file explorer ui with tabs, search, previews and ai teasers`,
              `${yellow('c212b13')} ci(repo): handle force-pushes in the authorship check`,
            ),
          ),
        ],
      };
    }
    return { exitCode: 0, steps: [now(lines(dim(`git ${args.join(' ')}`)))] };
  }

  #bun(args: readonly string[]): Outcome {
    if (args[0] === '--version' || args[0] === '-v')
      return { exitCode: 0, steps: [now(lines('1.4.2'))] };
    if (args[0] === 'test') {
      const pass = (name: string, ms: number) =>
        `${green('✓')} ${name} ${dim(`[${ms.toFixed(2)}ms]`)}`;
      return {
        exitCode: 0,
        steps: [
          now(lines(dim('bun test v1.4.2 (7a1f0e3c)'), '')),
          later(260, lines('tests/unit/model/layout.reducer.test.ts:')),
          later(
            120,
            lines(
              pass('splits a pane to the right and focuses the new one', 0.41),
              pass('closing the last pane closes the tab', 0.12),
              pass('moves focus to the neighbouring pane', 0.33),
              '',
            ),
          ),
          later(180, lines('tests/unit/model/osc.util.test.ts:')),
          later(
            90,
            lines(
              pass('parses OSC 133 marks with exit codes', 0.08),
              pass('reads Windows folders from OSC 7', 0.05),
              '',
            ),
          ),
          later(
            200,
            lines(
              ` ${green('48 pass')}`,
              ` ${dim('0 fail')}`,
              ` 131 expect() calls`,
              `Ran 48 tests across 9 files. ${dim('[842.00ms]')}`,
            ),
          ),
        ],
      };
    }
    return {
      exitCode: 0,
      steps: [later(300, lines(dim(`$ bun ${args.join(' ')}`), green('done')))],
    };
  }

  #cargo(args: readonly string[]): Outcome {
    if (args[0] !== 'test')
      return { exitCode: 0, steps: [now(lines(dim(`cargo ${args.join(' ')}`)))] };
    return {
      exitCode: 101,
      steps: [
        later(
          200,
          lines(
            `   ${sgr('1;32', 'Compiling')} genslate-storage v0.1.0 (C:\\Users\\you\\Projects\\genslate\\crates\\storage)`,
          ),
        ),
        later(500, lines(`   ${sgr('1;32', 'Compiling')} genslate-core-terminal v0.1.0`)),
        later(
          700,
          lines(
            `    ${sgr('1;32', 'Finished')} \`test\` profile [unoptimized + debuginfo] target(s) in 3.41s`,
            `     ${sgr('1;32', 'Running')} unittests src\\lib.rs`,
            '',
            'running 3 tests',
          ),
        ),
        later(
          260,
          lines(
            `test tracker::tests::reads_the_folder_from_osc_7 ... ${green('ok')}`,
            `test history::tests::ranks_recent_matches_first ... ${green('ok')}`,
            `test profiles::tests::finds_every_wsl_distro ... ${red('FAILED')}`,
            '',
            'failures:',
            '',
            '---- profiles::tests::finds_every_wsl_distro stdout ----',
            `thread 'profiles::tests::finds_every_wsl_distro' panicked at crates\\core\\terminal\\src\\profiles.rs:212:9:`,
            'assertion `left == right` failed',
            '  left: ["Ubuntu"]',
            ' right: ["Ubuntu", "Debian"]',
            '',
            `test result: ${red('FAILED')}. 2 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.02s`,
            '',
            `${sgr('1;31', 'error')}: test failed, to rerun pass \`-p genslate-core-terminal --lib\``,
          ),
        ),
      ],
    };
  }
}
