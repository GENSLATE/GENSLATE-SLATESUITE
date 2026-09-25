import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Avatar, initialsOf } from '../../../src/components/display/avatar';
import { CodeBlock } from '../../../src/components/display/code-block';
import { ColorSwatch } from '../../../src/components/display/color-swatch';
import { Kbd } from '../../../src/components/display/kbd';
import { PlatformProvider } from '../../../src/providers/platform';

describe('Kbd', () => {
  test('renders mac symbols as keycaps', () => {
    const { container } = render(<Kbd shortcut="mod+shift+p" platform="macos" />);
    const keys = [...container.querySelectorAll('[data-slot="kbd-key"]')].map(
      (key) => key.textContent,
    );
    expect(keys).toEqual(['⌘', '⇧', 'P']);
    expect(container.querySelector('[data-slot="kbd"]')).toHaveAttribute('aria-label', '⌘⇧P');
  });

  test('uses the provider platform and PC names', () => {
    render(
      <PlatformProvider platform="windows">
        <Kbd shortcut="mod+k" variant="inline" />
      </PlatformProvider>,
    );
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-platform', 'windows');
  });
});

describe('Avatar', () => {
  test('falls back to initials and is named', () => {
    render(<Avatar name="Arctic Ice" status="online" />);
    expect(screen.getByRole('img', { name: 'Arctic Ice' })).toHaveTextContent('AI');
  });

  test('initialsOf handles single words', () => {
    expect(initialsOf('nord')).toBe('NO');
    expect(initialsOf('  Polar   Night ')).toBe('PN');
  });
});

describe('CodeBlock', () => {
  test('renders code with line numbers and copies it', async () => {
    const user = userEvent.setup();
    const onCopy = mock();
    const writeText = mock(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { container } = render(
      <CodeBlock
        code={'bun install\nbun dev\n'}
        language="bash"
        title="Setup"
        lineNumbers
        onCopy={onCopy}
      />,
    );
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('bun dev')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('bun install\nbun dev\n');
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });
});

describe('ColorSwatch', () => {
  test('shows name and value', () => {
    render(<ColorSwatch color="var(--gs-color-accent)" name="accent" value="#88c0d0" />);
    expect(screen.getByText('accent')).toBeInTheDocument();
    expect(screen.getByText('#88c0d0')).toBeInTheDocument();
  });
});
