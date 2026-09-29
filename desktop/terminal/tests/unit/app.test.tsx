import { beforeEach, describe, expect, test } from 'bun:test';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/app.component';
import { APP } from '../../src/app/app.meta';
import { AppProviders } from '../../src/app/app.providers';

/**
 * happy-dom has no canvas; xterm only measures glyphs with a 2D context here (the WebGL
 * renderer falls back on its own), so a context that measures every glyph 8px wide is enough.
 */
const fakeContext = new Proxy(
  { measureText: (text: string) => ({ width: text.length * 8 }), canvas: {} },
  {
    get: (target, key) => (key in target ? target[key as keyof typeof target] : () => undefined),
  },
);
HTMLCanvasElement.prototype.getContext = function getContext(kind: string) {
  return kind === '2d' ? fakeContext : null;
} as typeof HTMLCanvasElement.prototype.getContext;

function renderApp() {
  return render(
    <AppProviders>
      <App />
    </AppProviders>,
  );
}

/** The first tab opens once the shells and settings have loaded. */
async function tabStrip() {
  const tabs = await screen.findByRole('tablist', { name: 'Terminal tabs' });
  await within(tabs).findByRole('tab', { name: /PowerShell/ });
  return tabs;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('genslate.theme', 'polar-night');
  delete document.documentElement.dataset['theme'];
});

describe('GENSLATE Terminal', () => {
  test('opens a tab with the default shell, the titlebar and the status bar', async () => {
    renderApp();
    await tabStrip();
    expect(screen.getByRole('banner')).toHaveAttribute('data-tauri-drag-region');
    const status = screen.getByRole('contentinfo', { name: 'Status bar' });
    expect(within(status).getByText(`v${APP.version}`)).toBeInTheDocument();
    expect(within(status).getByText('Polar Night')).toBeInTheDocument();
  });

  test('names the app consistently with its package', () => {
    expect(APP.id).toBe('terminal');
    expect(APP.productName).toEndWith(APP.name);
  });

  test('keyboard: Ctrl+Shift+T opens a tab and Ctrl+Shift+L switches the theme', async () => {
    const user = userEvent.setup();
    renderApp();
    const tabs = await tabStrip();
    await user.keyboard('{Control>}{Shift>}t{/Shift}{/Control}');
    expect(await within(tabs).findAllByRole('tab')).toHaveLength(2);
    await user.keyboard('{Control>}{Shift>}l{/Shift}{/Control}');
    expect(document.documentElement).toHaveAttribute('data-theme', 'snow-storm');
  });

  test('the assistant is a preview in the side panel', async () => {
    const user = userEvent.setup();
    renderApp();
    await tabStrip();
    await user.click(screen.getByRole('tab', { name: /Assistant/ }));
    expect(await screen.findByText('Terminal assistant')).toBeInTheDocument();
    expect(screen.getAllByText('Coming soon').length).toBeGreaterThan(0);
  });
});
