import { Button, IconButton, Tooltip, TooltipProvider } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';

export function TooltipSection() {
  return (
    <>
      <Specimen
        title="Toolbar tooltips"
        description="600ms before the first one; neighbours then show instantly (TooltipProvider)."
        code={`<Tooltip content="Split Editor" shortcut="mod+\\\\">\n  <IconButton label="Split Editor" icon="codicon:split-horizontal" />\n</Tooltip>`}
      >
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip content="New File" shortcut="mod+n">
              <IconButton label="New File" icon="codicon:new-file" tooltip={false} />
            </Tooltip>
            <Tooltip content="Split Editor" shortcut="mod+\\">
              <IconButton label="Split Editor" icon="codicon:split-horizontal" tooltip={false} />
            </Tooltip>
            <Tooltip content="Toggle Panel" shortcut="mod+j">
              <IconButton label="Toggle Panel" icon="codicon:layout-panel" tooltip={false} />
            </Tooltip>
            <Tooltip content="More Actions…">
              <IconButton label="More Actions" icon="codicon:ellipsis" tooltip={false} />
            </Tooltip>
          </div>
        </TooltipProvider>
      </Specimen>
      <Specimen
        title="Sides"
        description="Placement flips to stay on screen."
        stageClassName="gap-6 py-12"
      >
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <Tooltip key={side} content={`Tooltip on ${side}`} side={side}>
            <Button>{side}</Button>
          </Tooltip>
        ))}
      </Specimen>
    </>
  );
}
