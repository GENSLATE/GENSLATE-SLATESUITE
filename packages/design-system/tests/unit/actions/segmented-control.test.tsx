import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '../../../src/components/actions/segmented-control';

function View({ onValueChange }: { onValueChange?: (value: string) => void }) {
  return (
    <SegmentedControl aria-label="View" defaultValue="list" onValueChange={onValueChange}>
      <SegmentedControlItem value="list">List</SegmentedControlItem>
      <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
      <SegmentedControlItem value="columns">Columns</SegmentedControlItem>
    </SegmentedControl>
  );
}

describe('SegmentedControl', () => {
  test('selects the default segment and positions the thumb', () => {
    const { container } = render(<View />);
    expect(screen.getByRole('group', { name: 'View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    const root = container.querySelector<HTMLElement>('[data-slot="segmented-control"]');
    expect(root?.style.getPropertyValue('--segment-count')).toBe('3');
    expect(root?.style.getPropertyValue('--segment-index')).toBe('0');
  });

  test('clicking selects; clicking the selected segment keeps it selected', async () => {
    const user = userEvent.setup();
    const onValueChange = mock();
    const { container } = render(<View onValueChange={onValueChange} />);
    await user.click(screen.getByRole('button', { name: 'Columns' }));
    expect(onValueChange).toHaveBeenLastCalledWith('columns');
    expect(screen.getByRole('button', { name: 'Columns' })).toHaveAttribute('aria-pressed', 'true');
    const root = container.querySelector<HTMLElement>('[data-slot="segmented-control"]');
    expect(root?.style.getPropertyValue('--segment-index')).toBe('2');
    await user.click(screen.getByRole('button', { name: 'Columns' }));
    expect(screen.getByRole('button', { name: 'Columns' })).toHaveAttribute('aria-pressed', 'true');
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  test('arrow keys move focus and Enter selects', async () => {
    const user = userEvent.setup();
    render(<View />);
    await user.tab();
    expect(screen.getByRole('button', { name: 'List' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true');
  });
});
