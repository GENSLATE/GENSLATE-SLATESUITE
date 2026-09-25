import { describe, expect, mock, test } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../src/components/overlays/alert-dialog';

describe('AlertDialog', () => {
  test('opens an alertdialog with a destructive action', async () => {
    const user = userEvent.setup();
    const onDelete = mock(() => {});
    render(
      <AlertDialog>
        <AlertDialogTrigger>Delete branch</AlertDialogTrigger>
        <AlertDialogPopup tone="danger">
          <AlertDialogTitle>Delete “feature/tree”?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogClose>Cancel</AlertDialogClose>
            <AlertDialogClose tone="danger" onClick={onDelete}>
              Delete
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>,
    );
    await user.click(screen.getByRole('button', { name: 'Delete branch' }));
    const alert = await screen.findByRole('alertdialog', { name: 'Delete “feature/tree”?' });
    expect(alert).toHaveAccessibleDescription('This cannot be undone.');
    expect(alert).toHaveAttribute('data-tone', 'danger');
    expect(document.querySelector('[data-slot="alert-dialog-icon"]')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  test('default tone has no icon unless one is given', async () => {
    render(
      <AlertDialog open>
        <AlertDialogPopup>
          <AlertDialogTitle>Save changes?</AlertDialogTitle>
        </AlertDialogPopup>
      </AlertDialog>,
    );
    await screen.findByRole('alertdialog');
    expect(document.querySelector('[data-slot="alert-dialog-icon"]')).toBeNull();
  });
});
