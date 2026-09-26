import {
  AppShell,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  Sidebar,
  SidebarContent,
  SidebarItem,
  SidebarSection,
  StatusBar,
  StatusBarItem,
  StatusBarSection,
  TitleBar,
  TitleBarCommandCenter,
} from '@genslate/design-system';
import { useState } from 'react';
import { DemoWindow } from '../../components/demo-window.component';
import { PropsTable } from '../../components/props-table.component';
import { Specimen } from '../../components/specimen.component';

export function AppShellSection() {
  const [selected, setSelected] = useState('inbox');
  const [collapsed, setCollapsed] = useState(false);
  const items = [
    { id: 'inbox', label: 'Inbox', icon: 'codicon:inbox', count: 12 },
    { id: 'drafts', label: 'Drafts', icon: 'codicon:edit', count: 2 },
    { id: 'archive', label: 'Archive', icon: 'codicon:archive' },
  ] as const;

  return (
    <>
      <Specimen
        title="Window layout"
        description="Titlebar · [sidebar | content | inspector] · status bar. Drag the sash or focus it and use ← →; Enter collapses."
        stageClassName="bg-surface-sunken p-8"
      >
        <DemoWindow height={420} label="AppShell demo">
          <AppShell
            defaultSidebarWidth={200}
            sidebarCollapsed={collapsed}
            onSidebarCollapsedChange={setCollapsed}
            titleBar={
              <TitleBar
                platform="linux"
                center={<TitleBarCommandCenter>Mail</TitleBarCommandCenter>}
                leading={null}
              />
            }
            sidebar={
              <Sidebar aria-label="Mailboxes">
                <SidebarContent>
                  <SidebarSection title="Mailboxes">
                    {items.map((item) => (
                      <SidebarItem
                        key={item.id}
                        icon={item.icon}
                        {...('count' in item ? { count: item.count } : {})}
                        selected={selected === item.id}
                        onClick={() => setSelected(item.id)}
                      >
                        {item.label}
                      </SidebarItem>
                    ))}
                  </SidebarSection>
                </SidebarContent>
              </Sidebar>
            }
            inspector={
              <Panel surface="sidebar" className="h-full">
                <PanelHeader title="Inspector" />
                <PanelBody className="px-3 text-fg-muted text-sm">
                  Details of the selection.
                </PanelBody>
              </Panel>
            }
            inspectorWidth={180}
            statusBar={
              <StatusBar>
                <StatusBarSection>
                  <StatusBarItem
                    icon={
                      collapsed ? 'codicon:layout-sidebar-left-off' : 'codicon:layout-sidebar-left'
                    }
                    label="Toggle sidebar"
                    onClick={() => setCollapsed(!collapsed)}
                  >
                    {collapsed ? 'Show sidebar' : 'Hide sidebar'}
                  </StatusBarItem>
                </StatusBarSection>
                <StatusBarSection align="end">
                  <StatusBarItem>Synced</StatusBarItem>
                </StatusBarSection>
              </StatusBar>
            }
          >
            <EmptyState
              className="flex-1"
              size="sm"
              icon="codicon:mail"
              title="No message selected"
              description="Pick a message from the list."
            />
          </AppShell>
        </DemoWindow>
      </Specimen>

      <PropsTable
        rows={[
          {
            name: 'titleBar · sidebar · inspector · statusBar',
            type: 'ReactNode',
            description: 'The regions; children render in <main>.',
          },
          {
            name: 'sidebarWidth / defaultSidebarWidth',
            type: 'number',
            default: '248',
            description: 'Clamped to sidebarMinWidth…sidebarMaxWidth (180…420).',
          },
          {
            name: 'sidebarCollapsed / defaultSidebarCollapsed',
            type: 'boolean',
            default: 'false',
            description: 'Dragging far past the minimum also collapses.',
          },
          {
            name: 'persistKey',
            type: 'string',
            description: 'Remembers width and collapsed state in localStorage.',
          },
        ]}
      />
    </>
  );
}
