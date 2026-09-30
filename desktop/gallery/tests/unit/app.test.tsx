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

/** The browser mock's sample library, shown as the timeline. */
async function timeline() {
  return screen.findByRole('listbox', { name: /items in the timeline/ });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('genslate.theme', 'polar-night');
  delete document.documentElement.dataset['theme'];
});

describe('GENSLATE Gallery', () => {
  test('opens the library with the titlebar, side panel and status bar around it', async () => {
    renderApp();
    await timeline();

    const banner = screen.getByRole('banner');
    expect(banner).toHaveAttribute('data-tauri-drag-region');
    expect(within(banner).getByText(APP.name)).toBeInTheDocument();

    expect(await screen.findByRole('button', { name: /Summer in Portugal/ })).toBeInTheDocument();

    const status = screen.getByRole('contentinfo', { name: 'Status bar' });
    expect(within(status).getByTitle(APP.productName)).toBeInTheDocument();
    expect(within(status).getByTitle('Items in view')).toHaveTextContent(/photos/);
  });

  test('names the app consistently with its package', () => {
    expect(APP.id).toBe('gallery');
    expect(APP.productName).toEndWith(APP.name);
  });

  test('keyboard: open the first photo from the details view, then go back', async () => {
    const user = userEvent.setup();
    renderApp();
    await timeline();
    // happy-dom's user agent is Linux, so `mod` is Control.
    await user.keyboard('{Control>}3{/Control}');
    const details = await screen.findByRole('listbox', { name: /items in details/ });
    details.focus();
    await user.keyboard('{Home}{Enter}');
    const back = await screen.findByRole('button', { name: 'Back to the photos' });
    expect(screen.getByRole('toolbar', { name: 'Film strip' })).toBeInTheDocument();
    await user.click(back);
    expect(await screen.findByRole('listbox', { name: /items in details/ })).toBeInTheDocument();
  });

  test('the People tab is a preview of what is coming', async () => {
    const user = userEvent.setup();
    renderApp();
    await timeline();
    await user.click(screen.getByRole('tab', { name: 'People (coming soon)' }));
    expect(screen.getByRole('heading', { name: 'People' })).toBeInTheDocument();
    expect(screen.getAllByText('Coming soon').length).toBeGreaterThan(0);
  });

  test('the assistant is a preview: its prompts are disabled', async () => {
    const user = userEvent.setup();
    renderApp();
    await timeline();
    await user.click(screen.getByRole('tab', { name: 'Assistant (coming soon)' }));
    expect(screen.getByRole('button', { name: 'Show sunsets from last summer' })).toBeDisabled();
    expect(
      screen.getByRole('textbox', { name: 'Message the assistant (coming soon)' }),
    ).toBeDisabled();
  });

  test('the titlebar theme toggle flips data-theme', async () => {
    const user = userEvent.setup();
    renderApp();
    await timeline();
    expect(document.documentElement).toHaveAttribute('data-theme', 'polar-night');
    await user.click(screen.getByRole('button', { name: 'Switch to Snow Storm' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'snow-storm');
    await user.click(screen.getByRole('button', { name: 'Switch to Polar Night' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'polar-night');
  });

  test('keyboard: mod+shift+L toggles the theme', async () => {
    const user = userEvent.setup();
    renderApp();
    await timeline();
    await user.keyboard('{Control>}{Shift>}l{/Shift}{/Control}');
    expect(document.documentElement).toHaveAttribute('data-theme', 'snow-storm');
  });
});
