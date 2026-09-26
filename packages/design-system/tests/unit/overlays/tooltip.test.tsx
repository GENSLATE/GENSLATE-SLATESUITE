import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip, TooltipProvider } from '../../../src/components/overlays/tooltip';

describe('Tooltip', () => {
  test('shows on keyboard focus with the text and formatted shortcut', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <Tooltip content="Save" shortcut="mod+s" platform="macos">
          <button type="button">Save file</button>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Save file' })).toHaveFocus();
    const tip = await screen.findByText('Save');
    expect(tip.closest('[data-slot="tooltip"]')).toBeInTheDocument();
    expect(screen.getByText('⌘S')).toBeInTheDocument();
  });

  test('is hidden until the trigger is hovered or focused', () => {
    render(
      <Tooltip content="Split editor">
        <button type="button">Split</button>
      </Tooltip>,
    );
    expect(screen.queryByText('Split editor')).toBeNull();
  });

  test('opens when controlled', () => {
    render(
      <Tooltip content="Pinned" open>
        <button type="button">Pin</button>
      </Tooltip>,
    );
    expect(screen.getByText('Pinned')).toBeInTheDocument();
  });
});
