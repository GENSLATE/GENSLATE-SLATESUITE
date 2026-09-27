import { describe, expect, mock, test } from 'bun:test';
import { DesignSystemProvider } from '@genslate/design-system';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { type Boot, LauncherProvider } from '../../../src/app/launcher.provider';
import { TrayMenu } from '../../../src/features/tray-menu/tray-menu.component';
import type { LauncherBackend } from '../../../src/ipc/launcher.client';
import type { LauncherContext, LauncherEvents, Settings } from '../../../src/ipc/launcher.types';
import { app } from '../fixtures';

const SETTINGS: Settings = {
  config: {
    appearance: { theme: 'polar-night', size: 'm' },
    behavior: { hideOnBlur: true, hideOnLaunch: true, pinned: false, autostart: false },
    status: { mode: 'usage' },
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

const CONTEXT: LauncherContext = {
  version: '1.2.3',
  mode: 'suite',
  suiteName: 'GENSLATE-USB',
  profile: 'Shared',
  settings: SETTINGS,
  pinned: false,
  actions: [],
  layout: { inset: 16, normalWidth: 460, expandedWidth: 920 },
};

type Handler = (payload: unknown) => void;

function setup() {
  const listeners = new Map<string, Set<Handler>>();
  const resolved = async () => {};
  const backend = {
    context: async () => CONTEXT,
    listApps: async () => list,
    rescan: mock(resolved),
    launch: mock(async (_id: string) => {}),
    openAppFolder: mock(resolved),
    setOverride: mock(resolved),
    openFolder: mock(async (_folder: string) => {}),
    openConfigFile: mock(async (_file: string) => {}),
    setSetting: mock(async (_key: string, _value: string) => {}),
    volume: async () => null,
    setTelemetryActive: mock(resolved),
    setPinned: mock(async (_pinned: boolean) => {}),
    setExpanded: mock(resolved),
    setPopupOpen: mock(resolved),
    hide: mock(resolved),
    show: mock(async (_view?: string) => {}),
    hideTrayMenu: mock(resolved),
    quit: mock(resolved),
    runAction: async () => ({ kind: 'done' as const, message: null }),
    on: async <E extends keyof LauncherEvents>(
      event: E,
      handler: (payload: LauncherEvents[E]) => void,
    ) => {
      const set = listeners.get(event) ?? new Set<Handler>();
      const wrapped: Handler = (payload) => handler(payload as LauncherEvents[E]);
      set.add(wrapped);
      listeners.set(event, set);
      return () => set.delete(wrapped);
    },
    iconUrl: () => '',
  } satisfies LauncherBackend;
  const list = {
    apps: [
      app('genslate/terminal', { favorite: true }),
      app('genslate/theater', { status: 'missing-exe' }),
    ],
    tabs: [],
    recent: ['genslate/terminal', 'genslate/theater'],
  };
  const boot: Boot = { backend, context: CONTEXT, list };
  const emit = (event: keyof LauncherEvents, payload: unknown) => {
    for (const handler of listeners.get(event) ?? []) handler(payload);
  };
  render(
    <LauncherProvider boot={boot}>
      <DesignSystemProvider theme="polar-night" storageKey={null}>
        <TrayMenu initialAnchor={{ x: 540, y: 420, opensUp: true, alignEnd: true }} />
      </DesignSystemProvider>
    </LauncherProvider>,
  );
  return { backend, emit };
}

const openSubmenu = async (name: string) => {
  fireEvent.click(await screen.findByRole('menuitem', { name }));
  return screen.findByRole('menu', { name });
};

describe('TrayMenu', () => {
  test('opens with the header and the top-level rows', async () => {
    setup();
    const menu = await screen.findByRole('menu', { name: 'GENSLATE Launcher' });
    expect(menu.querySelector('[data-slot="menu-header"]')).toHaveTextContent(
      /GENSLATE Launcher.*Suite · GENSLATE-USB.*v1\.2\.3/,
    );
    for (const name of ['Recent', 'Favorites', 'Folders', 'Appearance', 'Settings']) {
      expect(screen.getByRole('menuitem', { name })).toHaveAttribute('aria-haspopup', 'menu');
    }
    expect(screen.getByRole('menuitem', { name: /Show Launcher/ })).toHaveTextContent(
      'Ctrl+Alt+Space',
    );
    expect(screen.getByRole('menuitem', { name: 'Quit GENSLATE Launcher' })).toBeInTheDocument();
  });

  test('rows call the shell and the window hides once the menu has closed', async () => {
    const { backend } = setup();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Pin on Top' }));
    expect(backend.setPinned).toHaveBeenCalledWith(true);
    await waitFor(() => expect(backend.hideTrayMenu).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('Help opens the launcher on its help view', async () => {
    const { backend } = setup();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Help' }));
    expect(backend.show).toHaveBeenCalledWith('help');
  });

  test('Recent launches ready apps and disables missing ones', async () => {
    const { backend } = setup();
    await openSubmenu('Recent');
    expect(screen.getByRole('menuitem', { name: 'Theater' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Terminal' }));
    expect(backend.launch).toHaveBeenCalledWith('genslate/terminal');
  });

  test('Appearance marks the current theme and writes a new one', async () => {
    const { backend } = setup();
    await openSubmenu('Appearance');
    expect(screen.getByRole('menuitemradio', { name: 'Polar Night' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Snow Storm' }));
    expect(backend.setSetting).toHaveBeenCalledWith('theme', 'snow-storm');
  });

  test('Settings opens files and toggles start with system', async () => {
    const { backend } = setup();
    await openSubmenu('Settings');
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Start with System' }));
    expect(backend.setSetting).toHaveBeenCalledWith('autostart', 'true');
  });

  test('Folders opens a portable folder', async () => {
    const { backend } = setup();
    await openSubmenu('Folders');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Documents' }));
    expect(backend.openFolder).toHaveBeenCalledWith('documents');
  });

  test('the shell can close it and reopen it at a new anchor', async () => {
    const { backend, emit } = setup();
    await screen.findByRole('menu');
    emit('trayMenuClose', undefined);
    await waitFor(() => expect(backend.hideTrayMenu).toHaveBeenCalledTimes(1));
    emit('trayMenuOpen', { x: 20, y: 20, opensUp: false, alignEnd: false });
    expect(await screen.findByRole('menu', { name: 'GENSLATE Launcher' })).toBeInTheDocument();
  });
});
