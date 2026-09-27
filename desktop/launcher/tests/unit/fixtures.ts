import type { ActionSpec, AppEntry } from '../../src/ipc/launcher.types';

export function app(id: string, overrides: Partial<AppEntry> = {}): AppEntry {
  const key = id.slice(id.indexOf('/') + 1);
  return {
    id,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    description: '',
    category: 'Utilities',
    color: null,
    keywords: [],
    version: null,
    publisher: null,
    status: 'ready',
    favorite: false,
    hidden: false,
    args: [],
    hasIcon: false,
    ...overrides,
  };
}

export const ACTIONS: readonly ActionSpec[] = [
  {
    id: 'open',
    title: 'Open app',
    description: 'Launch an app',
    params: [{ name: 'app', description: 'App name or id', type: 'app', required: true }],
    effect: 'launch',
  },
  {
    id: 'theme',
    title: 'Change theme',
    description: 'Theme',
    params: [
      {
        name: 'mode',
        description: 'Theme',
        type: 'choice',
        values: ['system', 'dark', 'light'],
        required: true,
      },
    ],
    effect: 'writes-config',
  },
  { id: 'tools', title: 'Tools', description: 'Tools view', params: [], effect: 'ui' },
  {
    id: 'ask',
    title: 'Ask AI',
    description: 'Coming soon',
    params: [{ name: 'prompt', description: 'Your question', type: 'text', required: false }],
    effect: 'ai',
  },
];
