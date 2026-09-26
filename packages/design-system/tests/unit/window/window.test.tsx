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
import { WindowControls } from '../../../src/components/window/window-controls';

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

describe('WindowControls', () => {
  test('shows restore when maximized', async () => {
    const user = userEvent.setup();
    const onToggleMaximize = mock();
    render(<WindowControls isMaximized onToggleMaximize={onToggleMaximize} />);
    await user.click(screen.getByRole('button', { name: 'Restore' }));
    expect(onToggleMaximize).toHaveBeenCalledTimes(1);
  });
});

describe('TitleBar', () => {
  test('is a banner with drag regions; macOS reserves space for native lights', () => {
    const { container } = render(<TitleBar title="Doc" platform="macos" />);
    const header = screen.getByRole('banner');
    expect(header).toHaveAttribute('data-tauri-drag-region');
    expect(screen.queryByRole('group', { name: 'Window controls' })).toBeNull();
    expect(container.querySelector('.w-traffic-spacer')).toBeInTheDocument();
    expect(screen.getByText('Doc')).toBeInTheDocument();
  });

  test('controls default by platform', () => {
    const { rerender } = render(<TitleBar platform="linux" />);
    expect(screen.getByRole('button', { name: 'Zoom' })).toBeInTheDocument();
    rerender(<TitleBar platform="windows" />);
    expect(screen.getByRole('button', { name: 'Maximize' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zoom' })).toBeNull();
  });

  test('double-click leaves maximize to the native drag region by default', () => {
    const onToggleMaximize = mock();
    render(<TitleBar platform="linux" onToggleMaximize={onToggleMaximize} />);
    fireEvent.doubleClick(screen.getByRole('banner'));
    expect(onToggleMaximize).not.toHaveBeenCalled();
  });

  test('opt-in double-click toggles maximize (not on macOS, not on controls)', () => {
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
    expect(onToggleMaximize).toHaveBeenCalledTimes(1);
    rerender(
      <TitleBar platform="macos" doubleClickToMaximize onToggleMaximize={onToggleMaximize} />,
    );
    fireEvent.doubleClick(screen.getByRole('banner'));
    expect(onToggleMaximize).toHaveBeenCalledTimes(1);
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
