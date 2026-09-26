import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tree, TreeItem } from '../../../src/components/navigation/tree';

function Files(props: {
  onSelect?: (id: string) => void;
  onAction?: (id: string) => void;
  onExpandedChange?: (ids: string[]) => void;
  defaultExpanded?: string[];
  selectionFollowsFocus?: boolean;
}) {
  return (
    <Tree
      aria-label="Explorer"
      defaultExpanded={props.defaultExpanded ?? ['src']}
      onSelect={props.onSelect}
      onAction={props.onAction}
      onExpandedChange={props.onExpandedChange}
      selectionFollowsFocus={props.selectionFollowsFocus}
    >
      <TreeItem id="src" label="src" icon="codicon:folder" expandedIcon="codicon:folder-opened">
        <TreeItem id="components" label="components" icon="codicon:folder">
          <TreeItem id="button" label="button.tsx" />
        </TreeItem>
        <TreeItem id="main" label="main.tsx" />
        <TreeItem id="locked" label="locked.ts" disabled />
      </TreeItem>
      <TreeItem id="readme" label="README.md" />
      <TreeItem id="package" label="package.json" />
    </Tree>
  );
}

const item = (name: string) => screen.getByRole('treeitem', { name: new RegExp(`^${name}`) });

describe('Tree', () => {
  test('exposes tree semantics: levels, expansion, roving tabindex', () => {
    render(<Files />);
    expect(screen.getByRole('tree', { name: 'Explorer' })).toBeInTheDocument();
    const src = item('src');
    expect(src).toHaveAttribute('aria-level', '1');
    expect(src).toHaveAttribute('aria-expanded', 'true');
    expect(src).toHaveAttribute('tabindex', '0');
    expect(item('components')).toHaveAttribute('aria-level', '2');
    expect(item('components')).toHaveAttribute('aria-expanded', 'false');
    expect(item('main.tsx')).not.toHaveAttribute('aria-expanded');
    expect(item('main.tsx')).toHaveAttribute('tabindex', '-1');
    expect(screen.queryByRole('treeitem', { name: 'button.tsx' })).toBeNull();
  });

  test('ArrowDown / ArrowUp / Home / End move focus through visible items', async () => {
    const user = userEvent.setup();
    render(<Files />);
    await user.tab();
    expect(item('src')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(item('components')).toHaveFocus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(item('locked.ts')).toHaveFocus();
    await user.keyboard('{End}');
    expect(item('package.json')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(item('README.md')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(item('src')).toHaveFocus();
    expect(item('src')).toHaveAttribute('tabindex', '0');
  });

  test('ArrowRight expands then enters; ArrowLeft collapses then goes to parent', async () => {
    const user = userEvent.setup();
    const onExpandedChange = mock((_: string[]) => {});
    render(<Files onExpandedChange={onExpandedChange} />);
    await user.tab();
    await user.keyboard('{ArrowDown}{ArrowRight}');
    expect(item('components')).toHaveAttribute('aria-expanded', 'true');
    expect(onExpandedChange).toHaveBeenLastCalledWith(['src', 'components']);
    await user.keyboard('{ArrowRight}');
    expect(item('button.tsx')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(item('components')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(item('components')).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{ArrowLeft}');
    expect(item('src')).toHaveFocus();
  });

  test('Enter and Space select; Enter also fires onAction', async () => {
    const user = userEvent.setup();
    const onSelect = mock((_: string) => {});
    const onAction = mock((_: string) => {});
    render(<Files onSelect={onSelect} onAction={onAction} />);
    await user.tab();
    await user.keyboard('{End} ');
    expect(onSelect).toHaveBeenLastCalledWith('package');
    expect(item('package.json')).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowUp}{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('readme');
    expect(onAction).toHaveBeenLastCalledWith('readme');
    expect(item('package.json')).toHaveAttribute('aria-selected', 'false');
  });

  test('clicking selects, and clicking a parent toggles it', async () => {
    const user = userEvent.setup();
    const onSelect = mock((_: string) => {});
    render(<Files onSelect={onSelect} />);
    await user.click(screen.getByText('components'));
    expect(onSelect).toHaveBeenLastCalledWith('components');
    expect(item('components')).toHaveAttribute('aria-expanded', 'true');
    expect(item('components')).toHaveFocus();
    await user.click(screen.getByText('button.tsx'));
    expect(onSelect).toHaveBeenLastCalledWith('button');
    expect(item('src')).toHaveAttribute('aria-expanded', 'true');
  });

  test('disabled items are focusable but not selectable', async () => {
    const user = userEvent.setup();
    const onSelect = mock((_: string) => {});
    render(<Files onSelect={onSelect} />);
    await user.click(screen.getByText('locked.ts'));
    expect(onSelect).not.toHaveBeenCalled();
    expect(item('locked.ts')).toHaveAttribute('aria-disabled', 'true');
  });

  test('type-ahead focuses the next matching item', async () => {
    const user = userEvent.setup();
    render(<Files />);
    await user.tab();
    await user.keyboard('r');
    expect(item('README.md')).toHaveFocus();
    await new Promise((resolve) => setTimeout(resolve, 550));
    await user.keyboard('ma');
    expect(item('main.tsx')).toHaveFocus();
  });

  test('selectionFollowsFocus selects while navigating', async () => {
    const user = userEvent.setup();
    const onSelect = mock((_: string) => {});
    render(<Files onSelect={onSelect} selectionFollowsFocus />);
    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(onSelect).toHaveBeenLastCalledWith('components');
  });

  test('* expands all sibling parents', async () => {
    const user = userEvent.setup();
    render(<Files defaultExpanded={[]} />);
    await user.tab();
    await user.keyboard('*');
    expect(item('src')).toHaveAttribute('aria-expanded', 'true');
  });
});
