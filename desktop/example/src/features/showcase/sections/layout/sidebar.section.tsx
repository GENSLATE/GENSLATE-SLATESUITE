import {
  Badge,
  IconButton,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarItem,
  SidebarSection,
} from '@genslate/design-system';
import { useState } from 'react';
import { DemoWindow } from '../../components/demo-window.component';
import { StateMatrix } from '../../components/state-matrix.component';
import { Specimen } from '../../components/specimen.component';

function SourceList({ label }: { label: string }) {
  const [selected, setSelected] = useState('src');
  const item = (id: string) => ({ selected: selected === id, onClick: () => setSelected(id) });
  return (
    <Sidebar aria-label={label}>
      <SidebarHeader
        title="Explorer"
        actions={<IconButton size="xs" icon="codicon:new-file" label="New file" />}
      />
      <SidebarContent>
        <SidebarSection title="Favorites">
          <SidebarItem icon="codicon:home" {...item('home')}>
            Home
          </SidebarItem>
          <SidebarItem icon="codicon:folder" {...item('src')} count={128}>
            src
          </SidebarItem>
          <SidebarItem icon="codicon:folder" depth={1} {...item('components')}>
            components
          </SidebarItem>
          <SidebarItem icon="codicon:folder" depth={1} {...item('styles')}>
            styles
          </SidebarItem>
          <SidebarItem icon="codicon:beaker" {...item('tests')} badge={<Badge size="sm" tone="success">pass</Badge>}>
            tests
          </SidebarItem>
        </SidebarSection>
        <SidebarSection title="Tags" defaultOpen={false}>
          <SidebarItem icon="codicon:tag">design</SidebarItem>
        </SidebarSection>
        <SidebarSection title="Locations">
          <SidebarItem icon="codicon:cloud" {...item('cloud')}>
            Cloud
          </SidebarItem>
          <SidebarItem icon="codicon:server" disabled>
            Offline server
          </SidebarItem>
        </SidebarSection>
      </SidebarContent>
    </Sidebar>
  );
}

export function SidebarSectionPage() {
  return (
    <>
      <Specimen
        title="Source list"
        description="28px rows, pill selection in the Frost selection colour, collapsible uppercase section titles."
        stageClassName="grid grid-cols-2 gap-8 bg-surface-sunken p-8"
      >
        <DemoWindow height={380} label="Focused window">
          <SourceList label="Focused sidebar" />
        </DemoWindow>
        <DemoWindow height={380} inactive label="Background window">
          <SourceList label="Background sidebar" />
        </DemoWindow>
      </Specimen>

      <StateMatrix
        caption="Sidebar item states"
        columns={['Rest', 'Hover', 'Pressed', 'Focus', 'Selected', 'Selected · inactive', 'Disabled']}
        rows={[
          {
            label: 'Item',
            cells: [
              <div key="rest" className="-mx-2 w-40 bg-surface-sidebar py-1"><SidebarItem icon="codicon:folder">Folder</SidebarItem></div>,
              <div key="hover" className="-mx-2 w-40 bg-surface-sidebar py-1"><SidebarItem icon="codicon:folder" className="bg-fill-hover">Folder</SidebarItem></div>,
              <div key="pressed" className="-mx-2 w-40 bg-surface-sidebar py-1"><SidebarItem icon="codicon:folder" className="bg-fill-pressed">Folder</SidebarItem></div>,
              <div key="focus" className="-mx-2 w-40 bg-surface-sidebar py-1"><SidebarItem icon="codicon:folder" className="outline-focus!">Folder</SidebarItem></div>,
              <div key="selected" className="-mx-2 w-40 bg-surface-sidebar py-1"><SidebarItem icon="codicon:folder" selected>Folder</SidebarItem></div>,
              <div key="inactive" data-window-focused="false" className="-mx-2 w-40 bg-surface-sidebar py-1"><SidebarItem icon="codicon:folder" selected>Folder</SidebarItem></div>,
              <div key="disabled" className="-mx-2 w-40 bg-surface-sidebar py-1"><SidebarItem icon="codicon:folder" disabled>Folder</SidebarItem></div>,
            ],
          },
        ]}
      />
    </>
  );
}
