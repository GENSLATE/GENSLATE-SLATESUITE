import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToggleButton, ToggleGroup } from '../../../src/components/actions/toggle-button';

describe('ToggleButton', () => {
  test('toggles pressed state', async () => {
    const user = userEvent.setup();
    const onPressedChange = mock();
    render(<ToggleButton icon="codicon:bold" label="Bold" onPressedChange={onPressedChange} />);
    const button = screen.getByRole('button', { name: 'Bold' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('data-pressed');
    expect(onPressedChange.mock.calls[0]?.[0]).toBe(true);
  });

  test('ToggleGroup keeps a single value and roves focus with arrows', async () => {
    const user = userEvent.setup();
    const onValueChange = mock();
    render(
      <ToggleGroup aria-label="Alignment" defaultValue={['left']} onValueChange={onValueChange}>
        <ToggleButton value="left" icon="codicon:arrow-left" label="Left" />
        <ToggleButton value="right" icon="codicon:arrow-right" label="Right" />
      </ToggleGroup>,
    );
    expect(screen.getByRole('group', { name: 'Alignment' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Right' }));
    expect(screen.getByRole('button', { name: 'Right' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Left' })).toHaveAttribute('aria-pressed', 'false');
    expect(onValueChange.mock.calls[0]?.[0]).toEqual(['right']);
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: 'Left' })).toHaveFocus();
  });
});
