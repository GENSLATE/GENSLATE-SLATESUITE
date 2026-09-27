import { beforeEach, describe, expect, test } from 'bun:test';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/app.component';
import { APP } from '../../src/app/app.meta';
import { AppProviders } from '../../src/app/app.providers';

function renderApp() {
  return render(
    <AppProviders>
      <App />
    </AppProviders>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('genslate.theme', 'polar-night');
  delete document.documentElement.dataset['theme'];
});

describe('GENSLATE Jukebox', () => {
  test('renders the titlebar, the app name and version, and the status bar', () => {
    renderApp();
    const banner = screen.getByRole('banner');
    expect(banner).toHaveAttribute('data-tauri-drag-region');
    expect(within(banner).getByText(APP.name)).toBeInTheDocument();

    const main = screen.getByRole('main', { name: APP.name });
    expect(within(main).getByRole('heading', { level: 1, name: APP.name })).toBeInTheDocument();
    expect(within(main).getByText(`Version ${APP.version}`)).toBeInTheDocument();

    const status = screen.getByRole('contentinfo', { name: 'Status bar' });
    expect(within(status).getByText(APP.productName)).toBeInTheDocument();
    expect(within(status).getByText(`v${APP.version}`)).toBeInTheDocument();
    expect(within(status).getByText('Browser')).toBeInTheDocument();
  });

  test('names the app consistently with its package', () => {
    expect(APP.id).toBe('jukebox');
    expect(APP.productName).toEndWith(APP.name);
  });

  test('the titlebar theme toggle flips data-theme', async () => {
    const user = userEvent.setup();
    renderApp();
    expect(document.documentElement).toHaveAttribute('data-theme', 'polar-night');
    await user.click(screen.getByRole('button', { name: 'Switch to Snow Storm' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'snow-storm');
    await user.click(screen.getByRole('button', { name: 'Switch to Polar Night' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'polar-night');
  });

  test('keyboard: mod+shift+L toggles the theme', async () => {
    const user = userEvent.setup();
    renderApp();
    // happy-dom's user agent is Linux, so `mod` is Control.
    await user.keyboard('{Control>}{Shift>}l{/Shift}{/Control}');
    expect(document.documentElement).toHaveAttribute('data-theme', 'snow-storm');
  });
});
