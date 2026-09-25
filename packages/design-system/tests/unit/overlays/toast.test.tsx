import { describe, expect, test } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, ToastViewport, useToast } from '../../../src/components/overlays/toast';

function Trigger() {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        toast.add({ title: 'Saved', description: 'main.tsx was written.', type: 'success' })
      }
    >
      Save
    </button>
  );
}

describe('Toast', () => {
  test('useToast().add shows a titled toast with a status icon; Close dismisses it', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider timeout={0}>
        <Trigger />
        <ToastViewport />
      </ToastProvider>,
    );
    expect(screen.getByRole('region', { name: /Notifications/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('main.tsx was written.')).toBeInTheDocument();
    const toast = document.querySelector('[data-slot="toast"]');
    expect(toast).toHaveAttribute('data-type', 'success');
    expect(toast?.querySelector('.codicon-pass-filled')).not.toBeNull();
    // Base UI hides the close button from assistive tech (toasts are dismissed via their region).
    const close = toast?.querySelector<HTMLElement>('[data-slot="toast-close"]');
    expect(close).toHaveAttribute('aria-label', 'Close');
    if (close) await user.click(close);
    await waitFor(() => expect(screen.queryByText('Saved')).toBeNull());
  });
});
