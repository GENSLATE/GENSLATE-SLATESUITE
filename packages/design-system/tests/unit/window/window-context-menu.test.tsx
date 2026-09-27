import { describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ContextMenuItem } from '../../../src/components/overlays/context-menu';
import { StatusBar, StatusBarItem } from '../../../src/components/window/status-bar';
import { TitleBar } from '../../../src/components/window/title-bar';
import {
  resolveContextTarget,
  WindowContextMenu,
  type WindowContextMenuProps,
} from '../../../src/components/window/window-context-menu';
import { DesignSystemProvider } from '../../../src/providers/design-system';

function Window(props: Omit<WindowContextMenuProps, 'children'> & { content?: ReactNode }) {
  const { content, ...menu } = props;
  return (
    <DesignSystemProvider platform="windows" storageKey={null} defaultTheme="polar-night">
      <WindowContextMenu {...menu}>
        <TitleBar title="Doc" />
        <main>
          {content ?? <p>Hello world</p>}
          <input aria-label="Name" defaultValue="GENSLATE" />
          <a href="https://example.com/docs">Docs</a>
          <div data-context-menu="none">Quiet</div>
        </main>
        <StatusBar>
          <StatusBarItem label="Version">v1.2.3</StatusBarItem>
        </StatusBar>
      </WindowContextMenu>
    </DesignSystemProvider>
  );
}

/** Every row of the open menu (commands, checkboxes, radios, submenu triggers), in order. */
const itemNames = () =>
  Array.from(
    screen.getByRole('menu').querySelectorAll('[role^="menuitem"]'),
    (item) => item.textContent ?? '',
  );

async function openOn(element: Element) {
  fireEvent.contextMenu(element, { clientX: 20, clientY: 20 });
  return await screen.findByRole('menu');
}

describe('resolveContextTarget', () => {
  test('tells fields, titlebar, status bar, links and opted-out areas apart', () => {
    render(<Window />);
    expect(resolveContextTarget(screen.getByRole('textbox'))?.kind).toBe('field');
    expect(resolveContextTarget(screen.getByRole('banner'))?.kind).toBe('titlebar');
    const status = resolveContextTarget(screen.getByText('v1.2.3'));
    expect(status).toMatchObject({ kind: 'statusbar', copyText: 'v1.2.3' });
    const link = resolveContextTarget(screen.getByText('Docs'));
    expect(link).toMatchObject({ kind: 'content', link: 'https://example.com/docs' });
    expect(resolveContextTarget(screen.getByText('Quiet'))).toBeNull();
  });

  test('app zones come from data-context-zone', () => {
    render(
      <Window
        content={
          <nav data-context-zone="rail">
            <span>Folders</span>
          </nav>
        }
      />,
    );
    expect(resolveContextTarget(screen.getByText('Folders'))).toMatchObject({
      kind: 'content',
      zone: 'rail',
    });
  });
});

describe('WindowContextMenu', () => {
  test('titlebar: theme submenu and the window commands that are wired', async () => {
    const user = userEvent.setup();
    const onMinimize = mock();
    const onClose = mock();
    render(<Window onMinimize={onMinimize} onClose={onClose} />);
    await openOn(screen.getByRole('banner'));
    expect(itemNames()).toEqual(['Theme', 'Minimize', 'Close Window']);
    await user.click(screen.getByRole('menuitem', { name: 'Close Window' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onMinimize).not.toHaveBeenCalled();
  });

  test('the Theme submenu switches the theme', async () => {
    const user = userEvent.setup();
    render(<Window />);
    await openOn(screen.getByRole('banner'));
    const theme = screen.getByRole('menuitem', { name: 'Theme' });
    theme.focus();
    await user.keyboard('{ArrowRight}');
    const light = await screen.findByRole('menuitemradio', { name: 'Snow Storm' });
    expect(screen.getByRole('menuitemradio', { name: 'Polar Night' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(light);
    await waitFor(() => expect(document.documentElement.dataset['theme']).toBe('snow-storm'));
  });

  test('text fields get the Edit commands with the right ones disabled', async () => {
    const input = () => screen.getByRole<HTMLInputElement>('textbox');
    render(<Window />);
    input().setSelectionRange(0, 0);
    await openOn(input());
    expect(itemNames().map((name) => name.replace(/Ctrl.*$/, ''))).toEqual([
      'Undo',
      'Redo',
      'Cut',
      'Copy',
      'Paste',
      'Delete',
      'Select All',
    ]);
    expect(screen.getByRole('menuitem', { name: /^Cut/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: /^Select All/ })).not.toHaveAttribute(
      'aria-disabled',
    );
  });

  test('Copy and Cut go through the clipboard; Cut edits the field', async () => {
    const user = userEvent.setup();
    const writeText = mock((_text: string) => Promise.resolve());
    render(<Window clipboard={{ writeText, readText: () => Promise.resolve(' Suite') }} />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    input.setSelectionRange(0, 3);
    await openOn(input);
    await user.click(screen.getByRole('menuitem', { name: /^Cut/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('GEN'));
    await waitFor(() => expect(input.value).toBe('SLATE'));
  });

  test('Paste inserts the clipboard text at the caret', async () => {
    const user = userEvent.setup();
    render(
      <Window
        clipboard={{
          writeText: () => Promise.resolve(),
          readText: () => Promise.resolve(' Suite'),
        }}
      />,
    );
    const input = screen.getByRole<HTMLInputElement>('textbox');
    input.setSelectionRange(8, 8);
    await openOn(input);
    await user.click(screen.getByRole('menuitem', { name: /^Paste/ }));
    await waitFor(() => expect(input.value).toBe('GENSLATE Suite'));
  });

  test('a clipboard failure is reported, not thrown', async () => {
    const user = userEvent.setup();
    const onError = mock();
    const denied = new Error('denied');
    render(
      <Window
        onError={onError}
        clipboard={{
          writeText: () => Promise.reject(denied),
          readText: () => Promise.reject(denied),
        }}
      />,
    );
    await openOn(screen.getByText('v1.2.3'));
    await user.click(screen.getByRole('menuitem', { name: 'Copy “v1.2.3”' }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(denied));
  });

  test('links: Open Link only when the app can open it, Copy Link Address always', async () => {
    const user = userEvent.setup();
    const onOpenLink = mock();
    render(<Window onOpenLink={onOpenLink} />);
    await openOn(screen.getByText('Docs'));
    expect(itemNames().slice(0, 2)).toEqual(['Open Link', 'Copy Link Address']);
    await user.click(screen.getByRole('menuitem', { name: 'Open Link' }));
    expect(onOpenLink).toHaveBeenCalledWith('https://example.com/docs');
  });

  test('chrome-like content (user-select: none) shows only Theme, with no stray separator', async () => {
    render(<Window content={<p style={{ userSelect: 'none' }}>Label</p>} />);
    const menu = await openOn(screen.getByText('Label'));
    expect(itemNames()).toEqual(['Theme']);
    expect(menu.querySelector('[role="separator"]')).toBeNull();
  });

  test('with hideTheme and nothing to offer, no menu opens', () => {
    render(<Window hideTheme content={<p style={{ userSelect: 'none' }}>Label</p>} />);
    fireEvent.contextMenu(screen.getByText('Label'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('app items come first and receive the target', async () => {
    const user = userEvent.setup();
    const onToggle = mock();
    render(
      <Window
        items={(target) =>
          target.kind === 'titlebar' ? (
            <ContextMenuItem onClick={onToggle}>Toggle Sidebar</ContextMenuItem>
          ) : null
        }
      />,
    );
    await openOn(screen.getByRole('banner'));
    expect(itemNames()[0]).toBe('Toggle Sidebar');
    await user.click(screen.getByRole('menuitem', { name: 'Toggle Sidebar' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('opted-out areas open nothing and the native menu stays hidden', () => {
    render(<Window />);
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    act(() => {
      screen.getByText('Quiet').dispatchEvent(event);
    });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(event.defaultPrevented).toBe(true);
  });

  test('Shift+F10 opens the menu for the focused field', async () => {
    const user = userEvent.setup();
    render(<Window />);
    await user.click(screen.getByRole('textbox'));
    await user.keyboard('{Shift>}{F10}{/Shift}');
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /^Undo/ })).toBeInTheDocument();
  });

  test('Shift+right-click reaches the webview menu only with allowNativeMenu', () => {
    const { unmount } = render(<Window allowNativeMenu />);
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      shiftKey: true,
    });
    act(() => {
      screen.getByText('Hello world').dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(false);
    expect(screen.queryByRole('menu')).toBeNull();
    unmount();
  });
});
