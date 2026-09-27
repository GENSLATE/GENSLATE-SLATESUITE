/**
 * In-memory launcher backend for a plain browser (`launcher:web-dev`): realistic apps,
 * drifting telemetry and the real GENSLATE icon family, so the UI can be designed, tested and
 * screenshot without the desktop shell. Loaded lazily — never part of the desktop bundle's
 * startup path.
 */
import type { LauncherBackend } from './launcher.client';
import type {
  ActionSpec,
  AppEntry,
  AppStatus,
  LauncherContext,
  LauncherEvents,
  Settings,
  Source,
  Telemetry,
  TrayMenuAnchor,
} from './launcher.types';

// The icon family lives in other/resources (it ships with the suite); crop it like the shell does.
const ICONS = import.meta.glob<string>('../../../../other/resources/icons/genslate/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function iconDataUrl(key: string): string | undefined {
  const entry = Object.entries(ICONS).find(([path]) => path.endsWith(`/${key}.svg`));
  if (entry === undefined) return undefined;
  const cropped = entry[1]
    .replace('viewBox="0 0 1024 1024"', 'viewBox="100 100 824 824"')
    .replace(' width="1024" height="1024"', '')
    .replaceAll(' filter="url(#drop)"', '');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cropped)}`;
}

type Seed = readonly [
  key: string,
  name: string,
  description: string,
  category: string,
  color: string | null,
  status: AppStatus,
];

const GENSLATE: readonly Seed[] = [
  [
    'aistudio',
    'AI Studio',
    'Chat, create and automate with AI models',
    'AI',
    'nord0',
    'not-installed',
  ],
  ['browser', 'Browser', 'A private, portable web browser', 'Internet', 'nord7', 'ready'],
  ['coder', 'Coder', 'A focused code editor for your projects', 'Development', 'nord10', 'ready'],
  [
    'command',
    'Command',
    'Run commands and automations from one bar',
    'Utilities',
    'nord3',
    'not-installed',
  ],
  ['editor', 'Editor', 'Write and edit notes, text and Markdown', 'Office', 'nord9', 'running'],
  [
    'example',
    'Example',
    'Design Kit showcase: every component in both Nord themes',
    'Development',
    'nord9',
    'ready',
  ],
  ['explorer', 'Explorer', 'Browse, search and manage your files', 'System', 'nord8', 'running'],
  ['gallery', 'Gallery', 'View and organise your photos and images', 'Media', 'nord15', 'ready'],
  ['jukebox', 'Jukebox', 'Play your music library and playlists', 'Media', 'nord11', 'ready'],
  [
    'terminal',
    'Terminal',
    'A fast, modern terminal with tabs and splits',
    'Development',
    'nord14',
    'ready',
  ],
  ['theater', 'Theater', 'Watch videos and movies', 'Media', 'nord12', 'missing-exe'],
  [
    'toolbox',
    'Toolbox',
    'Handy utilities for everyday tasks',
    'Utilities',
    'nord13',
    'not-installed',
  ],
];

const PORTABLE_APPS: readonly Seed[] = [
  ['FirefoxPortable', 'Mozilla Firefox', 'Web browser', 'Internet', null, 'ready'],
  ['7-ZipPortable', '7-Zip', 'File archiver', 'Utilities', null, 'ready'],
  ['VLCPortable', 'VLC Media Player', 'Media player', 'Music & Video', null, 'ready'],
  ['GIMPPortable', 'GIMP', 'Image editor', 'Graphics & Pictures', null, 'ready'],
  ['KeePassXCPortable', 'KeePassXC', 'Password manager', 'Security', null, 'ready'],
  ['NotepadPlusPlusPortable', 'Notepad++', 'Text editor', 'Development', null, 'ready'],
];

const PORTAPPS: readonly Seed[] = [
  ['phyrox-portable', 'Phyrox', 'Phyrox (portapps.io)', 'Apps', null, 'ready'],
  ['vscodium-portable', 'VSCodium', 'VSCodium (portapps.io)', 'Apps', null, 'ready'],
];

function entries(source: Source, seeds: readonly Seed[]): AppEntry[] {
  return seeds.map(([key, name, description, category, color, status]) => ({
    id: `${source}/${key}`,
    name,
    description,
    category,
    color,
    keywords: [],
    version: source === 'genslate' ? '0.1.0' : null,
    publisher: source === 'genslate' ? 'GENSLATE' : null,
    status,
    favorite: key === 'explorer' || key === 'terminal' || key === 'FirefoxPortable',
    hidden: false,
    args: [],
    hasIcon: source === 'genslate',
  }));
}

const ACTIONS: readonly ActionSpec[] = [
  {
    id: 'open',
    title: 'Open app',
    description: 'Launch an app',
    params: [{ name: 'app', description: 'App name or id', type: 'app', required: true }],
    effect: 'launch',
  },
  {
    id: 'folder',
    title: 'Open folder',
    description: 'Open one of your portable folders',
    params: [
      {
        name: 'name',
        description: 'Folder',
        type: 'choice',
        values: ['desktop', 'documents', 'downloads', 'music', 'pictures', 'videos', 'storage'],
        required: true,
      },
    ],
    effect: 'open',
  },
  {
    id: 'tab',
    title: 'Switch tab',
    description: 'Show GENSLATE, PortableApps.com or portapps.io apps',
    params: [
      {
        name: 'source',
        description: 'Tab',
        type: 'choice',
        values: ['genslate', 'portableapps', 'portapps'],
        required: true,
      },
    ],
    effect: 'ui',
  },
  {
    id: 'fav',
    title: 'Toggle favorite',
    description: 'Pin an app to Favorites (or unpin it)',
    params: [{ name: 'app', description: 'App name or id', type: 'app', required: true }],
    effect: 'writes-config',
  },
  {
    id: 'rescan',
    title: 'Rescan apps',
    description: 'Look for new or removed apps',
    params: [],
    effect: 'read',
  },
  {
    id: 'theme',
    title: 'Change theme',
    description: 'Polar Night (dark), Snow Storm (light) or follow the system',
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
  {
    id: 'size',
    title: 'Change size',
    description: 'Small, medium or large window',
    params: [
      {
        name: 'preset',
        description: 'Size',
        type: 'choice',
        values: ['s', 'm', 'l'],
        required: true,
      },
    ],
    effect: 'writes-config',
  },
  {
    id: 'pin',
    title: 'Pin / unpin',
    description: 'Keep the launcher on top and open',
    params: [],
    effect: 'window',
  },
  {
    id: 'tools',
    title: 'Tools',
    description: 'Open or close the tools view',
    params: [],
    effect: 'ui',
  },
  {
    id: 'config',
    title: 'Edit settings',
    description: 'Open config.toml',
    params: [],
    effect: 'open',
  },
  {
    id: 'keys',
    title: 'Edit shortcuts',
    description: 'Open keybindings.toml',
    params: [],
    effect: 'open',
  },
  {
    id: 'logs',
    title: 'Open logs',
    description: "Open the launcher's log folder",
    params: [],
    effect: 'open',
  },
  {
    id: 'ask',
    title: 'Ask AI',
    description: 'Ask the GENSLATE assistant (coming soon)',
    params: [{ name: 'prompt', description: 'Your question', type: 'text', required: false }],
    effect: 'ai',
  },
  { id: 'help', title: 'Help', description: 'Shortcuts and commands', params: [], effect: 'ui' },
  { id: 'hide', title: 'Hide', description: 'Hide the launcher', params: [], effect: 'window' },
  {
    id: 'quit',
    title: 'Quit',
    description: 'Close the launcher (apps keep running)',
    params: [],
    effect: 'window',
  },
];

/** `?theme=snow-storm&size=l&pinned` in the dev URL tweak the mock (handy for screenshots). */
function query(name: string): string | null {
  return new URLSearchParams(globalThis.location?.search ?? '').get(name);
}

/**
 * Where the browser preview anchors the tray menu: `?tray=top-right` (macOS menu bar),
 * `bottom-left`, `top-left`, or the default `bottom-right` (Windows taskbar).
 */
export function mockTrayAnchor(): TrayMenuAnchor {
  const corner = query('tray') ?? 'bottom-right';
  const opensUp = !corner.startsWith('top');
  const alignEnd = !corner.endsWith('left');
  const width = globalThis.innerWidth ?? 560;
  const height = globalThis.innerHeight ?? 440;
  return { x: alignEnd ? width - 12 : 12, y: opensUp ? height - 12 : 12, opensUp, alignEnd };
}

function withAppearance(settings: Settings, change: Partial<Settings['config']['appearance']>) {
  return {
    ...settings,
    config: { ...settings.config, appearance: { ...settings.config.appearance, ...change } },
  };
}

export function createMockBackend(): LauncherBackend {
  let apps: AppEntry[] = [
    ...entries('genslate', GENSLATE),
    ...(query('noThirdParty') === null ? entries('portableapps', PORTABLE_APPS) : []),
    ...(query('noThirdParty') === null ? entries('portapps', PORTAPPS) : []),
  ];
  let recent = ['genslate/editor', 'portableapps/FirefoxPortable', 'genslate/terminal'];
  let pinned = query('pinned') !== null;
  let settings: Settings = {
    config: {
      appearance: {
        theme:
          query('theme') === 'snow-storm'
            ? 'snow-storm'
            : query('theme') === 'polar-night'
              ? 'polar-night'
              : 'system',
        size: query('size') === 's' ? 's' : query('size') === 'l' ? 'l' : 'm',
      },
      behavior: {
        hideOnBlur: true,
        hideOnLaunch: true,
        pinned,
        autostart: query('autostart') !== null,
      },
      status: { mode: query('status') === 'usage' ? 'usage' : 'temps' },
    },
    keybindings: {
      global: { toggle: 'Ctrl+Alt+Space' },
      launcher: {
        focusSearch: 'mod+k',
        toggleTools: 'mod+t',
        togglePin: 'mod+p',
        toggleFavorite: 'mod+d',
        tabGenslate: 'mod+1',
        tabPortableapps: 'mod+2',
        tabPortapps: 'mod+3',
      },
    },
    issue: null,
  };

  type Handler = (payload: unknown) => void;
  const listeners = new Map<keyof LauncherEvents, Set<Handler>>();
  const emit = <E extends keyof LauncherEvents>(event: E, payload: LauncherEvents[E]) => {
    for (const handler of listeners.get(event) ?? []) handler(payload);
  };

  let telemetryTimer: ReturnType<typeof setInterval> | undefined;
  let tick = 0;
  const sample = (): Telemetry => {
    tick += 1;
    const wave = (base: number, amplitude: number, speed: number) =>
      Math.round((base + Math.sin(tick / speed) * amplitude) * 10) / 10;
    return {
      cpuTempC: wave(48, 4, 3),
      gpuTempC: wave(52, 3, 4),
      cpuUsagePct: wave(14, 9, 2),
      gpuUsagePct: wave(31, 12, 5),
      netDownBps: Math.round(wave(1_200_000, 700_000, 2)),
      netUpBps: Math.round(wave(82_000, 40_000, 3)),
    };
  };

  const tabs = () =>
    (['genslate', 'portableapps', 'portapps'] as const)
      .map((source) => ({
        source,
        label:
          source === 'genslate'
            ? 'GENSLATE'
            : source === 'portableapps'
              ? 'PortableApps.com'
              : 'portapps.io',
        count: apps.filter((app) => app.id.startsWith(`${source}/`) && !app.hidden).length,
      }))
      .filter((tab) => tab.source === 'genslate' || tab.count > 0);

  const update = (id: string, change: (app: AppEntry) => AppEntry) => {
    apps = apps.map((app) => (app.id === id ? change(app) : app));
    emit('catalog', undefined);
  };

  const context: LauncherContext = {
    version: '0.1.0',
    mode: 'web',
    suiteName: 'GENSLATE-USB',
    profile: 'Shared',
    settings,
    pinned,
    actions: ACTIONS,
    layout: { inset: 16, normalWidth: 460, expandedWidth: 920 },
  };

  return {
    context: async () => ({ ...context, settings, pinned }),
    listApps: async () => ({ apps, tabs: tabs(), recent }),
    rescan: async () => emit('catalog', undefined),
    launch: async (id) => {
      recent = [id, ...recent.filter((other) => other !== id)].slice(0, 8);
      update(id, (app) => ({ ...app, status: 'running' }));
    },
    openAppFolder: async () => {},
    setOverride: async (id, patch) =>
      update(id, (app) => ({
        ...app,
        ...(patch.favorite === undefined ? {} : { favorite: patch.favorite }),
        ...(patch.hidden === undefined ? {} : { hidden: patch.hidden }),
        ...(patch.name === undefined || patch.name === null ? {} : { name: patch.name }),
      })),
    openFolder: async () => {},
    openConfigFile: async () => {},
    setSetting: async (key, value) => {
      if (
        key === 'theme' &&
        (value === 'system' || value === 'polar-night' || value === 'snow-storm')
      )
        settings = withAppearance(settings, { theme: value });
      else if (key === 'size' && (value === 's' || value === 'm' || value === 'l'))
        settings = withAppearance(settings, { size: value });
      else if (key === 'autostart')
        settings = {
          ...settings,
          config: {
            ...settings.config,
            behavior: { ...settings.config.behavior, autostart: value === 'true' },
          },
        };
      else return;
      emit('settings', settings);
    },
    volume: async () => ({
      label: 'D:',
      name: 'GENSLATE-USB',
      totalBytes: 161 * 1024 ** 3,
      availableBytes: 99.4 * 1024 ** 3,
      removable: true,
    }),
    setTelemetryActive: async (active) => {
      if (telemetryTimer !== undefined) clearInterval(telemetryTimer);
      telemetryTimer = active ? setInterval(() => emit('telemetry', sample()), 1000) : undefined;
      if (active) emit('telemetry', sample());
    },
    setPinned: async (next) => {
      pinned = next;
      emit('pinned', next);
    },
    setExpanded: async () => {},
    setPopupOpen: async () => {},
    hide: async () => {
      emit('willHide', undefined);
      // A browser tab can't hide: come back so the page stays usable.
      setTimeout(() => emit('shown', 'apps'), 700);
    },
    show: async (view) => emit('shown', view ?? 'apps'),
    // The browser preview of the tray menu reopens it, so the page stays usable.
    hideTrayMenu: async () => {
      setTimeout(() => emit('trayMenuOpen', mockTrayAnchor()), 700);
    },
    quit: async () => {},
    runAction: async (id) => ({ kind: 'done', message: `/${id} runs in the desktop app` }),
    on: async (event, handler) => {
      const set = listeners.get(event) ?? new Set<Handler>();
      const wrapped: Handler = (payload) => handler(payload as never);
      set.add(wrapped);
      listeners.set(event, set);
      return () => set.delete(wrapped);
    },
    iconUrl: (id) => {
      const [source, key] = id.split('/');
      return (source === 'genslate' && key !== undefined && iconDataUrl(key)) || '';
    },
  };
}
