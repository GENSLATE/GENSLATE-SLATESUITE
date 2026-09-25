import { ToggleButton, ToggleGroup } from '@genslate/design-system';
import { useState } from 'react';
import { Specimen } from '../../components/specimen.component';
import { StateMatrix } from '../../components/state-matrix.component';

export function ToggleButtonSection() {
  const [align, setAlign] = useState<string[]>(['left']);
  return (
    <>
      <Specimen
        title="Toggle group"
        description="Single choice with arrow-key roving focus, or multiple with `multiple`."
      >
        <ToggleGroup
          aria-label="Text alignment"
          value={align}
          onValueChange={(value) => value.length && setAlign(value)}
        >
          <ToggleButton value="left" icon="codicon:arrow-left" label="Align left" />
          <ToggleButton value="center" icon="codicon:arrow-both" label="Align centre" />
          <ToggleButton value="right" icon="codicon:arrow-right" label="Align right" />
        </ToggleGroup>
        <ToggleGroup aria-label="Formatting" multiple defaultValue={['bold']}>
          <ToggleButton value="bold" icon="codicon:bold" label="Bold" />
          <ToggleButton value="italic" icon="codicon:italic" label="Italic" />
          <ToggleButton value="case" icon="codicon:case-sensitive" label="Match case" />
          <ToggleButton value="regex" icon="codicon:regex" label="Use regular expression" />
        </ToggleGroup>
        <ToggleButton variant="secondary" icon="codicon:eye" defaultPressed>
          Preview
        </ToggleButton>
      </Specimen>

      <StateMatrix
        caption="Toggle button states"
        columns={['Off', 'Hover', 'On', 'Focus', 'Disabled', 'Disabled on']}
        rows={(['ghost', 'secondary'] as const).map((variant) => ({
          label: variant === 'ghost' ? 'Ghost' : 'Secondary',
          cells: [
            <ToggleButton key="off" variant={variant} icon="codicon:bold" label="Bold" />,
            <ToggleButton
              key="hover"
              variant={variant}
              icon="codicon:bold"
              label="Bold"
              className={
                variant === 'ghost'
                  ? 'bg-fill-hover text-fg-strong'
                  : 'bg-control-hover text-fg-strong'
              }
            />,
            <ToggleButton
              key="on"
              variant={variant}
              icon="codicon:bold"
              label="Bold"
              defaultPressed
            />,
            <ToggleButton
              key="focus"
              variant={variant}
              icon="codicon:bold"
              label="Bold"
              className="outline-focus!"
            />,
            <ToggleButton
              key="disabled"
              variant={variant}
              icon="codicon:bold"
              label="Bold"
              disabled
            />,
            <ToggleButton
              key="disabled-on"
              variant={variant}
              icon="codicon:bold"
              label="Bold"
              disabled
              defaultPressed
            />,
          ],
        }))}
      />
    </>
  );
}
