import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Breadcrumbs } from '../../../src/components/navigation/breadcrumbs';

describe('Breadcrumbs', () => {
  test('renders a named navigation landmark with the current page last', () => {
    render(
      <Breadcrumbs
        items={[
          { id: 'root', label: 'genslate', href: '#root' },
          { id: 'src', label: 'src', onSelect: () => {} },
          { id: 'file', label: 'main.tsx', icon: 'codicon:symbol-file' },
        ]}
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Breadcrumbs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'genslate' })).toHaveAttribute('href', '#root');
    expect(screen.getByText('main.tsx').closest('[aria-current]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  test('button segments call onSelect; labels are configurable', async () => {
    const user = userEvent.setup();
    const onSelect = mock(() => {});
    render(
      <Breadcrumbs
        labels={{ nav: 'Path' }}
        items={[
          { id: 'a', label: 'a', onSelect },
          { id: 'b', label: 'b' },
        ]}
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Path' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'a' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
