/**
 * Conventional Commits for GENSLATE — run by lefthook's `commit-msg` hook:
 *   bun x --bun commitlint --config .config/commitlint.config.ts --edit <file>
 *
 * Scopes are moon project ids plus a few repo-wide areas.
 */

const scopes = [
  // moon projects
  'tokens',
  'design-system',
  'tauri-bridge',
  'config-typescript',
  'config-vite',
  // desktop apps (moon projects under desktop/)
  'aistudio',
  'browser',
  'coder',
  'command',
  'editor',
  'example',
  'explorer',
  'gallery',
  'jukebox',
  'launcher',
  'terminal',
  'theater',
  'toolbox',
  // websites (moon projects under webapps/)
  'genslate-page',
  // repo areas
  'crates',
  'slatesuite',
  'config',
  'repo',
  'ci',
  'deps',
  'agents',
  'docs',
  'release',
] as const;

const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', [...scopes]],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0],
  },
  helpUrl: 'https://www.conventionalcommits.org/en/v1.0.0/',
};

export default config;
