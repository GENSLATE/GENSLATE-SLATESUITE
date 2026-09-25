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
        title="Platforms"
        description="Controls default by platform. The empty areas carry data-tauri-drag-region."
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
        <DemoWindow label="Linux titlebar">
          <TitleBar
            platform="linux"
            leading={leading}
            center={<TitleBarCommandCenter>Search components…</TitleBarCommandCenter>}
            actions={actions}
          />
          <Body />
        </DemoWindow>
        <DemoWindow label="Windows titlebar">
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
          { name: 'platform', type: "'macos' | 'windows' | 'linux' | 'web'", default: 'context', description: 'Chooses the default controls and shortcut glyphs.' },
          { name: 'controls', type: "'traffic-lights' | 'windows' | 'none'", default: 'by platform', description: 'macOS → none (native lights + 78px spacer).' },
          { name: 'leading / center / actions', type: 'ReactNode', description: 'Slots: sidebar toggle, command center, icon buttons.' },
          { name: 'onMinimize · onToggleMaximize · onClose', type: '() => void', description: 'Wire to useWindowControls() from the bridge.' },
          { name: 'isFocused · isMaximized · isFullscreen', type: 'boolean', default: 'context', description: 'Window state; inactive windows dim the chrome.' },
          { name: 'doubleClickToMaximize', type: 'boolean', default: 'not macOS', description: 'Double-click on empty titlebar space.' },
        ]}
      />
    </>
  );
}
