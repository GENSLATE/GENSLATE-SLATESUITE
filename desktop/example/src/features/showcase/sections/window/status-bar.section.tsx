import { StatusBar, StatusBarItem, StatusBarSection } from '@genslate/design-system';
import { DemoWindow } from '../../components/demo-window.component';
import { Specimen } from '../../components/specimen.component';

function Example() {
  return (
    <StatusBar>
      <StatusBarSection>
        <StatusBarItem accent icon="codicon:remote" label="Open a remote window" onClick={() => undefined}>
          WSL: Ubuntu
        </StatusBarItem>
        <StatusBarItem icon="codicon:git-branch" label="Checkout branch" onClick={() => undefined}>
          main
        </StatusBarItem>
        <StatusBarItem icon="codicon:sync" label="Synchronize changes" onClick={() => undefined}>
          0↓ 2↑
        </StatusBarItem>
        <StatusBarItem icon="codicon:error" label="Problems" onClick={() => undefined}>
          0
        </StatusBarItem>
        <StatusBarItem icon="codicon:warning" label="Warnings" onClick={() => undefined}>
          3
        </StatusBarItem>
      </StatusBarSection>
      <StatusBarSection align="end">
        <StatusBarItem onClick={() => undefined} label="Go to line">
          Ln 42, Col 7
        </StatusBarItem>
        <StatusBarItem>Spaces: 2</StatusBarItem>
        <StatusBarItem>UTF-8</StatusBarItem>
        <StatusBarItem onClick={() => undefined} label="Select language mode">
          TypeScript JSX
        </StatusBarItem>
        <StatusBarItem icon="codicon:bell" label="Notifications" onClick={() => undefined} />
      </StatusBarSection>
    </StatusBar>
  );
}

export function StatusBarSectionPage() {
  return (
    <>
      <Specimen
        title="Status bar"
        description="24px, 12px text and 14px icons. Items with onClick are buttons; the accent item is the only coloured one."
        stageClassName="flex-col items-stretch gap-6 bg-surface-sunken p-8"
      >
        <DemoWindow label="Focused window">
          <div className="h-16 bg-canvas" />
          <Example />
        </DemoWindow>
        <DemoWindow inactive label="Inactive window">
          <div className="h-16 bg-canvas" />
          <Example />
        </DemoWindow>
      </Specimen>
    </>
  );
}
