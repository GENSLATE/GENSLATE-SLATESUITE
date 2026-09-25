import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Radio, RadioGroup } from '../../../src/components/inputs/radio-group';

function Theme(props: { onValueChange?: (value: string) => void }) {
  return (
    <RadioGroup label="Theme" defaultValue="dark" onValueChange={props.onValueChange}>
      <Radio value="dark" label="Polar Night" />
      <Radio value="light" label="Snow Storm" description="Light" />
      <Radio value="auto" label="System" disabled />
    </RadioGroup>
  );
}

describe('RadioGroup', () => {
  test('renders a named radiogroup with the default selected', () => {
    render(<Theme />);
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Polar Night' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('selects on click and reports the value', async () => {
    const user = userEvent.setup();
    const onValueChange = mock((_: string) => {});
    render(<Theme onValueChange={onValueChange} />);
    await user.click(screen.getByRole('radio', { name: /Snow Storm/ }));
    expect(onValueChange).toHaveBeenLastCalledWith('light');
    expect(screen.getByRole('radio', { name: /Snow Storm/ })).toHaveAttribute('data-checked');
  });

  test('arrow keys move selection and skip disabled radios', async () => {
    const user = userEvent.setup();
    render(<Theme />);
    const dark = screen.getByRole('radio', { name: 'Polar Night' });
    dark.focus();
    await user.keyboard('{ArrowDown}');
    const light = screen.getByRole('radio', { name: /Snow Storm/ });
    expect(light).toHaveFocus();
    expect(light).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowDown}');
    expect(dark).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-disabled', 'true');
  });
});
