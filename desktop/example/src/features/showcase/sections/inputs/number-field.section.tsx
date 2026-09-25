import { NumberField } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';
import { StateMatrix } from '../../components/state-matrix.component';

export function NumberFieldSection() {
  return (
    <>
      <Specimen
        title="Number field"
        description="Stacked stepper chevrons; ↑/↓ step, Shift steps by the large step."
        stageClassName="grid grid-cols-3 items-start gap-6"
        code={`<NumberField label="Tab size" defaultValue={4} min={1} max={8} />`}
      >
        <NumberField label="Tab size" defaultValue={4} min={1} max={8} />
        <NumberField label="Zoom" defaultValue={1.25} step={0.05} format={{ style: 'percent' }} />
        <NumberField
          label="Port"
          defaultValue={80}
          error="Ports below 1024 need elevated rights."
        />
      </Specimen>
      <StateMatrix
        caption="Number field states"
        columns={['Rest', 'At max', 'Invalid', 'Disabled', 'No stepper']}
        rows={(['sm', 'md', 'lg'] as const).map((size) => ({
          label: size.toUpperCase(),
          cells: [
            <NumberField className="w-36" key="rest" aria-label="Rest" size={size} defaultValue={12} />,
            <NumberField className="w-36" key="max" aria-label="At max" size={size} defaultValue={8} max={8} />,
            <NumberField className="w-36"
              key="invalid"
              aria-label="Invalid"
              size={size}
              defaultValue={-1}
              invalid
            />,
            <NumberField className="w-36"
              key="disabled"
              aria-label="Disabled"
              size={size}
              defaultValue={3}
              disabled
            />,
            <NumberField className="w-36" key="bare" aria-label="Bare" size={size} defaultValue={640} hideStepper />,
          ],
        }))}
      />
    </>
  );
}
