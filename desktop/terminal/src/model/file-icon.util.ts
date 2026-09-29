/** The codicon for a file in the Files panel, from its name. */
import type { CodiconRef } from '@genslate/design-system';

import type { FileNode, GitStatus } from '../ipc/terminal.types';

const BY_EXTENSION: Readonly<Record<string, CodiconRef>> = {
  md: 'codicon:markdown',
  mdx: 'codicon:markdown',
  json: 'codicon:bracket-dot',
  jsonc: 'codicon:bracket-dot',
  toml: 'codicon:settings',
  yaml: 'codicon:settings',
  yml: 'codicon:settings',
  ini: 'codicon:settings',
  lock: 'codicon:lock',
  png: 'codicon:file-media',
  jpg: 'codicon:file-media',
  jpeg: 'codicon:file-media',
  gif: 'codicon:file-media',
  svg: 'codicon:file-media',
  webp: 'codicon:file-media',
  ico: 'codicon:file-media',
  zip: 'codicon:file-zip',
  gz: 'codicon:file-zip',
  tar: 'codicon:file-zip',
  '7z': 'codicon:file-zip',
  pdf: 'codicon:file-pdf',
  exe: 'codicon:gear',
  dll: 'codicon:file-binary',
  so: 'codicon:file-binary',
  sh: 'codicon:terminal',
  bash: 'codicon:terminal',
  zsh: 'codicon:terminal',
  ps1: 'codicon:terminal-powershell',
  psm1: 'codicon:terminal-powershell',
  bat: 'codicon:terminal-cmd',
  cmd: 'codicon:terminal-cmd',
  sqlite: 'codicon:database',
  db: 'codicon:database',
  sql: 'codicon:database',
  txt: 'codicon:file-text',
  log: 'codicon:output',
  csv: 'codicon:table',
};

const CODE = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'rs',
  'go',
  'py',
  'rb',
  'java',
  'kt',
  'c',
  'h',
  'cpp',
  'hpp',
  'cs',
  'swift',
  'css',
  'scss',
  'html',
  'vue',
  'svelte',
  'lua',
  'zig',
]);

const BY_NAME: Readonly<Record<string, CodiconRef>> = {
  '.gitignore': 'codicon:source-control',
  '.gitattributes': 'codicon:source-control',
  dockerfile: 'codicon:package',
  'package.json': 'codicon:package',
  'cargo.toml': 'codicon:package',
  license: 'codicon:law',
  readme: 'codicon:book',
  'readme.md': 'codicon:book',
};

export function fileIcon(node: Pick<FileNode, 'name' | 'isDir' | 'isSymlink'>): CodiconRef {
  if (node.isSymlink) {
    return node.isDir ? 'codicon:file-symlink-directory' : 'codicon:file-symlink-file';
  }
  if (node.isDir) return 'codicon:folder';
  const name = node.name.toLowerCase();
  const named = BY_NAME[name];
  if (named !== undefined) return named;
  const dot = name.lastIndexOf('.');
  const extension = dot <= 0 ? '' : name.slice(dot + 1);
  if (CODE.has(extension)) return 'codicon:file-code';
  return BY_EXTENSION[extension] ?? 'codicon:symbol-file';
}

/** The letter VS Code shows for a git status. */
export const GIT_LETTER: Readonly<Record<GitStatus, string>> = {
  modified: 'M',
  added: 'A',
  untracked: 'U',
  deleted: 'D',
  renamed: 'R',
  conflicted: '!',
};

/** The text colour for a git status (Aurora colours mean status). */
export const GIT_TONE: Readonly<Record<GitStatus, string>> = {
  modified: 'text-warning-fg',
  added: 'text-success-fg',
  untracked: 'text-success-fg',
  deleted: 'text-danger-fg',
  renamed: 'text-info-fg',
  conflicted: 'text-danger-fg',
};
