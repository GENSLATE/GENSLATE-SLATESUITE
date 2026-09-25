import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tab, Tabs, TabsList, TabsPanel } from '../../../src/components/navigation/tabs';

function Example(props: {
  variant?: 'underline' | 'pill';
  onValueChange?: (value: unknown) => void;
}) {
  return (
    <Tabs variant={props.variant} defaultValue="problems" onValueChange={props.onValueChange}>
      <TabsList aria-label="Panel">
        <Tab value="problems" icon="codicon:warning">
          Problems
        </Tab>
        <Tab value="output">Output</Tab>
        <Tab value="terminal" disabled>
          Terminal
        </Tab>
        <Tab value="ports">Ports</Tab>
      </TabsList>
      <TabsPanel value="problems">No problems</TabsPanel>
      <TabsPanel value="output">Build output</TabsPanel>
      <TabsPanel value="terminal">Shell</TabsPanel>
      <TabsPanel value="ports">Forwarded ports</TabsPanel>
    </Tabs>
  );
}

describe('Tabs', () => {
  test('renders a tablist with the default tab selected and its panel', () => {
    render(<Example />);
    expect(screen.getByRole('tablist', { name: 'Panel' })).toBeInTheDocument();
    const problems = screen.getByRole('tab', { name: 'Problems' });
    expect(problems).toHaveAttribute('aria-selected', 'true');
    expect(problems).toHaveAttribute('data-active');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('No problems');
  });

  test('clicking a tab activates it', async () => {
    const user = userEvent.setup();
    const onValueChange = mock((_: unknown) => {});
    render(<Example onValueChange={onValueChange} />);
    await user.click(screen.getByRole('tab', { name: 'Output' }));
    expect(onValueChange).toHaveBeenCalled();
    expect(onValueChange.mock.calls.at(-1)?.[0]).toBe('output');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Build output');
  });

  test('arrow keys move focus (disabled tabs stay focusable but inert); Enter activates', async () => {
    const user = userEvent.setup();
    render(<Example variant="pill" />);
    await user.click(screen.getByRole('tab', { name: 'Output' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Terminal' }) === document.activeElement).toBe(true);
    await user.keyboard('{Enter}');
    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'false');
    await user.keyboard('{ArrowRight}');
    const ports = screen.getByRole('tab', { name: 'Ports' });
    expect(ports).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(ports).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Problems' })).toHaveFocus();
  });

  test('exposes the variant and renders the indicator', () => {
    const { container } = render(<Example variant="pill" />);
    expect(container.querySelector('[data-slot="tabs"]')).toHaveAttribute('data-variant', 'pill');
    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('data-disabled');
  });
});
