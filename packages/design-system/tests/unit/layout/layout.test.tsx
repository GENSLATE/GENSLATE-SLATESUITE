import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card, CardBody, CardHeader } from '../../../src/components/layout/card';
import { Panel, PanelBody, PanelHeader } from '../../../src/components/layout/panel';
import { ScrollArea } from '../../../src/components/layout/scroll-area';
import { Separator } from '../../../src/components/layout/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarItem,
  SidebarSection,
} from '../../../src/components/layout/sidebar';

describe('Sidebar', () => {
  test('is a labelled navigation with sections and current item', async () => {
    const user = userEvent.setup();
    const onSelect = mock();
    render(
      <Sidebar aria-label="Pages">
        <SidebarContent>
          <SidebarSection title="Components">
            <SidebarItem icon="codicon:symbol-color" selected>
              Colors
            </SidebarItem>
            <SidebarItem icon="codicon:text-size" count={12} onClick={onSelect}>
              Typography
            </SidebarItem>
            <SidebarItem disabled>Soon</SidebarItem>
          </SidebarSection>
        </SidebarContent>
      </Sidebar>,
    );
    expect(screen.getByRole('navigation', { name: 'Pages' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Components' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Colors' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /Typography/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByText('12')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Typography/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Soon' })).toBeDisabled();
  });

  test('collapsible section toggles with its title', async () => {
    const user = userEvent.setup();
    const onOpenChange = mock();
    render(
      <SidebarSection title="Recent" onOpenChange={onOpenChange}>
        <SidebarItem>One</SidebarItem>
      </SidebarSection>,
    );
    const trigger = screen.getByRole('button', { name: 'Recent' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('renders links with href', () => {
    render(
      <SidebarItem href="#colors" selected current="location">
        Colors
      </SidebarItem>,
    );
    expect(screen.getByRole('link', { name: 'Colors' })).toHaveAttribute(
      'aria-current',
      'location',
    );
  });
});

describe('Panel', () => {
  test('renders a region header with title and actions', () => {
    render(
      <Panel aria-label="Explorer">
        <PanelHeader title="Explorer" actions={<button type="button">New</button>} />
        <PanelBody>Body</PanelBody>
      </Panel>,
    );
    expect(screen.getByRole('region', { name: 'Explorer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Explorer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
  });
});

describe('Card', () => {
  test('renders header and body', () => {
    render(
      <Card variant="raised">
        <CardHeader title="Title" description="Description" />
        <CardBody>Content</CardBody>
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByText('Content').closest('[data-slot="card"]')).toHaveAttribute(
      'data-variant',
      'raised',
    );
  });
});

describe('Separator', () => {
  test('has separator role and orientation', () => {
    render(<Separator orientation="vertical" />);
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
  });
});

describe('ScrollArea', () => {
  test('labelled viewport becomes a focusable region', () => {
    render(
      <ScrollArea aria-label="Log">
        <p>Line</p>
      </ScrollArea>,
    );
    const region = screen.getByRole('region', { name: 'Log' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveTextContent('Line');
  });
});
