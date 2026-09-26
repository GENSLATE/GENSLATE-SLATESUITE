import { Button, CommandPalette, type CommandPaletteItem, useToast } from '@genslate/design-system';
import { useState } from 'react';
import { Specimen } from '../../components/specimen.component';
import { ToastStage } from './toast-stage';

function useDemoItems(): CommandPaletteItem[] {
  const toast = useToast();
  const run = (label: string) => () =>
    toast.add({ title: label, description: 'Command executed.', type: 'info' });
  return [
    {
      id: 'open',
      label: 'Open File…',
      group: 'File',
      icon: 'codicon:go-to-file',
      shortcut: 'mod+p',
      onSelect: run('Open File'),
    },
    {
      id: 'new',
      label: 'New Window',
      group: 'File',
      icon: 'codicon:empty-window',
      shortcut: 'mod+shift+n',
      onSelect: run('New Window'),
    },
    {
      id: 'save-all',
      label: 'Save All',
      group: 'File',
      icon: 'codicon:save-all',
      shortcut: 'mod+alt+s',
      onSelect: run('Save All'),
    },
    {
      id: 'theme',
      label: 'Preferences: Color Theme',
      group: 'Preferences',
      icon: 'codicon:symbol-color',
      keywords: ['dark', 'light', 'nord'],
      shortcut: 'mod+k mod+t',
      onSelect: run('Color Theme'),
    },
    {
      id: 'settings',
      label: 'Preferences: Open Settings',
      group: 'Preferences',
      icon: 'codicon:settings-gear',
      shortcut: 'mod+,',
      onSelect: run('Settings'),
    },
    {
      id: 'keys',
      label: 'Preferences: Keyboard Shortcuts',
      group: 'Preferences',
      icon: 'codicon:record-keys',
      onSelect: run('Keyboard Shortcuts'),
    },
    {
      id: 'sidebar',
      label: 'View: Toggle Primary Side Bar',
      group: 'View',
      icon: 'codicon:layout-sidebar-left',
      shortcut: 'mod+b',
      onSelect: run('Toggle Side Bar'),
    },
    {
      id: 'zen',
      label: 'View: Toggle Zen Mode',
      group: 'View',
      icon: 'codicon:screen-full',
      disabled: true,
      onSelect: run('Zen Mode'),
    },
    {
      id: 'reload',
      label: 'Developer: Reload Window',
      group: 'Developer',
      icon: 'codicon:refresh',
      detail: 'workbench.action.reloadWindow',
      onSelect: run('Reload Window'),
    },
  ];
}

function CommandPaletteDemo() {
  const [open, setOpen] = useState(false);
  const items = useDemoItems();
  return (
    <Specimen
      title="Command palette"
      description="VS Code quick open: fuzzy search with highlighted matches, groups, shortcuts, ↑↓ / Enter / Esc."
      code={`<CommandPalette open={open} onOpenChange={setOpen} items={commands} />`}
    >
      <Button variant="primary" leadingIcon="codicon:search" onClick={() => setOpen(true)}>
        Show All Commands
      </Button>
      <CommandPalette open={open} onOpenChange={setOpen} items={items} />
    </Specimen>
  );
}

export function CommandPaletteSection() {
  return (
    <ToastStage>
      <CommandPaletteDemo />
    </ToastStage>
  );
}
