import {
  ContextMenuItem,
  StatusBar,
  StatusBarItem,
  StatusBarSection,
  TextField,
  TitleBar,
  WindowContextMenu,
} from '@genslate/design-system';
import { useState } from 'react';
import { DemoWindow } from '../../components/demo-window.component';
import { Specimen } from '../../components/specimen.component';

const CODE = `<WindowContextMenu
  onMinimize={minimize}
  onToggleMaximize={toggleMaximize}
  onClose={close}
  onOpenLink={openExternal}
  allowNativeMenu={import.meta.env.DEV}
  items={(target) =>
    target.kind === 'titlebar' ? <ContextMenuItem>New Window</ContextMenuItem> : null
  }
>
  <AppShell … />
</WindowContextMenu>`;

export function WindowContextMenuSection() {
  const [last, setLast] = useState('Nothing yet');
  const log = (action: string) => () => setLast(action);

  return (
    <Specimen
      title="Window context menu"
      description="Right-click the titlebar, the text, the field, the link or a status item: the menu follows what is under the pointer. Shift+F10 opens it from the keyboard."
      aside={<span className="text-fg-muted text-sm">Last command: {last}</span>}
      stageClassName="flex-col items-stretch bg-surface-sunken p-8"
      code={CODE}
    >
      <WindowContextMenu
        onMinimize={log('Minimize')}
        onToggleMaximize={log('Zoom')}
        onClose={log('Close Window')}
        onOpenLink={(href) => setLast(`Open ${href}`)}
        items={(target) =>
          target.kind === 'titlebar' ? (
            <ContextMenuItem icon="codicon:empty-window" onClick={log('New Window')}>
              New Window
            </ContextMenuItem>
          ) : null
        }
      >
        <DemoWindow label="Window with a context menu" height={280}>
          <TitleBar title="Notes — Draft.md" />
          <div className="flex flex-1 select-text flex-col gap-4 bg-canvas p-6">
            <p className="text-base text-fg">
              Select part of this paragraph and right-click it to copy, or read the{' '}
              <a
                className="text-accent-fg underline"
                href="https://www.nordtheme.com/docs/colors-and-palettes"
              >
                Nord palette
              </a>{' '}
              notes.
            </p>
            <TextField
              aria-label="Title"
              defaultValue="Portable apps, everywhere"
              className="max-w-80"
            />
          </div>
          <StatusBar>
            <StatusBarSection>
              <StatusBarItem icon="codicon:source-control">main</StatusBarItem>
            </StatusBarSection>
            <StatusBarSection align="end">
              <StatusBarItem>Ln 12, Col 4</StatusBarItem>
              <StatusBarItem>UTF-8</StatusBarItem>
            </StatusBarSection>
          </StatusBar>
        </DemoWindow>
      </WindowContextMenu>
    </Specimen>
  );
}
