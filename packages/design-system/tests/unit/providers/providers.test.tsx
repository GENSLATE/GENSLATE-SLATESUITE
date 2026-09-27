import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCursorStyle } from '../../../src/hooks/use-cursor-style.hook';
import { usePlatform } from '../../../src/hooks/use-platform.hook';
import { useTheme } from '../../../src/hooks/use-theme.hook';
import { useWindowState } from '../../../src/hooks/use-window-state.hook';
import { CursorProvider } from '../../../src/providers/cursor';
import { DesignSystemProvider } from '../../../src/providers/design-system';
import { applyInitialTheme, ThemeProvider, themeInitScript } from '../../../src/providers/theme';
import { jsonForScriptTag } from '../../../src/providers/theme/theme.script';

function ThemeProbe() {
  const { theme, resolvedTheme, scheme, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <output data-testid="theme">{`${theme}|${resolvedTheme}|${scheme}`}</output>
      <button type="button" onClick={toggleTheme}>
        toggle
      </button>
      <button type="button" onClick={() => setTheme('system')}>
        system
      </button>
    </div>
  );
}

const root = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  delete root.dataset['theme'];
  delete root.dataset['cursor'];
});

afterEach(() => {
  localStorage.clear();
});

describe('ThemeProvider', () => {
  test('applies an uncontrolled theme, toggles and persists it', async () => {
    const user = userEvent.setup();
    const onResolved = mock();
    render(
      <ThemeProvider defaultTheme="polar-night" onResolvedThemeChange={onResolved}>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(root).toHaveAttribute('data-theme', 'polar-night');
    expect(screen.getByTestId('theme')).toHaveTextContent('polar-night|polar-night|dark');
    expect(onResolved).toHaveBeenLastCalledWith('polar-night', 'dark');
    const seen: string[] = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) if (record.attributeName) seen.push(record.attributeName);
    });
    observer.observe(root, { attributes: true });
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(root).toHaveAttribute('data-theme', 'snow-storm');
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    observer.disconnect();
    expect(seen).toContain('data-theme-switching');
    expect(localStorage.getItem('genslate.theme')).toBe('snow-storm');
    expect(onResolved).toHaveBeenLastCalledWith('snow-storm', 'light');
    await act(() => new Promise((resolve) => setTimeout(resolve, 60)));
    expect(root).not.toHaveAttribute('data-theme-switching');
  });

  test('reads the stored preference', () => {
    localStorage.setItem('genslate.theme', 'snow-storm');
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('snow-storm|snow-storm|light');
  });

  test('controlled: reports changes without applying them itself', async () => {
    const user = userEvent.setup();
    const onThemeChange = mock();
    render(
      <ThemeProvider theme="polar-night" onThemeChange={onThemeChange}>
        <ThemeProbe />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(onThemeChange).toHaveBeenCalledWith('snow-storm');
    expect(root).toHaveAttribute('data-theme', 'polar-night');
    expect(localStorage.getItem('genslate.theme')).toBeNull();
  });

  test('system resolves from systemScheme', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider defaultTheme="polar-night" systemScheme="light">
        <ThemeProbe />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'system' }));
    expect(screen.getByTestId('theme')).toHaveTextContent('system|snow-storm|light');
  });

  test('useTheme throws outside a provider', () => {
    const spy = mock(() => {});
    const original = console.error;
    console.error = spy;
    expect(() => render(<ThemeProbe />)).toThrow();
    console.error = original;
  });
});

describe('theme init', () => {
  test('applyInitialTheme uses storage then fallback', () => {
    localStorage.setItem('genslate.theme', 'snow-storm');
    expect(applyInitialTheme()).toBe('snow-storm');
    expect(root).toHaveAttribute('data-theme', 'snow-storm');
    localStorage.clear();
    expect(applyInitialTheme('polar-night')).toBe('polar-night');
  });

  test('themeInitScript is a self-invoking script', () => {
    localStorage.setItem('genslate.theme', 'snow-storm');
    new Function(themeInitScript)();
    expect(root).toHaveAttribute('data-theme', 'snow-storm');
  });

  test('jsonForScriptTag escapes `<` so a `</script>`-bearing value cannot close the tag', () => {
    const dangerous = '</script><script>window.pwned=true</script>';
    const encoded = jsonForScriptTag(dangerous);
    expect(encoded).not.toContain('</script');
    expect(encoded).not.toContain('<script');
    // Still a faithful, valid JSON encoding once parsed back.
    expect(JSON.parse(encoded.replace(/\\u003C/g, '<'))).toBe(dangerous);
  });
});

function Everything() {
  const platform = usePlatform();
  const { isFocused, isMaximized } = useWindowState();
  const { resolvedTheme } = useTheme();
  return <output>{`${platform}|${isFocused}|${isMaximized}|${resolvedTheme}`}</output>;
}

describe('DesignSystemProvider', () => {
  test('composes platform, window state and theme and writes html attributes', () => {
    render(
      <DesignSystemProvider
        platform="linux"
        theme="snow-storm"
        windowState={{ isFocused: false, isMaximized: true }}
      >
        <Everything />
      </DesignSystemProvider>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('linux|false|true|snow-storm');
    expect(root).toHaveAttribute('data-platform', 'linux');
    expect(root).toHaveAttribute('data-window-focused', 'false');
    expect(root).toHaveAttribute('data-theme', 'snow-storm');
  });
});

function CursorProbe() {
  const { cursorStyle, setCursorStyle } = useCursorStyle();
  return (
    <button
      type="button"
      onClick={() => setCursorStyle(cursorStyle === 'themed' ? 'system' : 'themed')}
    >
      {cursorStyle}
    </button>
  );
}

describe('CursorProvider', () => {
  test('applies themed cursors by default, switches to system cursors and persists it', async () => {
    const user = userEvent.setup();
    render(
      <CursorProvider>
        <CursorProbe />
      </CursorProvider>,
    );
    expect(root).toHaveAttribute('data-cursor', 'themed');
    await user.click(screen.getByRole('button', { name: 'themed' }));
    expect(root).toHaveAttribute('data-cursor', 'system');
    expect(screen.getByRole('button', { name: 'system' })).toBeInTheDocument();
    expect(localStorage.getItem('genslate.cursor')).toBe('system');
  });

  test('reads the stored style and ignores unknown values', () => {
    localStorage.setItem('genslate.cursor', 'system');
    const { unmount } = render(
      <CursorProvider>
        <CursorProbe />
      </CursorProvider>,
    );
    expect(root).toHaveAttribute('data-cursor', 'system');
    unmount();
    localStorage.setItem('genslate.cursor', 'sparkly');
    render(
      <CursorProvider>
        <CursorProbe />
      </CursorProvider>,
    );
    expect(root).toHaveAttribute('data-cursor', 'themed');
  });

  test('controlled: reports changes without applying them itself', async () => {
    const user = userEvent.setup();
    const onCursorStyleChange = mock();
    render(
      <DesignSystemProvider cursorStyle="themed" onCursorStyleChange={onCursorStyleChange}>
        <CursorProbe />
      </DesignSystemProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'themed' }));
    expect(onCursorStyleChange).toHaveBeenCalledWith('system');
    expect(root).toHaveAttribute('data-cursor', 'themed');
    expect(localStorage.getItem('genslate.cursor')).toBeNull();
  });

  test('useCursorStyle() outside a provider throws a helpful error', () => {
    const spy = mock(() => undefined);
    const original = console.error;
    console.error = spy;
    expect(() => render(<CursorProbe />)).toThrow(/CursorProvider/);
    console.error = original;
  });
});
