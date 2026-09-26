import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
  ToolbarTextButton,
} from '../../../src/components/actions/toolbar';

describe('Toolbar', () => {
  test('exposes a labelled toolbar with one tab stop and arrow navigation', async () => {
    const user = userEvent.setup();
    const onBold = mock();
    render(
      <Toolbar aria-label="Formatting" variant="bar">
        <ToolbarGroup>
          <ToolbarButton label="Bold" icon="codicon:bold" onClick={onBold} />
          <ToolbarButton label="Italic" icon="codicon:italic" />
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarTextButton>Share</ToolbarTextButton>
      </Toolbar>,
    );
    expect(screen.getByRole('toolbar', { name: 'Formatting' })).toBeInTheDocument();
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Share' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(onBold).toHaveBeenCalledTimes(1);
  });
});
