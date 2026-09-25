import { describe, expect, mock, test } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectSeparator,
  SelectTrigger,
} from '../../../src/components/inputs/select';

const options = [
  { value: 'ts', label: 'TypeScript', group: 'Web' },
  { value: 'css', label: 'CSS', group: 'Web' },
  { value: 'rs', label: 'Rust', group: 'Systems' },
  { value: 'go', label: 'Go', group: 'Systems', disabled: true },
];

describe('Select', () => {
  test('simple API: labelled trigger with placeholder', () => {
    render(<Select label="Language" options={options} placeholder="Choose…" />);
    const trigger = screen.getByRole('combobox', { name: 'Language' });
    expect(trigger).toHaveTextContent('Choose…');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('opens, shows grouped options with the selection checked, and selects', async () => {
    const user = userEvent.setup();
    const onValueChange = mock((_: string | null) => {});
    render(
      <Select label="Language" options={options} defaultValue="ts" onValueChange={onValueChange} />,
    );
    const trigger = screen.getByRole('combobox', { name: 'Language' });
    expect(trigger).toHaveTextContent('TypeScript');
    await user.click(trigger);
    const listbox = await screen.findByRole('listbox');
    expect(listbox).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'TypeScript' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('group', { name: 'Systems' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Go' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('option', { name: 'Rust' }));
    expect(onValueChange).toHaveBeenLastCalledWith('rs');
    await waitFor(() => expect(trigger).toHaveTextContent('Rust'));
  });

  test('compound API with parts', async () => {
    const user = userEvent.setup();
    render(
      <Select
        aria-label="Encoding"
        defaultValue="utf8"
        items={{ utf8: 'UTF-8', latin1: 'Latin-1' }}
      >
        <SelectTrigger aria-label="Encoding" size="sm" />
        <SelectPopup>
          <SelectGroup>
            <SelectGroupLabel>Common</SelectGroupLabel>
            <SelectItem value="utf8">UTF-8</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectItem value="latin1" icon="codicon:globe">
            Latin-1
          </SelectItem>
        </SelectPopup>
      </Select>,
    );
    const trigger = screen.getByRole('combobox', { name: 'Encoding' });
    await user.click(trigger);
    expect(await screen.findByRole('option', { name: 'Latin-1' })).toBeInTheDocument();
    expect(document.querySelector('[data-slot="select-separator"]')).not.toBeNull();
  });

  test('shows an error and marks the trigger invalid', () => {
    render(<Select label="Branch" options={options} error="Pick a branch." />);
    expect(screen.getByRole('combobox', { name: 'Branch' })).toHaveAttribute('data-invalid');
    expect(screen.getByText('Pick a branch.')).toBeInTheDocument();
  });
});
