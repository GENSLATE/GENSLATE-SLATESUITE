import { Fragment, type ReactNode } from 'react';
import { useTheme } from '../../../hooks/use-theme.hook';
import type { ThemePreference } from '../../../providers/theme/theme.types';
import type { Platform } from '../../../utils/platform.util';
import {
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSubmenuRoot,
  ContextMenuSubmenuTrigger,
} from '../../overlays/context-menu/context-menu-items.component';
import { MenuPopup } from '../../overlays/menu/menu-popup.component';
import type { TextCommand } from './text-edit.util';
import type {
  ContentContextTarget,
  FieldContextTarget,
  StatusbarContextTarget,
  WindowContextMenuLabels,
} from './window-context-menu.types';

export type ResolvedLabels = Readonly<Record<keyof WindowContextMenuLabels, string>>;

const DEFAULT_LABELS: ResolvedLabels = {
  undo: 'Undo',
  redo: 'Redo',
  cut: 'Cut',
  copy: 'Copy',
  paste: 'Paste',
  delete: 'Delete',
  selectAll: 'Select All',
  openLink: 'Open Link',
  copyLink: 'Copy Link Address',
  copyValue: 'Copy',
  theme: 'Theme',
  themeDark: 'Polar Night',
  themeLight: 'Snow Storm',
  themeSystem: 'Match System',
  minimize: 'Minimize',
  zoom: 'Zoom',
  maximize: 'Maximize',
  restore: 'Restore',
  close: 'Close Window',
};

/** The English defaults with the app's overrides applied. */
export function resolveLabels(labels: WindowContextMenuLabels | undefined): ResolvedLabels {
  const resolved: Record<keyof WindowContextMenuLabels, string> = { ...DEFAULT_LABELS };
  for (const key of Object.keys(DEFAULT_LABELS) as (keyof WindowContextMenuLabels)[]) {
    const label = labels?.[key];
    if (label !== undefined) resolved[key] = label;
  }
  return resolved;
}

/** Joins non-empty groups with separators. */
export function Sections({ children }: { children: readonly ReactNode[] }) {
  const groups = children.filter((group) => group != null && group !== false);
  return groups.map((group, index) => (
    // Groups never reorder while the menu is open, so their position is a stable key.
    // biome-ignore lint/suspicious/noArrayIndexKey: see above
    <Fragment key={index}>
      {index > 0 && <ContextMenuSeparator />}
      {group}
    </Fragment>
  ));
}

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'polar-night' || value === 'snow-storm' || value === 'system';

/** Theme ▸ Polar Night · Snow Storm · Match System. */
export function ThemeSubmenu({ labels }: { labels: ResolvedLabels }) {
  const { theme, setTheme } = useTheme();
  return (
    <ContextMenuSubmenuRoot>
      <ContextMenuSubmenuTrigger icon="codicon:color-mode">
        {labels.theme}
      </ContextMenuSubmenuTrigger>
      <MenuPopup>
        <ContextMenuRadioGroup
          value={theme}
          onValueChange={(value: unknown) => {
            if (isThemePreference(value)) setTheme(value);
          }}
        >
          <ContextMenuRadioItem value="polar-night">{labels.themeDark}</ContextMenuRadioItem>
          <ContextMenuRadioItem value="snow-storm">{labels.themeLight}</ContextMenuRadioItem>
          <ContextMenuRadioItem value="system">{labels.themeSystem}</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </MenuPopup>
    </ContextMenuSubmenuRoot>
  );
}

interface FieldItemsProps {
  target: FieldContextTarget;
  labels: ResolvedLabels;
  platform: Platform;
  canPaste: boolean;
  onCommand: (command: TextCommand) => void;
}

/** The standard Edit menu of a text box. */
export function FieldItems({ target, labels, platform, canPaste, onCommand }: FieldItemsProps) {
  const { readOnly, secret, empty } = target;
  const hasSelection = target.selectedText !== '';
  const row = (
    command: TextCommand,
    label: string,
    shortcut: string | undefined,
    disabled: boolean,
  ) => (
    <ContextMenuItem
      shortcut={shortcut}
      platform={platform}
      disabled={disabled}
      onClick={() => onCommand(command)}
    >
      {label}
    </ContextMenuItem>
  );
  return (
    <Sections>
      {[
        <>
          {row('undo', labels.undo, 'mod+z', readOnly)}
          {row('redo', labels.redo, platform === 'windows' ? 'mod+y' : 'mod+shift+z', readOnly)}
        </>,
        <>
          {row('cut', labels.cut, 'mod+x', readOnly || secret || !hasSelection)}
          {row('copy', labels.copy, 'mod+c', secret || !hasSelection)}
          {row('paste', labels.paste, 'mod+v', readOnly || !canPaste)}
          {row('delete', labels.delete, undefined, readOnly || !hasSelection)}
        </>,
        row('selectAll', labels.selectAll, 'mod+a', empty),
      ]}
    </Sections>
  );
}

interface ContentItemsProps {
  target: ContentContextTarget;
  labels: ResolvedLabels;
  platform: Platform;
  onOpenLink: ((href: string) => void) | undefined;
  onCopy: (text: string) => void;
  onSelectAll: () => void;
}

/** Whether `ContentItems` has any row for this target (so no stray separator is drawn). */
export const hasContentItems = ({
  link,
  selectedText,
  copyText,
  selectable,
}: ContentContextTarget) => link !== null || copyText !== null || selectable || selectedText !== '';

/** Link · copy · Select all, each only when it applies. */
export function ContentItems({
  target,
  labels,
  platform,
  onOpenLink,
  onCopy,
  onSelectAll,
}: ContentItemsProps) {
  const { link, selectedText, copyText, selectable } = target;
  return (
    <Sections>
      {[
        link !== null && (
          <>
            {onOpenLink !== undefined && (
              <ContextMenuItem icon="codicon:link-external" onClick={() => onOpenLink(link)}>
                {labels.openLink}
              </ContextMenuItem>
            )}
            <ContextMenuItem icon="codicon:link" onClick={() => onCopy(link)}>
              {labels.copyLink}
            </ContextMenuItem>
          </>
        ),
        copyText !== null && selectedText === '' && (
          <ContextMenuItem icon="codicon:copy" onClick={() => onCopy(copyText)}>
            {labels.copyValue} “{copyText}”
          </ContextMenuItem>
        ),
        (selectable || selectedText !== '') && (
          <>
            <ContextMenuItem
              icon="codicon:copy"
              shortcut="mod+c"
              platform={platform}
              disabled={selectedText === ''}
              onClick={() => onCopy(selectedText)}
            >
              {labels.copy}
            </ContextMenuItem>
            {selectable && (
              <ContextMenuItem
                icon="codicon:list-selection"
                shortcut="mod+a"
                platform={platform}
                onClick={onSelectAll}
              >
                {labels.selectAll}
              </ContextMenuItem>
            )}
          </>
        ),
      ]}
    </Sections>
  );
}

/** Copy the value of the status item under the pointer. */
export function StatusbarItems({
  target,
  labels,
  onCopy,
}: {
  target: StatusbarContextTarget;
  labels: ResolvedLabels;
  onCopy: (text: string) => void;
}) {
  const { copyText } = target;
  return (
    <ContextMenuItem
      icon="codicon:copy"
      disabled={copyText === null}
      onClick={() => {
        if (copyText !== null) onCopy(copyText);
      }}
    >
      {copyText === null ? labels.copy : `${labels.copyValue} “${copyText}”`}
    </ContextMenuItem>
  );
}

interface WindowItemsProps {
  labels: ResolvedLabels;
  platform: Platform;
  isMaximized: boolean;
  onMinimize: (() => void) | undefined;
  onToggleMaximize: (() => void) | undefined;
  onClose: (() => void) | undefined;
}

/** Minimize · Zoom / Maximize · Restore · Close — only the ones the app wired. */
export function WindowItems({
  labels,
  platform,
  isMaximized,
  onMinimize,
  onToggleMaximize,
  onClose,
}: WindowItemsProps) {
  const maximizeLabel =
    platform === 'macos' ? labels.zoom : isMaximized ? labels.restore : labels.maximize;
  return (
    <>
      {onMinimize !== undefined && (
        <ContextMenuItem icon="codicon:chrome-minimize" onClick={onMinimize}>
          {labels.minimize}
        </ContextMenuItem>
      )}
      {onToggleMaximize !== undefined && (
        <ContextMenuItem
          icon={isMaximized ? 'codicon:chrome-restore' : 'codicon:chrome-maximize'}
          onClick={onToggleMaximize}
        >
          {maximizeLabel}
        </ContextMenuItem>
      )}
      {onClose !== undefined && (
        <ContextMenuItem icon="codicon:chrome-close" onClick={onClose}>
          {labels.close}
        </ContextMenuItem>
      )}
    </>
  );
}
