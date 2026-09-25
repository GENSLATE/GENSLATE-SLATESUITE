import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from '../../../src/components/inputs/checkbox';

describe('Checkbox', () => {
  test('toggles via click on its label', async () => {
    const user = userEvent.setup();
    const onCheckedChange = mock((_: boolean) => {});
    render(<Checkbox label="Word wrap" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole('checkbox', { name: 'Word wrap' });
    expect(box).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByText('Word wrap'));
    expect(box).toHaveAttribute('aria-checked', 'true');
    expect(box).toHaveAttribute('data-checked');
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
  });

  test('toggles with Space', async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Minimap" defaultChecked />);
    const box = screen.getByRole('checkbox', { name: 'Minimap' });
    box.focus();
    await user.keyboard(' ');
    expect(box).toHaveAttribute('aria-checked', 'false');
  });

  test('exposes the mixed state', () => {
    render(<Checkbox aria-label="Select all" indeterminate />);
    const box = screen.getByRole('checkbox', { name: 'Select all' });
    expect(box).toHaveAttribute('aria-checked', 'mixed');
    expect(box).toHaveAttribute('data-indeterminate');
  });

  test('disabled boxes ignore clicks', async () => {
    const user = userEvent.setup();
    const onCheckedChange = mock((_: boolean) => {});
    render(<Checkbox label="Locked" disabled onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole('checkbox', { name: 'Locked' });
    expect(box).toHaveAttribute('aria-disabled', 'true');
    await user.click(box);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  test('invalid and description', () => {
    render(<Checkbox label="Accept" description="Required to continue." invalid />);
    const box = screen.getByRole('checkbox', { name: /Accept/ });
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Required to continue.')).toBeInTheDocument();
  });
});
