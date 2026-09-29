import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogPopup,
  DialogTitle,
  NumberField,
  SegmentedControl,
  SegmentedControlItem,
  Select,
  type SelectOption,
  Switch,
  TextField,
  useTheme,
} from '@genslate/design-system';
import type { ReactNode } from 'react';

import { useTerminal } from '../../app/terminal.context';
import type { CursorStyle, Settings } from '../../ipc/terminal.types';
import { profileIcon } from '../tabs/profile-visual.util';

const LINE_HEIGHTS: readonly SelectOption<string>[] = ['1', '1.1', '1.2', '1.3', '1.4', '1.5'].map(
  (value) => ({ value, label: value === '1' ? '1.0 (tight)' : value }),
);

const SCROLLBACK: readonly SelectOption<string>[] = [1_000, 5_000, 10_000, 50_000, 100_000].map(
  (lines) => ({ value: String(lines), label: `${lines.toLocaleString()} lines` }),
);

const THEMES: readonly SelectOption<'polar-night' | 'snow-storm' | 'system'>[] = [
  { value: 'polar-night', label: 'Polar Night (dark)' },
  { value: 'snow-storm', label: 'Snow Storm (light)' },
  { value: 'system', label: 'Match the system' },
];

/** Terminal settings, saved to the app's config.toml (`[terminal]`) and applied at once. */
export function SettingsDialog() {
  const api = useTerminal();
  const { settings, updateSetting } = api;
  const { theme, setTheme } = useTheme();
  const toggle = (key: keyof Settings & BooleanKeys, label: string, description?: string) => (
    <Switch
      label={label}
      description={description}
      checked={settings[key]}
      onCheckedChange={(checked) => updateSetting(key, checked)}
    />
  );

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <DialogPopup size="md" showClose>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>
          Saved in the Terminal’s config.toml; shells you add there show up as profiles.
        </DialogDescription>
        <DialogBody className="flex flex-col gap-6">
          <Group title="Startup">
            <Select<string>
              label="Default shell"
              options={api.profiles.map((profile) => ({
                value: profile.id,
                label: profile.name,
                icon: profileIcon(profile.icon),
              }))}
              value={api.defaultProfileId}
              onValueChange={(value) =>
                value === null ? undefined : updateSetting('defaultProfile', value)
              }
            />
            {toggle(
              'restoreSession',
              'Restore the last session',
              'Reopen tabs, splits and folders with their recent output.',
            )}
          </Group>

          <Group title="Appearance">
            <Select
              label="Theme"
              options={THEMES}
              value={theme}
              onValueChange={(value) => (value === null ? undefined : setTheme(value))}
            />
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <TextField
                label="Font"
                placeholder="JetBrains Mono"
                defaultValue={settings.fontFamily}
                spellCheck={false}
                onBlur={(event) => {
                  const value = event.currentTarget.value.trim();
                  if (value !== settings.fontFamily) updateSetting('fontFamily', value);
                }}
              />
              <NumberField
                label="Size"
                min={8}
                max={32}
                step={1}
                value={settings.fontSize}
                onValueChange={(value) =>
                  value === null ? undefined : updateSetting('fontSize', value)
                }
                className="w-28"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select<string>
                label="Line height"
                options={LINE_HEIGHTS}
                value={String(settings.lineHeight)}
                onValueChange={(value) =>
                  value === null ? undefined : updateSetting('lineHeight', Number(value))
                }
              />
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-fg text-sm">Cursor</span>
                <SegmentedControl<CursorStyle>
                  aria-label="Cursor shape"
                  fullWidth
                  value={settings.cursorStyle}
                  onValueChange={(value) => updateSetting('cursorStyle', value)}
                >
                  <SegmentedControlItem value="block">Block</SegmentedControlItem>
                  <SegmentedControlItem value="bar">Bar</SegmentedControlItem>
                  <SegmentedControlItem value="underline">Underline</SegmentedControlItem>
                </SegmentedControl>
              </div>
            </div>
            {toggle('cursorBlink', 'Blinking cursor')}
          </Group>

          <Group title="Interaction">
            <div className="grid grid-cols-2 gap-3">
              <Select<string>
                label="Scrollback"
                options={SCROLLBACK}
                value={String(settings.scrollback)}
                onValueChange={(value) =>
                  value === null ? undefined : updateSetting('scrollback', Number(value))
                }
              />
              <Select<Settings['rightClick']>
                label="Right-click"
                options={[
                  { value: 'menu', label: 'Opens a menu' },
                  { value: 'paste', label: 'Copies or pastes' },
                ]}
                value={settings.rightClick}
                onValueChange={(value) =>
                  value === null ? undefined : updateSetting('rightClick', value)
                }
              />
            </div>
            {toggle('copyOnSelect', 'Copy on select')}
            {toggle(
              'pasteWarning',
              'Warn before risky pastes',
              'Several lines, sudo or rm -rf: check before it reaches the shell.',
            )}
            {toggle(
              'confirmClose',
              'Ask before closing a running program',
              'When a tab or pane still runs something.',
            )}
            <Switch
              label="Visual bell"
              description="Flash the pane when a program rings the bell."
              checked={settings.bell === 'visual'}
              onCheckedChange={(checked) => updateSetting('bell', checked ? 'visual' : 'none')}
            />
            {toggle(
              'notifyWhenDone',
              'Tell me when a long command finishes',
              'For commands over 10 seconds in a tab you are not looking at.',
            )}
          </Group>

          <Group title="Shell integration">
            {toggle(
              'shellIntegration',
              'Mark commands',
              'Adds marks next to each command, jumps between them and tracks the folder. New shells only.',
            )}
            {toggle(
              'history',
              'Keep command history',
              'Stored in the shared GENSLATE database in your portable folder.',
            )}
          </Group>
        </DialogBody>
        <DialogFooter>
          <DialogClose tone="primary">Done</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

type BooleanKeys = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

function Group({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold text-2xs text-fg-muted uppercase tracking-wider">{title}</h3>
      {children}
    </section>
  );
}
