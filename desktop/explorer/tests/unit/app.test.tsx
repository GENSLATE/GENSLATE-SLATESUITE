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

/** The browser mock opens in Documents. */
async function fileList() {
  return screen.findByRole('listbox', { name: 'Contents of Documents' });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('genslate.theme', 'polar-night');
  delete document.documentElement.dataset['theme'];
});

describe('GENSLATE Explorer', () => {
  test('opens the start folder with the titlebar and status bar around it', async () => {
    renderApp();
    const list = await fileList();
    expect(
      await within(list).findByRole('option', { name: /Meeting notes\.md/ }),
    ).toBeInTheDocument();

    const banner = screen.getByRole('banner');
    expect(banner).toHaveAttribute('data-tauri-drag-region');
    expect(within(banner).getByText(APP.name)).toBeInTheDocument();

    const status = screen.getByRole('contentinfo', { name: 'Status bar' });
    expect(within(status).getByTitle(APP.productName)).toBeInTheDocument();
    expect(within(status).getByTitle('Items in view')).toHaveTextContent(/items/);
  });

  test('names the app consistently with its package', () => {
    expect(APP.id).toBe('explorer');
    expect(APP.productName).toEndWith(APP.name);
  });

  test('double-clicking a folder opens it', async () => {
    const user = userEvent.setup();
    renderApp();
    const list = await fileList();
    await user.dblClick(await within(list).findByRole('option', { name: /Invoices/ }));
    const invoices = await screen.findByRole('listbox', { name: 'Contents of Invoices' });
    expect(
      await within(invoices).findByRole('option', { name: /Invoice 2026-10\.pdf/ }),
    ).toBeInTheDocument();
  });

  test('the chat tab is a preview of what is coming', async () => {
    const user = userEvent.setup();
    renderApp();
    await fileList();
    await user.click(screen.getByRole('tab', { name: 'Chat (coming soon)' }));
    expect(screen.getByText('Chat with your files')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Summarize this folder' })).toBeDisabled();
  });

  test('the titlebar theme toggle flips data-theme', async () => {
    const user = userEvent.setup();
    renderApp();
    await fileList();
    expect(document.documentElement).toHaveAttribute('data-theme', 'polar-night');
    await user.click(screen.getByRole('button', { name: 'Switch to Snow Storm' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'snow-storm');
    await user.click(screen.getByRole('button', { name: 'Switch to Polar Night' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'polar-night');
  });

  test('keyboard: mod+shift+L toggles the theme', async () => {
    const user = userEvent.setup();
    renderApp();
    await fileList();
    // happy-dom's user agent is Linux, so `mod` is Control.
    await user.keyboard('{Control>}{Shift>}l{/Shift}{/Control}');
    expect(document.documentElement).toHaveAttribute('data-theme', 'snow-storm');
  });
});
