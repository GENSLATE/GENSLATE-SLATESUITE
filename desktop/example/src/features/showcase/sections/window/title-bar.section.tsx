import { IconButton, TitleBar, TitleBarCommandCenter } from '@genslate/design-system';
import { DemoWindow } from '../../components/demo-window.component';
import { PropsTable } from '../../components/props-table.component';
import { Specimen } from '../../components/specimen.component';

function Body() {
  return <div className="h-16 bg-canvas" />;
}

const actions = (
  <>
    <IconButton size="sm" icon="codicon:color-mode" label="Toggle theme" />
    <IconButton size="sm" icon="codicon:settings-gear" label="Settings" />
  </>
);

const leading = <IconButton size="sm" icon="codicon:layout-sidebar-left" label="Toggle sidebar" />;

export function TitleBarSection() {
  return (
    <>
      <Specimen
        title="Every platform"
        description="One titlebar on macOS, Windows and Linux: traffic lights on the left, drag regions in the empty areas. The platform only changes shortcut glyphs."
        stageClassName="flex-col items-stretch gap-6 bg-surface-sunken p-8"
      >
        <DemoWindow label="macOS titlebar">
          <TitleBar
            platform="macos"
            leading={leading}
            center={<TitleBarCommandCenter>genslate — Design Kit</TitleBarCommandCenter>}
            actions={actions}
          />
          <Body />
        </DemoWindow>
        <DemoWindow label="Windows and Linux titlebar">
          <TitleBar
            platform="windows"
            leading={leading}
            center={<TitleBarCommandCenter>Search components…</TitleBarCommandCenter>}
            actions={actions}
          />
          <Body />
        </DemoWindow>
      </Specimen>

      <Specimen
        title="States"
        description="A plain centred title, and the dimmed background-window state."
        stageClassName="flex-col items-stretch gap-6 bg-surface-sunken p-8"
      >
        <DemoWindow label="Title only">
          <TitleBar platform="linux" title="Untitled — GENSLATE" />
          <Body />
        </DemoWindow>
        <DemoWindow inactive label="Inactive window">
          <TitleBar
            platform="linux"
            isFocused={false}
            leading={leading}
            center={<TitleBarCommandCenter>Search components…</TitleBarCommandCenter>}
            actions={actions}
          />
          <Body />
        </DemoWindow>
      </Specimen>

      <PropsTable
        rows={[
          {
            name: 'platform',
            type: "'macos' | 'windows' | 'linux' | 'web'",
            default: 'context',
            description: 'Shortcut glyphs of children (⌘K vs Ctrl+K); the chrome is identical.',
          },
          {
            name: 'leading / center / actions',
            type: 'ReactNode',
            description: 'Slots: sidebar toggle, command center, icon buttons.',
          },
          {
            name: 'onMinimize · onToggleMaximize · onClose',
            type: '() => void',
            description: 'Wire to useWindowControls() from the bridge.',
          },
          {
            name: 'isFocused · isFullscreen',
            type: 'boolean',
            default: 'context',
            description: 'Window state; inactive windows dim the chrome and grey the lights.',
          },
          {
            name: 'doubleClickToMaximize',
            type: 'boolean',
            default: 'false',
            description:
              'Double-click on empty titlebar space (hosts without a native drag region).',
          },
        ]}
      />
    </>
  );
}
