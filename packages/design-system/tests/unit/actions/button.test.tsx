import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../../src/components/actions/button';

describe('Button', () => {
  test('renders a named button with the default secondary variant', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('data-slot', 'button');
    expect(button).toHaveAttribute('data-variant', 'secondary');
    expect(button).toHaveAttribute('type', 'button');
  });

  test('fires onClick with mouse and keyboard', async () => {
    const user = userEvent.setup();
    const onClick = mock();
    render(<Button onClick={onClick}>Run</Button>);
    await user.click(screen.getByRole('button'));
    screen.getByRole('button').focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  test('disabled buttons do not fire', async () => {
    const user = userEvent.setup();
    const onClick = mock();
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('loading keeps focusability, sets aria-busy and blocks clicks', async () => {
    const user = userEvent.setup();
    const onClick = mock();
    render(
      <Button loading onClick={onClick}>
        Deploy
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Deploy' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('data-loading');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
    await user.tab();
    expect(button).toHaveFocus();
  });

  test('renders codicon leading and trailing icons', () => {
    const { container } = render(
      <Button leadingIcon="codicon:add" trailingIcon="codicon:chevron-down" variant="primary">
        New
      </Button>,
    );
    expect(container.querySelector('.codicon-add')).toBeInTheDocument();
    expect(container.querySelector('.codicon-chevron-down')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'primary');
  });
});
