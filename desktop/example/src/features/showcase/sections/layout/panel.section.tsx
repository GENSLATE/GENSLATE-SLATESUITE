import {
  Icon,
  IconButton,
  Panel,
  PanelBody,
  PanelFooter,
  PanelHeader,
} from '@genslate/design-system';
import { DemoWindow } from '../../components/demo-window.component';
import { Specimen } from '../../components/specimen.component';

const PROBLEMS = [
  {
    icon: 'codicon:error',
    tone: 'text-danger-fg',
    text: 'Property “tone” is missing',
    where: 'badge.tsx 12:4',
  },
  {
    icon: 'codicon:warning',
    tone: 'text-warning-fg',
    text: 'Unused import “useMemo”',
    where: 'app.tsx 3:10',
  },
  {
    icon: 'codicon:info',
    tone: 'text-info-fg',
    text: 'Prefer the render prop',
    where: 'menu.tsx 40:2',
  },
] as const;

export function PanelSectionPage() {
  return (
    <Specimen
      title="Panel"
      description="A 30px header with an uppercase title; actions appear on hover (or always, with actionsVisible)."
      stageClassName="grid grid-cols-2 gap-8 bg-surface-sunken p-8"
    >
      <DemoWindow height={220} label="Problems panel">
        <Panel className="h-full" aria-label="Problems">
          <PanelHeader
            title="Problems"
            actionsVisible
            actions={
              <>
                <IconButton size="xs" icon="codicon:filter" label="Filter" />
                <IconButton size="xs" icon="codicon:collapse-all" label="Collapse all" />
                <IconButton size="xs" icon="codicon:close" label="Close panel" />
              </>
            }
          />
          <PanelBody className="flex flex-col py-1">
            {PROBLEMS.map((problem) => (
              <div
                key={problem.text}
                className="flex h-row-sm items-center gap-2 px-3 text-base hover:bg-fill-hover"
              >
                <Icon name={problem.icon} className={problem.tone} />
                <span className="truncate-flex flex-1 text-fg">{problem.text}</span>
                <span className="text-fg-muted text-sm">{problem.where}</span>
              </div>
            ))}
          </PanelBody>
          <PanelFooter>3 problems</PanelFooter>
        </Panel>
      </DemoWindow>
      <DemoWindow height={220} label="Outline panel">
        <Panel surface="sidebar" className="h-full" aria-label="Outline">
          <PanelHeader
            title="Outline"
            actions={<IconButton size="xs" icon="codicon:ellipsis" label="More actions" />}
          />
          <PanelBody className="px-3 text-base text-fg-muted">
            Hover the panel to reveal its actions.
          </PanelBody>
        </Panel>
      </DemoWindow>
    </Specimen>
  );
}
