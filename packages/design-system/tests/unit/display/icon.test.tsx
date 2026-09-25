import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Icon } from '../../../src/components/display/icon';
import { cn } from '../../../src/utils/cn.util';

describe('Icon', () => {
  test('renders a decorative codicon hidden from assistive tech', () => {
    const { container } = render(<Icon name="codicon:search" />);
    const icon = container.querySelector('[data-slot="icon"]');
    expect(icon).toHaveClass('codicon', 'codicon-search');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  test('exposes a label as an image name', () => {
    render(<Icon name="codicon:bell" label="Notifications" />);
    expect(screen.getByRole('img', { name: 'Notifications' })).toBeInTheDocument();
  });

  test('renders an SVG icon component', () => {
    const Svg = (props: { strokeWidth?: number | string }) => (
      <svg data-testid="svg" data-stroke={props.strokeWidth} />
    );
    render(<Icon icon={Svg} size={20} />);
    expect(screen.getByTestId('svg')).toHaveAttribute('data-stroke', '1.5');
  });
});

describe('cn', () => {
  test('merges token utilities without dropping colour vs size', () => {
    expect(cn('text-sm text-fg-muted', 'text-base')).toBe('text-fg-muted text-base');
    expect(cn('bg-surface', 'bg-accent')).toBe('bg-accent');
    expect(cn('h-control-md', 'h-control-sm')).toBe('h-control-sm');
    expect(cn('z-popover', 'z-dialog')).toBe('z-dialog');
    expect(cn('rounded-control', 'rounded-popover')).toBe('rounded-popover');
  });
});
