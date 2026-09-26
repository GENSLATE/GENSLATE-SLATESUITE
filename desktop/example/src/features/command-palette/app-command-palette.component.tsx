import { CommandPalette, type CommandPaletteItem, useTheme } from '@genslate/design-system';
import { SHOWCASE_GROUPS } from '../showcase/showcase.registry';

interface AppCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Navigates to a showcase page. */
  onNavigate: (sectionId: string) => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
}

/** ⌘K quick open: every showcase page plus app commands (theme, layout, settings). */
export function AppCommandPalette({
  open,
  onOpenChange,
  onNavigate,
  onToggleSidebar,
  onOpenSettings,
}: AppCommandPaletteProps) {
  const { setTheme, toggleTheme } = useTheme();

  const pages: CommandPaletteItem[] = SHOWCASE_GROUPS.flatMap((group) =>
    group.sections.map((section) => ({
      id: `page:${section.id}`,
      label: section.title,
      group: 'Components',
      icon: section.icon,
      detail: group.title,
      keywords: [group.title, section.description],
      onSelect: () => onNavigate(section.id),
    })),
  );

  const commands: CommandPaletteItem[] = [
    {
      id: 'theme:toggle',
      label: 'Toggle Theme',
      group: 'Commands',
      icon: 'codicon:color-mode',
      shortcut: 'mod+shift+l',
      keywords: ['dark', 'light', 'appearance'],
      onSelect: toggleTheme,
    },
    {
      id: 'theme:polar-night',
      label: 'Theme: Nord Polar Night',
      group: 'Commands',
      icon: 'codicon:color-mode',
      keywords: ['dark'],
      onSelect: () => setTheme('polar-night'),
    },
    {
      id: 'theme:snow-storm',
      label: 'Theme: Nord Snow Storm',
      group: 'Commands',
      icon: 'codicon:lightbulb',
      keywords: ['light'],
      onSelect: () => setTheme('snow-storm'),
    },
    {
      id: 'theme:system',
      label: 'Theme: Follow System',
      group: 'Commands',
      icon: 'codicon:vm',
      keywords: ['auto', 'os'],
      onSelect: () => setTheme('system'),
    },
    {
      id: 'view:sidebar',
      label: 'Toggle Sidebar',
      group: 'Commands',
      icon: 'codicon:layout-sidebar-left',
      shortcut: 'mod+b',
      onSelect: onToggleSidebar,
    },
    {
      id: 'view:settings',
      label: 'Open Appearance & About',
      group: 'Commands',
      icon: 'codicon:settings-gear',
      keywords: ['settings', 'preferences', 'version'],
      onSelect: onOpenSettings,
    },
  ];

  return (
    <CommandPalette
      open={open}
      onOpenChange={onOpenChange}
      items={[...commands, ...pages]}
      placeholder="Search components and commands…"
    />
  );
}
