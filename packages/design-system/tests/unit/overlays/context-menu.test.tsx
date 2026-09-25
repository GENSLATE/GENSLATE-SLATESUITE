import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../../src/components/overlays/context-menu';

describe('ContextMenu', () => {
  test('opens on right-click and runs an item', async () => {
    const user = userEvent.setup();
    const onRename = mock(() => {});
    render(
      <ContextMenu>
        <ContextMenuTrigger>Right-click me</ContextMenuTrigger>
        <ContextMenuPopup>
          <ContextMenuItem icon="codicon:edit" shortcut="f2" onClick={onRename}>
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem>Show Hidden Files</ContextMenuCheckboxItem>
        </ContextMenuPopup>
      </ContextMenu>,
    );
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.contextMenu(screen.getByText('Right-click me'), { clientX: 20, clientY: 20 });
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitemcheckbox', { name: 'Show Hidden Files' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await user.click(screen.getByRole('menuitem', { name: /Rename/ }));
    expect(onRename).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });
});
