import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Icon } from '../../../src/components/display/icon';
import { TextField } from '../../../src/components/inputs/text-field';

describe('TextField', () => {
  test('associates the label and description with the input', () => {
    render(<TextField label="Project name" description="Shown in the title bar." />);
    const input = screen.getByRole('textbox', { name: 'Project name' });
    expect(input).toHaveAccessibleDescription('Shown in the title bar.');
  });

  test('reports typed values through onValueChange', async () => {
    const user = userEvent.setup();
    const onValueChange = mock((_: string) => {});
    render(<TextField label="Name" onValueChange={onValueChange} />);
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'abc');
    expect(onValueChange).toHaveBeenLastCalledWith('abc');
    expect(screen.getByRole('textbox')).toHaveValue('abc');
  });

  test('shows the error and marks the input invalid', () => {
    render(<TextField label="Email" error="Enter a valid email." />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter a valid email.')).toBeInTheDocument();
  });

  test('clear button empties the field and refocuses it', async () => {
    const user = userEvent.setup();
    const onClear = mock(() => {});
    render(<TextField label="Filter" defaultValue="src" clearable onClear={onClear} />);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    const input = screen.getByRole('textbox', { name: 'Filter' });
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  test('supports controlled usage and custom clear label', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState('x');
      return (
        <TextField
          aria-label="Query"
          value={value}
          onValueChange={setValue}
          clearable
          labels={{ clear: 'Löschen' }}
        />
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole('button', { name: 'Löschen' }));
    expect(screen.getByRole('textbox', { name: 'Query' })).toHaveValue('');
  });

  test('renders adornments and disabled state', () => {
    const { container } = render(
      <TextField
        aria-label="Path"
        disabled
        leading={<Icon name="codicon:folder" />}
        trailing="px"
        size="sm"
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Path' })).toBeDisabled();
    const control = container.querySelector('[data-slot="text-field-control"]');
    expect(control).toHaveAttribute('data-disabled');
    expect(control).toHaveAttribute('data-size', 'sm');
    expect(container.querySelector('[data-slot="text-field-leading"]')).not.toBeNull();
    expect(screen.getByText('px')).toBeInTheDocument();
  });
});
