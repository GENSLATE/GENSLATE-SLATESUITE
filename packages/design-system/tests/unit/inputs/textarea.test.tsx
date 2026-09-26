import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from '../../../src/components/inputs/textarea';

describe('Textarea', () => {
  test('renders a labelled multi-line textbox', () => {
    render(<Textarea label="Commit message" minRows={4} />);
    const box = screen.getByRole('textbox', { name: 'Commit message' });
    expect(box.tagName).toBe('TEXTAREA');
    expect(box).toHaveAttribute('rows', '4');
  });

  test('reports edits', async () => {
    const user = userEvent.setup();
    const onValueChange = mock((_: string) => {});
    render(<Textarea label="Notes" onValueChange={onValueChange} autoGrow />);
    await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'hi{Enter}there');
    expect(onValueChange).toHaveBeenLastCalledWith('hi\nthere');
  });

  test('marks the invalid state and shows the error', () => {
    render(<Textarea label="Body" error="Required." />);
    const box = screen.getByRole('textbox', { name: 'Body' });
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('Required.');
  });

  test('disables the textarea', () => {
    render(<Textarea label="Body" disabled />);
    expect(screen.getByRole('textbox', { name: 'Body' })).toBeDisabled();
  });
});
