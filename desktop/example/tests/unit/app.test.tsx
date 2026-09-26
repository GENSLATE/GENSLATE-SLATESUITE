import { beforeEach, describe, expect, test } from 'bun:test';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/app.component';
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

describe('Design Kit app', () => {
  test('renders the titlebar, sidebar navigation, main content and status bar', () => {
    renderApp();
    const banner = screen.getByRole('banner');
    expect(banner).toHaveAttribute('data-tauri-drag-region');
    expect(within(banner).getByRole('button', { name: /Search components/ })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Showcase pages' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Colors' })).toBeInTheDocument();
    const status = screen.getByRole('contentinfo', { name: 'Status bar' });
    expect(within(status).getByText('GENSLATE')).toBeInTheDocument();
    expect(within(status).getByText('Browser')).toBeInTheDocument();
  });

  test('switches pages from the sidebar and remembers the choice', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: 'Button' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Button' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Button' })).toHaveAttribute('aria-current', 'page');
    expect(JSON.parse(localStorage.getItem('genslate.example.page') ?? 'null')).toBe('button');
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

  test('keyboard: mod+B toggles the sidebar, mod+K opens the palette, mod+shift+L toggles the theme', async () => {
    const user = userEvent.setup();
    renderApp();
    const shell = document.querySelector('[data-slot="app-shell"]');
    expect(shell).not.toHaveAttribute('data-sidebar-collapsed');
    // happy-dom's user agent is Linux, so `mod` is Control.
    await user.keyboard('{Control>}b{/Control}');
    expect(shell).toHaveAttribute('data-sidebar-collapsed');
    await user.keyboard('{Control>}b{/Control}');
    expect(shell).not.toHaveAttribute('data-sidebar-collapsed');
    await user.keyboard('{Control>}{Shift>}l{/Shift}{/Control}');
    expect(document.documentElement).toHaveAttribute('data-theme', 'snow-storm');
  });

  test('mod+K opens the command palette, which navigates to a page', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.keyboard('{Control>}k{/Control}');
    expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    await user.keyboard('Segmented');
    await user.keyboard('{Enter}');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Segmented Control' }),
    ).toBeInTheDocument();
  });

  test('the settings button opens the appearance inspector', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: 'Appearance and about' }));
    const inspector = screen.getByRole('region', { name: 'Appearance' });
    await user.click(within(inspector).getByRole('button', { name: 'Light' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'snow-storm');
    await user.click(within(inspector).getByRole('button', { name: 'Close inspector' }));
    expect(screen.queryByRole('region', { name: 'Appearance' })).toBeNull();
  });
});
