import { describe, expect, mock, test } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Popover,
  PopoverClose,
  PopoverDescription,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from '../../../src/components/overlays/popover';

function Example(props: { onOpenChange?: (open: boolean, details: unknown) => void }) {
  return (
    <Popover onOpenChange={props.onOpenChange}>
      <PopoverTrigger>Details</PopoverTrigger>
      <PopoverPopup arrow>
        <PopoverTitle>Branch</PopoverTitle>
        <PopoverDescription>main is 2 commits ahead.</PopoverDescription>
        <PopoverClose />
      </PopoverPopup>
    </Popover>
  );
}

describe('Popover', () => {
  test('opens a labelled dialog from its trigger', async () => {
    const user = userEvent.setup();
    const onOpenChange = mock((_: boolean, __?: unknown) => {});
    render(<Example onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole('button', { name: 'Details' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Branch' });
    expect(dialog).toHaveAccessibleDescription('main is 2 commits ahead.');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(onOpenChange.mock.calls.at(-1)?.[0]).toBe(true);
  });

  test('closes with the close button and with Escape', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Details' }));
    await user.click(await screen.findByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await user.click(screen.getByRole('button', { name: 'Details' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
