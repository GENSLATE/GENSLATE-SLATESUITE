import { describe, expect, mock, test } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import {
  CommandPalette,
  type CommandPaletteItem,
  filterCommands,
  fuzzyMatch,
} from '../../../src/components/overlays/command-palette';

function makeItems(onRun: (id: string) => void): CommandPaletteItem[] {
  return [
    {
      id: 'open',
      label: 'Open File…',
      group: 'File',
      shortcut: 'mod+o',
      onSelect: () => onRun('open'),
    },
    { id: 'save', label: 'Save', group: 'File', shortcut: 'mod+s', onSelect: () => onRun('save') },
    {
      id: 'theme',
      label: 'Toggle Theme',
      group: 'View',
      keywords: ['dark', 'light'],
      onSelect: () => onRun('theme'),
    },
    { id: 'zen', label: 'Zen Mode', group: 'View', disabled: true, onSelect: () => onRun('zen') },
    { id: 'reload', label: 'Reload Window', group: 'Developer', onSelect: () => onRun('reload') },
  ];
}

function Harness(props: { onRun: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <span data-testid="state">{open ? 'open' : 'closed'}</span>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        items={makeItems(props.onRun)}
        platform="macos"
      />
    </>
  );
}

const input = () => screen.getByRole('combobox', { name: 'Command palette' });
const focused = () =>
  waitFor(() => {
    if (document.activeElement !== input()) throw new Error('input is not focused yet');
  });
const active = () => {
  const id = input().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};

describe('CommandPalette', () => {
  test('renders a dialog with a combobox, grouped options and shortcut hints', async () => {
    render(<Harness onRun={() => {}} />);
    expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    await focused();
    expect(screen.getByRole('listbox', { name: 'Commands' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'View' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Open File/ })).toHaveTextContent('⌘O');
    expect(active()).toHaveTextContent('Open File…');
    expect(active()).toHaveAttribute('aria-selected', 'true');
  });

  test('ArrowDown/ArrowUp move the highlight, skipping disabled items and wrapping', async () => {
    const user = userEvent.setup();
    render(<Harness onRun={() => {}} />);
    await focused();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(active()).toHaveTextContent('Toggle Theme');
    await user.keyboard('{ArrowDown}');
    expect(active()).toHaveTextContent('Reload Window');
    await user.keyboard('{ArrowDown}');
    expect(active()).toHaveTextContent('Open File…');
    await user.keyboard('{ArrowUp}');
    expect(active()).toHaveTextContent('Reload Window');
  });

  test('typing filters (label or keywords) and Enter runs the highlighted command, then closes', async () => {
    const user = userEvent.setup();
    const onRun = mock((_: string) => {});
    render(<Harness onRun={onRun} />);
    await focused();
    await user.keyboard('dark');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(active()).toHaveTextContent('Toggle Theme');
    await user.keyboard('{Enter}');
    expect(onRun).toHaveBeenCalledWith('theme');
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });

  test('clicking an option runs it', async () => {
    const user = userEvent.setup();
    const onRun = mock((_: string) => {});
    render(<Harness onRun={onRun} />);
    await user.click(await screen.findByRole('option', { name: /Reload Window/ }));
    expect(onRun).toHaveBeenCalledWith('reload');
  });

  test('shows the empty state when nothing matches', async () => {
    const user = userEvent.setup();
    render(<Harness onRun={() => {}} />);
    await focused();
    await user.keyboard('qqqq');
    expect(screen.getByRole('status')).toHaveTextContent('No matching commands');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('fuzzyMatch / filterCommands', () => {
  test('ranks substrings and word starts above scattered matches', () => {
    expect(fuzzyMatch('save', 'Save')?.indices).toEqual([0, 1, 2, 3]);
    expect(fuzzyMatch('rw', 'Reload Window')?.indices).toEqual([0, 7]);
    expect(fuzzyMatch('xyz', 'Save')).toBeNull();
    const ranked = filterCommands(
      makeItems(() => {}),
      'o',
    ).map((match) => match.item.id);
    expect(ranked[0]).toBe('open');
  });
});
