import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from '../../../src/components/inputs/checkbox';
import { CheckboxGroup } from '../../../src/components/inputs/checkbox-group';

describe('CheckboxGroup', () => {
  test('is a named group and tracks values', async () => {
    const user = userEvent.setup();
    const onValueChange = mock((_: string[]) => {});
    render(
      <CheckboxGroup label="Show" defaultValue={['minimap']} onValueChange={onValueChange}>
        <Checkbox value="minimap" label="Minimap" />
        <Checkbox value="breadcrumbs" label="Breadcrumbs" />
      </CheckboxGroup>,
    );
    expect(screen.getByRole('group', { name: 'Show' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Minimap' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(screen.getByRole('checkbox', { name: 'Breadcrumbs' }));
    expect(onValueChange).toHaveBeenLastCalledWith(['minimap', 'breadcrumbs']);
  });

  test('a parent checkbox reflects and toggles all children', async () => {
    const user = userEvent.setup();
    render(
      <CheckboxGroup label="Files" allValues={['a', 'b']} defaultValue={['a']}>
        <Checkbox parent label="All files" />
        <Checkbox value="a" label="A" />
        <Checkbox value="b" label="B" />
      </CheckboxGroup>,
    );
    const parent = screen.getByRole('checkbox', { name: 'All files' });
    expect(parent).toHaveAttribute('aria-checked', 'mixed');
    await user.click(parent);
    expect(screen.getByRole('checkbox', { name: 'B' })).toHaveAttribute('aria-checked', 'true');
  });
});
