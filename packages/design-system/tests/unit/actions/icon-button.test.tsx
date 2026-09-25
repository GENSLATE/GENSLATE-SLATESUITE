import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconButton } from '../../../src/components/actions/icon-button';

describe('IconButton', () => {
  test('uses label as accessible name and tooltip', () => {
    render(<IconButton label="Refresh" icon="codicon:refresh" />);
    const button = screen.getByRole('button', { name: 'Refresh' });
    expect(button).toHaveAttribute('title', 'Refresh');
    expect(button).not.toHaveAttribute('aria-pressed');
  });

  test('toggled sets aria-pressed', async () => {
    const user = userEvent.setup();
    const onClick = mock();
    const { rerender } = render(
      <IconButton label="Wrap" icon="codicon:word-wrap" toggled={false} onClick={onClick} />,
    );
    expect(screen.getByRole('button', { name: 'Wrap' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<IconButton label="Wrap" icon="codicon:word-wrap" toggled onClick={onClick} />);
    expect(screen.getByRole('button', { name: 'Wrap' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('tooltip can be disabled', () => {
    render(<IconButton label="Close" icon="codicon:close" tooltip={false} />);
    expect(screen.getByRole('button', { name: 'Close' })).not.toHaveAttribute('title');
  });
});
