import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '../../../src/components/inputs/switch';

describe('Switch', () => {
  test('is a named switch that toggles on click', async () => {
    const user = userEvent.setup();
    const onCheckedChange = mock((_: boolean) => {});
    render(<Switch label="Auto save" onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole('switch', { name: 'Auto save' });
    expect(control).toHaveAttribute('aria-checked', 'false');
    await user.click(control);
    expect(control).toHaveAttribute('aria-checked', 'true');
    expect(control).toHaveAttribute('data-checked');
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
  });

  test('toggles with Enter and Space', async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Wi-Fi" defaultChecked />);
    const control = screen.getByRole('switch', { name: 'Wi-Fi' });
    control.focus();
    await user.keyboard(' ');
    expect(control).toHaveAttribute('aria-checked', 'false');
    await user.keyboard('{Enter}');
    expect(control).toHaveAttribute('aria-checked', 'true');
  });

  test('disabled switch does not toggle; thumb mirrors state', async () => {
    const user = userEvent.setup();
    const { container } = render(<Switch aria-label="Sync" disabled defaultChecked size="sm" />);
    const control = screen.getByRole('switch', { name: 'Sync' });
    await user.click(control);
    expect(control).toHaveAttribute('aria-checked', 'true');
    expect(container.querySelector('[data-slot="switch-thumb"]')).toHaveAttribute('data-checked');
  });
});
