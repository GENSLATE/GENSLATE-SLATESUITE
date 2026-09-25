import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumberField } from '../../../src/components/inputs/number-field';

describe('NumberField', () => {
  test('renders a labelled numeric input with stepper buttons', () => {
    render(<NumberField label="Tab size" defaultValue={4} />);
    expect(screen.getByRole('textbox', { name: 'Tab size' })).toHaveValue('4');
    expect(screen.getByRole('button', { name: 'Increase' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeInTheDocument();
  });

  test('steps with the chevrons and respects max', async () => {
    const user = userEvent.setup();
    const onValueChange = mock((_: number | null) => {});
    render(<NumberField label="Tab size" defaultValue={7} max={8} onValueChange={onValueChange} />);
    const up = screen.getByRole('button', { name: 'Increase' });
    await user.click(up);
    expect(onValueChange).toHaveBeenLastCalledWith(8);
    await user.click(up);
    expect(screen.getByRole('textbox', { name: 'Tab size' })).toHaveValue('8');
  });

  test('ArrowDown decrements', async () => {
    const user = userEvent.setup();
    render(<NumberField label="Zoom" defaultValue={2} />);
    const input = screen.getByRole('textbox', { name: 'Zoom' });
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveValue('1');
  });

  test('custom stepper labels and hidden stepper', () => {
    const { rerender } = render(
      <NumberField label="Indent" labels={{ increment: 'Plus', decrement: 'Minus' }} />,
    );
    expect(screen.getByRole('button', { name: 'Plus' })).toBeInTheDocument();
    rerender(<NumberField label="Indent" hideStepper />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
