import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from '../../../src/components/window/app-shell';
import {
  StatusBar,
  StatusBarItem,
  StatusBarSection,
} from '../../../src/components/window/status-bar';
import { TitleBar, TitleBarCommandCenter } from '../../../src/components/window/title-bar';
import { TrafficLights } from '../../../src/components/window/traffic-lights';

describe('TrafficLights', () => {
  test('three labelled buttons that call their handlers', async () => {
    const user = userEvent.setup();
    const onClose = mock();
    const onMinimize = mock();
    const onToggleMaximize = mock();
    render(
      <TrafficLights
        onClose={onClose}
        onMinimize={onMinimize}
        onToggleMaximize={onToggleMaximize}
      />,
    );
    expect(screen.getByRole('group', { name: 'Window controls' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'Minimize' }));
    await user.click(screen.getByRole('button', { name: 'Zoom' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onMinimize).toHaveBeenCalledTimes(1);
    expect(onToggleMaximize).toHaveBeenCalledTimes(1);
  });

  test('keyboard operable, marks inactive windows, exit-fullscreen label', async () => {
    const user = userEvent.setup();
    const onClose = mock();
    render(<TrafficLights isFocused={false} isFullscreen onClose={onClose} />);
    expect(screen.getByRole('group')).toHaveAttribute('data-inactive');
    expect(screen.getByRole('button', { name: 'Exit Full Screen' })).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('TitleBar', () => {
  test('is a banner with drag regions and a title', () => {
    render(<TitleBar title="Doc" platform="macos" />);
    const header = screen.getByRole('banner');
    expect(header).toHaveAttribute('data-tauri-drag-region');
    expect(screen.getByText('Doc')).toBeInTheDocument();
  });

  test('traffic lights are the only window controls on every platform', async () => {
    const user = userEvent.setup();
    const onClose = mock();
    const onMinimize = mock();
    const onToggleMaximize = mock();
    for (const platform of ['macos', 'windows', 'linux', 'web'] as const) {
      const { unmount } = render(
        <TitleBar
          platform={platform}
          onClose={onClose}
          onMinimize={onMinimize}
          onToggleMaximize={onToggleMaximize}
        />,
      );
      const lights = screen.getByRole('group', { name: 'Window controls' });
      expect(lights).toHaveAttribute('data-slot', 'traffic-lights');
      expect(
        screen.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
      ).toEqual(['Close', 'Minimize', 'Zoom']);
      await user.click(screen.getByRole('button', { name: 'Close' }));
      await user.click(screen.getByRole('button', { name: 'Minimize' }));
      await user.click(screen.getByRole('button', { name: 'Zoom' }));
      unmount();
    }
    expect(onClose).toHaveBeenCalledTimes(4);
    expect(onMinimize).toHaveBeenCalledTimes(4);
    expect(onToggleMaximize).toHaveBeenCalledTimes(4);
  });

  test('full screen flips the green light to exit full screen', () => {
    render(<TitleBar platform="windows" isFullscreen />);
    expect(screen.getByRole('button', { name: 'Exit Full Screen' })).toBeInTheDocument();
  });

  test('double-click leaves maximize to the native drag region by default', () => {
    const onToggleMaximize = mock();
    render(<TitleBar platform="linux" onToggleMaximize={onToggleMaximize} />);
    fireEvent.doubleClick(screen.getByRole('banner'));
    expect(onToggleMaximize).not.toHaveBeenCalled();
  });

  test('opt-in double-click toggles maximize on empty space only', () => {
    const onToggleMaximize = mock();
    const { rerender } = render(
      <TitleBar
        platform="linux"
        doubleClickToMaximize
        onToggleMaximize={onToggleMaximize}
        actions={<button type="button">A</button>}
      />,
    );
    fireEvent.doubleClick(screen.getByRole('banner'));
    expect(onToggleMaximize).toHaveBeenCalledTimes(1);
    fireEvent.doubleClick(screen.getByRole('button', { name: 'A' }));
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Zoom' }));
    expect(onToggleMaximize).toHaveBeenCalledTimes(1);
    rerender(
      <TitleBar platform="macos" doubleClickToMaximize onToggleMaximize={onToggleMaximize} />,
    );
    fireEvent.doubleClick(screen.getByRole('banner'));
    expect(onToggleMaximize).toHaveBeenCalledTimes(2);
  });

  test('command center is a button with a shortcut hint', async () => {
    const user = userEvent.setup();
    const onClick = mock();
    render(
      <TitleBar
        platform="macos"
        center={<TitleBarCommandCenter onClick={onClick}>Search components</TitleBarCommandCenter>}
      />,
    );
    const button = screen.getByRole('button', { name: /Search components/ });
    expect(button).toHaveTextContent('⌘K');
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('inactive window is flagged', () => {
    render(<TitleBar platform="web" isFocused={false} />);
    expect(screen.getByRole('banner')).toHaveAttribute('data-inactive');
  });
});

describe('StatusBar', () => {
  test('contentinfo landmark with static and button items', async () => {
    const user = userEvent.setup();
    const onClick = mock();
    render(
      <StatusBar>
        <StatusBarSection>
          <StatusBarItem accent icon="codicon:remote" label="Remote" onClick={onClick}>
            main
          </StatusBarItem>
          <StatusBarItem icon="codicon:bell" label="Notifications" />
        </StatusBarSection>
        <StatusBarSection align="end">
          <StatusBarItem>Ln 1, Col 1</StatusBarItem>
        </StatusBarSection>
      </StatusBar>,
    );
    expect(screen.getByRole('contentinfo', { name: 'Status bar' })).toBeInTheDocument();
    const accent = screen.getByRole('button', { name: 'main' });
    expect(accent).toHaveAttribute('data-accent');
    expect(accent).toHaveAttribute('title', 'Remote');
    await user.click(accent);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('img', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Ln 1, Col 1').closest('button')).toBeNull();
  });
});

describe('AppShell', () => {
  test('renders regions and a keyboard-resizable sash', async () => {
    const user = userEvent.setup();
    const onWidth = mock();
    const onCollapsed = mock();
    render(
      <AppShell
        titleBar={<header>Title</header>}
        statusBar={<footer>Status</footer>}
        sidebar={<nav aria-label="Side">Nav</nav>}
        defaultSidebarWidth={240}
        onSidebarWidthChange={onWidth}
        onSidebarCollapsedChange={onCollapsed}
        mainLabel="Content"
      >
        Main
      </AppShell>,
    );
    expect(screen.getByRole('main', { name: 'Content' })).toHaveTextContent('Main');
    const sash = screen.getByRole('separator', { name: 'Resize sidebar' });
    expect(sash).toHaveAttribute('aria-valuenow', '240');
    sash.focus();
    await user.keyboard('{ArrowRight}');
    expect(sash).toHaveAttribute('aria-valuenow', '248');
    await user.keyboard('{Shift>}{ArrowLeft}{/Shift}');
    expect(sash).toHaveAttribute('aria-valuenow', '216');
    await user.keyboard('{Home}');
    expect(sash).toHaveAttribute('aria-valuenow', '180');
    await user.keyboard('{End}');
    expect(sash).toHaveAttribute('aria-valuenow', '420');
    expect(onWidth).toHaveBeenLastCalledWith(420);
    await user.keyboard('{Enter}');
    expect(onCollapsed).toHaveBeenCalledWith(true);
    expect(document.querySelector('[data-slot="app-shell-sidebar"]')).toHaveAttribute(
      'data-collapsed',
    );
  });

  test('controlled collapsed state and persistence', () => {
    localStorage.removeItem('test.shell');
    const { rerender } = render(
      <AppShell sidebar={<div>Nav</div>} sidebarCollapsed persistKey="test.shell">
        Main
      </AppShell>,
    );
    expect(document.querySelector('[data-slot="app-shell"]')).toHaveAttribute(
      'data-sidebar-collapsed',
    );
    rerender(
      <AppShell sidebar={<div>Nav</div>} sidebarCollapsed={false} persistKey="test.shell">
        Main
      </AppShell>,
    );
    expect(document.querySelector('[data-slot="app-shell"]')).not.toHaveAttribute(
      'data-sidebar-collapsed',
    );
    expect(JSON.parse(localStorage.getItem('test.shell') ?? '{}')).toEqual({
      width: 248,
      collapsed: false,
    });
  });
});
