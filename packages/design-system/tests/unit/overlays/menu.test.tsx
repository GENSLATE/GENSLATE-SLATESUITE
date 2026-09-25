import { describe, expect, mock, test } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
  MenuTrigger,
} from '../../../src/components/overlays/menu';

function Example(props: {
  onNew?: () => void;
  onDelete?: () => void;
  onWrap?: (checked: boolean, details: unknown) => void;
}) {
  return (
    <Menu>
      <MenuTrigger>File</MenuTrigger>
      <MenuPopup>
        <MenuGroup>
          <MenuGroupLabel>Create</MenuGroupLabel>
          <MenuItem icon="codicon:new-file" shortcut="mod+n" platform="macos" onClick={props.onNew}>
            New File
          </MenuItem>
          <MenuItem disabled>Revert</MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuCheckboxItem defaultChecked onCheckedChange={props.onWrap}>
          Word Wrap
        </MenuCheckboxItem>
        <MenuRadioGroup defaultValue="spaces">
          <MenuRadioItem value="spaces">Spaces</MenuRadioItem>
          <MenuRadioItem value="tabs">Tabs</MenuRadioItem>
        </MenuRadioGroup>
        <MenuSubmenuRoot>
          <MenuSubmenuTrigger>Share</MenuSubmenuTrigger>
          <MenuPopup>
            <MenuItem>Copy Link</MenuItem>
          </MenuPopup>
        </MenuSubmenuRoot>
        <MenuItem tone="danger" onClick={props.onDelete}>
          Delete
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

describe('Menu', () => {
  test('opens a menu with items, shortcuts and a group label', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'File' });
    await user.click(trigger);
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: /New File/ })).toHaveTextContent('⌘N');
    expect(screen.getByRole('group', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Revert' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  test('activating an item calls onClick and closes', async () => {
    const user = userEvent.setup();
    const onNew = mock(() => {});
    render(<Example onNew={onNew} />);
    await user.click(screen.getByRole('button', { name: 'File' }));
    await user.click(await screen.findByRole('menuitem', { name: /New File/ }));
    expect(onNew).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  test('checkbox and radio items expose checked state', async () => {
    const user = userEvent.setup();
    const onWrap = mock((_: boolean, __?: unknown) => {});
    render(<Example onWrap={onWrap} />);
    await user.click(screen.getByRole('button', { name: 'File' }));
    const wrap = await screen.findByRole('menuitemcheckbox', { name: 'Word Wrap' });
    expect(wrap).toHaveAttribute('aria-checked', 'true');
    await user.click(wrap);
    expect(onWrap.mock.calls.at(-1)?.[0]).toBe(false);
    expect(screen.getByRole('menuitemradio', { name: 'Spaces' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(screen.getByRole('menuitemradio', { name: 'Tabs' }));
    expect(screen.getByRole('menuitemradio', { name: 'Tabs' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('keyboard: arrows move the highlight, Enter activates', async () => {
    const user = userEvent.setup();
    const onDelete = mock(() => {});
    render(<Example onDelete={onDelete} />);
    screen.getByRole('button', { name: 'File' }).focus();
    await user.keyboard('{ArrowDown}');
    await screen.findByRole('menu');
    await user.keyboard('{End}');
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveAttribute('data-highlighted'),
    );
    await user.keyboard('{Enter}');
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  test('submenu opens with ArrowRight', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'File' }));
    const share = await screen.findByRole('menuitem', { name: 'Share' });
    share.focus();
    await user.keyboard('{ArrowRight}');
    expect(await screen.findByRole('menuitem', { name: 'Copy Link' })).toBeInTheDocument();
    expect(share).toHaveAttribute('aria-expanded', 'true');
  });
});
