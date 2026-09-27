import {
  Badge,
  Banner,
  Button,
  Checkbox,
  IconButton,
  Kbd,
  ProgressBar,
  Radio,
  RadioGroup,
  SearchField,
  SegmentedControl,
  SegmentedControlItem,
  Select,
  Slider,
  StatusBar,
  StatusBarItem,
  StatusBarSection,
  Switch,
  Tab,
  Tabs,
  TabsList,
  TabsPanel,
  TextField,
  TitleBar,
  useTheme,
  useToast,
} from '@genslate/design-system';
import { type ReactNode, useState } from 'react';

import { useIsClient } from '../../components/use-is-client.hook';

function Panel({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border-subtle bg-surface-panel p-4">
      <h3 className="font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">{title}</h3>
      {children}
    </section>
  );
}

/**
 * A real, interactive GENSLATE window made of design-system components. The slider drives the
 * progress bar, the switch drives the loading state, and the theme control is the site's own.
 */
export function ComponentPlayground() {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();
  const [volume, setVolume] = useState(64);
  const [busy, setBusy] = useState(false);

  return (
    <div className="overflow-hidden rounded-window border border-border-subtle bg-canvas shadow-dialog">
      <TitleBar
        platform="macos"
        controls="traffic-lights"
        isFocused
        title="Design Kit — Playground"
        actions={
          <>
            <IconButton label="Search" icon="codicon:search" size="sm" />
            <IconButton label="Settings" icon="codicon:settings-gear" size="sm" />
          </>
        }
      />
      <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Actions">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" leadingIcon="codicon:check" loading={busy}>
              Save
            </Button>
            <Button>Cancel</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Delete</Button>
          </div>
          <div className="flex items-center gap-1">
            <IconButton label="New file" icon="codicon:new-file" tooltipShortcut="mod+n" />
            <IconButton label="Split editor" icon="codicon:split-horizontal" />
            <IconButton label="Bold" icon="codicon:bold" toggled />
            <IconButton label="Refresh" icon="codicon:refresh" />
          </div>
          <Switch label="Show loading state" checked={busy} onCheckedChange={setBusy} />
          <Button
            variant="secondary"
            leadingIcon="codicon:bell"
            onClick={() =>
              toast.add({
                title: 'Build succeeded',
                description: 'genslate-page in 1.8s',
                type: 'success',
              })
            }
          >
            Show a toast
          </Button>
        </Panel>

        <Panel title="Inputs">
          <TextField label="Display name" placeholder="Ada Lovelace" clearable />
          <SearchField
            aria-label="Search files"
            placeholder="Search files"
            shortcut="mod+f"
            platform="macos"
          />
          <Select
            label="Language"
            defaultValue="ts"
            options={[
              { value: 'ts', label: 'TypeScript', icon: 'codicon:symbol-namespace' },
              { value: 'rs', label: 'Rust', icon: 'codicon:gear' },
              { value: 'md', label: 'Markdown', icon: 'codicon:markdown' },
            ]}
          />
        </Panel>

        <Panel title="Choices">
          <SegmentedControl
            aria-label="Theme"
            size="sm"
            value={isClient ? theme : 'system'}
            onValueChange={(value) => setTheme(value as 'system' | 'polar-night' | 'snow-storm')}
          >
            <SegmentedControlItem value="system">System</SegmentedControlItem>
            <SegmentedControlItem value="polar-night">Polar Night</SegmentedControlItem>
            <SegmentedControlItem value="snow-storm">Snow Storm</SegmentedControlItem>
          </SegmentedControl>
          <RadioGroup label="Indentation" orientation="horizontal" defaultValue="spaces">
            <Radio value="spaces" label="Spaces" />
            <Radio value="tabs" label="Tabs" />
          </RadioGroup>
          <Checkbox label="Format on save" description="Runs Biome and rustfmt" defaultChecked />
        </Panel>

        <Panel title="Values">
          <Slider label="Volume" showValue value={volume} onValueChange={setVolume} />
          <ProgressBar label="Uploading" showValue value={volume} />
          <ProgressBar aria-label="Indexing" size="sm" />
        </Panel>

        <Panel title="Status">
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">Accent</Badge>
            <Badge tone="success" dot>
              Running
            </Badge>
            <Badge tone="warning">3 warnings</Badge>
            <Badge tone="danger" variant="solid">
              Failed
            </Badge>
            <Badge tone="info" pill>
              12
            </Badge>
          </div>
          <Banner tone="success" title="All checks passed">
            Biome, tsc, cspell and clippy are green.
          </Banner>
          <p className="flex flex-wrap items-center gap-2 text-fg-muted text-sm">
            Command palette <Kbd shortcut="mod+shift+p" platform="macos" />
          </p>
        </Panel>

        <Panel title="Navigation">
          <Tabs defaultValue="problems" className="-mx-1">
            <TabsList aria-label="Panel">
              <Tab value="problems" icon="codicon:warning">
                Problems
              </Tab>
              <Tab value="output" icon="codicon:output">
                Output
              </Tab>
              <Tab value="terminal" icon="codicon:terminal">
                Terminal
              </Tab>
            </TabsList>
            <TabsPanel value="problems" className="px-2 py-4 text-fg-muted">
              No problems have been detected in the workspace.
            </TabsPanel>
            <TabsPanel value="output" className="px-2 py-4 font-mono text-fg-muted text-sm">
              [info] Build finished in 1.4s.
            </TabsPanel>
            <TabsPanel value="terminal" className="px-2 py-4 font-mono text-fg-muted text-sm">
              zsh — ~/genslate
            </TabsPanel>
          </Tabs>
        </Panel>
      </div>
      <StatusBar>
        <StatusBarSection>
          <StatusBarItem accent icon="codicon:remote">
            GENSLATE
          </StatusBarItem>
          <StatusBarItem icon="codicon:check">Ready</StatusBarItem>
        </StatusBarSection>
        <StatusBarSection align="end">
          <StatusBarItem icon="codicon:unmute">{volume}%</StatusBarItem>
          <StatusBarItem>Base UI 1.8 · Tailwind v4</StatusBarItem>
        </StatusBarSection>
      </StatusBar>
    </div>
  );
}
