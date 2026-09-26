import { describe, expect, mock, test } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from '../../../src/components/overlays/dialog';

function Example(props: { onOpenChange?: (open: boolean, details: unknown) => void }) {
  return (
    <Dialog onOpenChange={props.onOpenChange}>
      <DialogTrigger>Rename</DialogTrigger>
      <DialogPopup size="sm" showClose labels={{ close: 'Dismiss' }}>
        <DialogTitle>Rename file</DialogTitle>
        <DialogDescription>Choose a new name.</DialogDescription>
        <DialogBody>
          <input aria-label="Name" defaultValue="main.tsx" />
        </DialogBody>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <DialogClose tone="primary">Rename</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

describe('Dialog', () => {
  test('opens a modal dialog named by its title and described', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Rename' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rename file' });
    expect(dialog).toHaveAccessibleDescription('Choose a new name.');
    expect(dialog).toHaveAttribute('data-slot', 'dialog-popup');
    expect(document.querySelector('[data-slot="dialog-backdrop"]')).not.toBeNull();
  });

  test('Cancel, the corner button and Escape close it', async () => {
    const user = userEvent.setup();
    const onOpenChange = mock((_: boolean, __: unknown) => {});
    render(<Example onOpenChange={onOpenChange} />);
    const open = async () => {
      await user.click(screen.getByRole('button', { name: 'Rename' }));
      await screen.findByRole('dialog');
    };
    const closed = () => waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await open();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await closed();
    await open();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    await closed();
    await open();
    await user.keyboard('{Escape}');
    await closed();
    expect(onOpenChange.mock.calls.at(-1)?.[0]).toBe(false);
  });

  test('traps focus inside', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Rename' }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });
});
