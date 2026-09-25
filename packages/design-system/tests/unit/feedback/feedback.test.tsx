import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Badge } from '../../../src/components/feedback/badge';
import { Banner } from '../../../src/components/feedback/banner';
import { EmptyState } from '../../../src/components/feedback/empty-state';
import { ProgressBar } from '../../../src/components/feedback/progress-bar';
import { Skeleton } from '../../../src/components/feedback/skeleton';
import { Spinner } from '../../../src/components/feedback/spinner';

describe('Badge', () => {
  test('renders text with tone and optional dot', () => {
    const { container } = render(
      <Badge tone="success" dot>
        Passing
      </Badge>,
    );
    const badge = screen.getByText('Passing');
    expect(badge).toHaveAttribute('data-tone', 'success');
    expect(container.querySelector('[data-slot="badge-dot"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});

describe('ProgressBar', () => {
  test('determinate: progressbar role with value and label', () => {
    render(<ProgressBar value={40} label="Uploading" showValue />);
    const bar = screen.getByRole('progressbar', { name: 'Uploading' });
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(bar).toHaveAttribute('data-progressing');
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  test('indeterminate when value is null', () => {
    render(<ProgressBar aria-label="Indexing" />);
    const bar = screen.getByRole('progressbar', { name: 'Indexing' });
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(bar).toHaveAttribute('data-indeterminate');
  });

  test('complete at max', () => {
    render(<ProgressBar aria-label="Done" value={100} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-complete');
  });
});

describe('Spinner', () => {
  test('is a labelled status by default and hidden when decorative', () => {
    const { rerender, container } = render(<Spinner label="Syncing" />);
    expect(screen.getByRole('status', { name: 'Syncing' })).toBeInTheDocument();
    rerender(<Spinner decorative />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(container.querySelector('[data-slot="spinner"]')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Skeleton', () => {
  test('is hidden from assistive tech', () => {
    const { container } = render(<Skeleton shape="text" />);
    expect(container.querySelector('[data-slot="skeleton"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});

describe('EmptyState', () => {
  test('renders title, description and actions', () => {
    render(
      <EmptyState
        icon="codicon:inbox"
        title="No results"
        description="Try a different search."
        actions={<button type="button">Clear</button>}
      />,
    );
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('Try a different search.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });
});

describe('Banner', () => {
  test('info is a status, danger is an alert', () => {
    const { rerender } = render(<Banner title="Heads up">Body</Banner>);
    expect(screen.getByRole('status')).toHaveTextContent('Heads upBody');
    rerender(<Banner tone="danger" title="Failed" />);
    expect(screen.getByRole('alert')).toHaveAttribute('data-tone', 'danger');
  });

  test('dismiss button calls onDismiss', async () => {
    const user = userEvent.setup();
    const onDismiss = mock();
    render(
      <Banner tone="success" onDismiss={onDismiss} labels={{ dismiss: 'Close message' }}>
        Saved
      </Banner>,
    );
    await user.click(screen.getByRole('button', { name: 'Close message' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
