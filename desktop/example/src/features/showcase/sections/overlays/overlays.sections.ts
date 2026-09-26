import type { ShowcaseSection } from '../../showcase.types';
import { AlertDialogSection } from './alert-dialog.section';
import { CommandPaletteSection } from './command-palette.section';
import { ContextMenuSection } from './context-menu.section';
import { DialogSection } from './dialog.section';
import { MenuSection } from './menu.section';
import { PopoverSection } from './popover.section';
import { ToastSection } from './toast.section';
import { TooltipSection } from './tooltip.section';

/** Showcase pages for the `overlays` category, in sidebar order. */
export const overlaysSections: readonly ShowcaseSection[] = [
  {
    id: 'tooltip',
    title: 'Tooltip',
    description: 'Small dark labels with an optional shortcut, grouped by a provider.',
    category: 'overlays',
    icon: 'codicon:comment',
    component: TooltipSection,
  },
  {
    id: 'popover',
    title: 'Popover',
    description: 'Anchored floating panels with the macOS surface.',
    category: 'overlays',
    icon: 'codicon:preview',
    component: PopoverSection,
  },
  {
    id: 'menu',
    title: 'Menu',
    description: 'Dropdown menus with icons, shortcuts, checks, radios and submenus.',
    category: 'overlays',
    icon: 'codicon:menu',
    component: MenuSection,
  },
  {
    id: 'context-menu',
    title: 'Context Menu',
    description: 'Right-click menus built from the same rows.',
    category: 'overlays',
    icon: 'codicon:list-unordered',
    component: ContextMenuSection,
  },
  {
    id: 'dialog',
    title: 'Dialog',
    description: 'Modal sheets with a scrim, three widths and footer actions.',
    category: 'overlays',
    icon: 'codicon:window',
    component: DialogSection,
  },
  {
    id: 'alert-dialog',
    title: 'Alert Dialog',
    description: 'Confirmations that require a decision, with a destructive tone.',
    category: 'overlays',
    icon: 'codicon:warning',
    component: AlertDialogSection,
  },
  {
    id: 'command-palette',
    title: 'Command Palette',
    description: 'VS Code quick open: fuzzy, grouped, keyboard-first.',
    category: 'overlays',
    icon: 'codicon:symbol-event',
    component: CommandPaletteSection,
  },
  {
    id: 'toast',
    title: 'Toast',
    description: 'Transient notifications stacked above the status bar.',
    category: 'overlays',
    icon: 'codicon:bell',
    component: ToastSection,
  },
];
