import { ScrollArea, Separator } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';

const LINES = Array.from({ length: 40 }, (_, index) => `${String(index + 1).padStart(2, '0')}  [info] build step ${index + 1} completed`);

export function ScrollAreaSectionPage() {
  return (
    <>
      <Specimen
        title="Scroll area"
        description="Overlay scrollbars that appear on hover or while scrolling, with a hairline shadow once scrolled."
        stageClassName="grid grid-cols-2 gap-6"
      >
        <ScrollArea aria-label="Build log" className="h-56 rounded-card bg-surface-sunken inset-ring inset-ring-border-subtle">
          <pre className="m-0 px-3 py-2 font-mono text-code text-fg-secondary">{LINES.join('\n')}</pre>
        </ScrollArea>
        <ScrollArea
          orientation="both"
          aria-label="Wide table"
          className="h-56 rounded-card bg-surface-sunken inset-ring inset-ring-border-subtle"
        >
          <div className="grid w-[56rem] grid-cols-8 gap-2 p-3">
            {Array.from({ length: 96 }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static demo grid
              <div key={index} className="h-10 rounded-sm bg-fill-hover" />
            ))}
          </div>
        </ScrollArea>
      </Specimen>

      <Specimen title="Separator" description="1px hairlines, horizontal or vertical." stageClassName="flex-col items-stretch gap-4">
        <div className="flex flex-col gap-3 text-base text-fg-secondary">
          <span>Above</span>
          <Separator />
          <span>Below (subtle)</span>
          <Separator tone="default" />
          <span>Below (default)</span>
        </div>
        <div className="flex h-6 items-center gap-3 text-base text-fg-secondary">
          <span>Left</span>
          <Separator orientation="vertical" />
          <span>Middle</span>
          <Separator orientation="vertical" tone="default" />
          <span>Right</span>
        </div>
      </Specimen>
    </>
  );
}
