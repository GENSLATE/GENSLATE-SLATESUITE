/**
 * Sample machine for the browser build: a Windows user with a few shells, a project folder
 * with git changes, some history and snippets. Everything the screenshots show comes from here.
 */
import type { FileNode, GitStatus, HistoryEntry, Profile, Snippet } from './terminal.types';

export const MOCK_HOME = 'C:\\Users\\you';
export const MOCK_PROJECT = `${MOCK_HOME}\\Projects\\genslate`;

export const MOCK_PROFILES: readonly Profile[] = [
  {
    id: 'pwsh',
    name: 'PowerShell',
    command: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
    args: ['-NoLogo'],
    cwd: null,
    icon: 'powershell',
    color: 'frost',
    kind: 'pwsh',
    source: 'detected',
  },
  {
    id: 'powershell',
    name: 'Windows PowerShell',
    command: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    args: [],
    cwd: null,
    icon: 'powershell',
    color: null,
    kind: 'powershell',
    source: 'detected',
  },
  {
    id: 'cmd',
    name: 'Command Prompt',
    command: 'C:\\Windows\\System32\\cmd.exe',
    args: [],
    cwd: null,
    icon: 'cmd',
    color: null,
    kind: 'cmd',
    source: 'detected',
  },
  {
    id: 'wsl-ubuntu',
    name: 'Ubuntu',
    command: 'wsl.exe',
    args: ['-d', 'Ubuntu'],
    cwd: null,
    icon: 'ubuntu',
    color: 'aurora-orange',
    kind: 'wsl',
    source: 'detected',
  },
  {
    id: 'git-bash',
    name: 'Git Bash',
    command: 'C:\\Program Files\\Git\\bin\\bash.exe',
    args: ['--login', '-i'],
    cwd: null,
    icon: 'git',
    color: 'aurora-red',
    kind: 'bash',
    source: 'detected',
  },
  {
    id: 'nu',
    name: 'Nushell',
    command: 'C:\\Users\\you\\.cargo\\bin\\nu.exe',
    args: [],
    cwd: null,
    icon: 'nu',
    color: 'aurora-green',
    kind: 'nu',
    source: 'detected',
  },
  {
    id: 'custom-dev-server',
    name: 'Dev server',
    command: 'pwsh.exe',
    args: ['-NoLogo'],
    cwd: MOCK_PROJECT,
    icon: 'terminal',
    color: 'aurora-purple',
    kind: 'pwsh',
    source: 'config',
  },
];

interface MockEntry {
  readonly name: string;
  readonly dir?: readonly MockEntry[];
  readonly size?: number;
  readonly git?: GitStatus;
}

const file = (name: string, size: number, git?: GitStatus): MockEntry =>
  git === undefined ? { name, size } : { name, size, git };
const dir = (name: string, children: readonly MockEntry[], git?: GitStatus): MockEntry =>
  git === undefined ? { name, dir: children } : { name, dir: children, git };

const PROJECT: readonly MockEntry[] = [
  dir('.git', [file('HEAD', 21)]),
  dir('.github', [dir('workflows', [file('ci.yml', 4_812)])]),
  dir(
    'crates',
    [
      dir('core', [dir('terminal', [file('Cargo.toml', 612, 'modified')], 'modified')], 'modified'),
      dir(
        'storage',
        [file('Cargo.toml', 488, 'untracked'), dir('src', [], 'untracked')],
        'untracked',
      ),
      dir('paths', [file('Cargo.toml', 402)]),
    ],
    'modified',
  ),
  dir(
    'desktop',
    [
      dir('explorer', [file('package.json', 1_204)]),
      dir('launcher', [file('package.json', 1_318)]),
      dir(
        'terminal',
        [file('package.json', 1_422, 'modified'), dir('src', [], 'modified')],
        'modified',
      ),
    ],
    'modified',
  ),
  dir('node_modules', [file('.bun-tag', 12)]),
  dir('other', [dir('databases', [dir('genslate', [])])]),
  dir('packages', [dir('design-system', []), dir('tokens', [], 'modified')], 'modified'),
  file('.gitignore', 1_022),
  file('biome.json', 2_310),
  file('bun.lock', 412_880, 'modified'),
  file('Cargo.lock', 188_204, 'modified'),
  file('Cargo.toml', 3_702, 'modified'),
  file('package.json', 2_896, 'modified'),
  file('README.md', 6_140),
];

const TREE: MockEntry = dir('you', [
  dir('Desktop', [file('notes.txt', 842)]),
  dir('Documents', [file('Invoice-0917.pdf', 88_402), file('Plan.md', 3_120)]),
  dir('Downloads', [file('bun-windows-x64.zip', 28_400_112), file('setup.exe', 94_182_400)]),
  dir('Projects', [
    dir('genslate', PROJECT),
    dir('website', [file('index.html', 5_400), file('styles.css', 12_880)]),
  ]),
  file('.gitconfig', 312),
]);

function split(path: string): readonly string[] {
  return path
    .replace(/[\\/]+$/, '')
    .split(/[\\/]/)
    .filter((part) => part !== '');
}

/** The entry at an absolute mock path (inside the home folder), else `null`. */
export function mockLookup(path: string): MockEntry | null {
  const home = split(MOCK_HOME);
  const parts = split(path);
  if (parts.length < home.length) return null;
  for (const [index, part] of home.entries()) {
    if (parts[index]?.toLowerCase() !== part.toLowerCase()) return null;
  }
  let current: MockEntry = TREE;
  for (const part of parts.slice(home.length)) {
    const next: MockEntry | undefined = current.dir?.find(
      (entry) => entry.name.toLowerCase() === part.toLowerCase(),
    );
    if (next === undefined) return null;
    current = next;
  }
  return current;
}

/** The canonical spelling of a mock path, or `null` when it doesn't exist. */
export function mockCanonical(path: string): string | null {
  const home = split(MOCK_HOME);
  const parts = split(path);
  if (mockLookup(path) === null) return null;
  let current: MockEntry = TREE;
  const out = [...home];
  for (const part of parts.slice(home.length)) {
    const next = current.dir?.find((entry) => entry.name.toLowerCase() === part.toLowerCase());
    if (next === undefined) return null;
    out.push(next.name);
    current = next;
  }
  return `${out[0] ?? 'C:'}\\${out.slice(1).join('\\')}`;
}

export function mockChildren(path: string, showHidden: boolean): readonly FileNode[] {
  const entry = mockLookup(path);
  const base = mockCanonical(path) ?? path;
  return (entry?.dir ?? [])
    .filter((child) => showHidden || !(child.name.startsWith('.') || child.name === 'node_modules'))
    .map((child) => ({
      name: child.name,
      path: `${base}\\${child.name}`,
      isDir: child.dir !== undefined,
      isSymlink: false,
      size: child.dir === undefined ? (child.size ?? 0) : null,
      git: child.git ?? null,
    }))
    .sort((a, b) =>
      a.isDir === b.isDir
        ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        : a.isDir
          ? -1
          : 1,
    );
}

const MINUTE = 60_000;

export function mockHistory(now: number): HistoryEntry[] {
  const rows: [string, string, number | null, number, number][] = [
    ['bun run check', MOCK_PROJECT, 0, 38_400, 4],
    ['cargo test -p genslate-core-terminal', MOCK_PROJECT, 101, 21_300, 9],
    ['git status', MOCK_PROJECT, 0, 80, 12],
    ['bun x moon run terminal:dev', MOCK_PROJECT, 0, 412_000, 26],
    ['git pull --rebase', MOCK_PROJECT, 0, 1_900, 58],
    [
      'Get-NetTCPConnection -State Listen | Select-Object LocalPort, OwningProcess',
      MOCK_HOME,
      0,
      640,
      95,
    ],
    ['wsl --update', MOCK_HOME, 1, 5_200, 140],
    ['bun install', MOCK_PROJECT, 0, 3_700, 190],
    ['code .', MOCK_PROJECT, 0, 420, 260],
    ['winget upgrade --all', MOCK_HOME, 0, 96_000, 1_500],
    ['ssh deploy@build-01', MOCK_HOME, 255, 12_000, 2_900],
  ];
  return rows.map(([command, cwd, exitCode, durationMs, minutesAgo], index) => ({
    id: rows.length - index,
    command,
    cwd,
    shell: 'PowerShell',
    exitCode,
    startedAt: now - minutesAgo * MINUTE,
    durationMs,
  }));
}

export const MOCK_SNIPPETS: readonly Snippet[] = [
  {
    id: 'git-status',
    name: 'Short git status',
    command: 'git status -sb',
    description: 'Branch, ahead/behind and changed files at a glance.',
    run: true,
  },
  {
    id: 'listening-ports',
    name: 'What is listening?',
    command: 'Get-NetTCPConnection -State Listen | Sort-Object LocalPort',
    description: 'Every open port and the process that owns it.',
    run: true,
  },
  {
    id: 'disk-usage',
    name: 'Disk usage here',
    command: 'Get-ChildItem -Directory | ForEach-Object { $_.Name }',
    description: 'Folders in the current directory.',
    run: false,
  },
  {
    id: 'update-deps',
    name: 'Update bun dependencies',
    command: 'bun update --latest',
    description: 'Bump every package to its newest version.',
    run: false,
  },
];
