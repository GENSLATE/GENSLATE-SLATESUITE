import {
  Badge,
  IconButton,
  Kbd,
  Panel,
  PanelBody,
  PanelHeader,
  SegmentedControl,
  SegmentedControlItem,
  Separator,
  type ThemePreference,
  usePlatform,
  useTheme,
} from '@genslate/design-system';
import { isTauri } from '@genslate/tauri-bridge';
import type { ReactNode } from 'react';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-fg-muted">{label}</span>
      <span className="text-fg">{children}</span>
    </div>
  );
}

/** The right-hand inspector: appearance settings, shortcuts and about. */
export function SettingsInspector({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const platform = usePlatform();

  return (
    <Panel surface="sidebar" className="h-full" aria-label="Appearance">
      <PanelHeader
        title="Appearance"
        actionsVisible
        actions={<IconButton size="sm" icon="codicon:close" label="Close inspector" onClick={onClose} />}
      />
      <PanelBody className="flex flex-col gap-5 overflow-y-auto scrollbar-thin px-3 pt-1 pb-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg">Theme</span>
          <SegmentedControl<ThemePreference>
            aria-label="Theme"
            size="sm"
            fullWidth
            value={theme}
            onValueChange={setTheme}
          >
            <SegmentedControlItem value="polar-night">Dark</SegmentedControlItem>
            <SegmentedControlItem value="snow-storm">Light</SegmentedControlItem>
            <SegmentedControlItem value="system">Auto</SegmentedControlItem>
          </SegmentedControl>
          <p className="text-xs text-fg-muted">Official Nord: Polar Night (dark) and Snow Storm (light).</p>
        </div>
        <Separator />
        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-medium text-fg">Shortcuts</span>
          <Row label="Command palette">
            <Kbd shortcut="mod+k" size="sm" />
          </Row>
          <Row label="Toggle sidebar">
            <Kbd shortcut="mod+b" size="sm" />
          </Row>
          <Row label="Toggle theme">
            <Kbd shortcut="mod+shift+l" size="sm" />
          </Row>
        </div>
        <Separator />
        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-medium text-fg">About</span>
          <Row label="Runtime">
            <Badge size="sm" tone={isTauri() ? 'accent' : 'neutral'}>
              {isTauri() ? 'Tauri' : 'Browser'}
            </Badge>
          </Row>
          <Row label="Platform">{platform}</Row>
          <Row label="Components">Base UI 1.8</Row>
          <Row label="Styling">Tailwind CSS 4</Row>
        </div>
      </PanelBody>
    </Panel>
  );
}
