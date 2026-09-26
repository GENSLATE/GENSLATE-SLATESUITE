import { Switch } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';
import { StateMatrix } from '../../components/state-matrix.component';

export function SwitchSection() {
  return (
    <>
      <Specimen
        title="Settings rows"
        description="macOS settings style: label on the left, switch on the right."
        stageClassName="flex-col items-stretch gap-0 p-0"
        code={`<Switch label="Auto save" description="Save files after a delay." />`}
      >
        {[
          { label: 'Auto save', description: 'Save dirty files after one second.', on: true },
          { label: 'Telemetry', description: 'Send anonymous usage data.', on: false },
          {
            label: 'Experimental renderer',
            description: 'Requires a restart.',
            on: false,
            disabled: true,
          },
        ].map((row) => (
          <div key={row.label} className="hairline-b px-6 py-3 last:shadow-none">
            <Switch
              label={row.label}
              description={row.description}
              defaultChecked={row.on}
              disabled={row.disabled}
            />
          </div>
        ))}
      </Specimen>

      <StateMatrix
        caption="Switch states"
        columns={['Off', 'On', 'Focus', 'Disabled off', 'Disabled on']}
        rows={(['md', 'sm'] as const).map((size) => ({
          label: size === 'md' ? 'Medium' : 'Small',
          cells: [
            <Switch key="off" aria-label="Off" size={size} />,
            <Switch key="on" aria-label="On" size={size} defaultChecked />,
            <Switch
              key="focus"
              aria-label="Focus"
              size={size}
              defaultChecked
              className="outline-focus!"
            />,
            <Switch key="doff" aria-label="Disabled off" size={size} disabled />,
            <Switch key="don" aria-label="Disabled on" size={size} disabled defaultChecked />,
          ],
        }))}
      />

      <Specimen title="Label after" stageClassName="flex-col items-start gap-3">
        <Switch label="Show minimap" labelPosition="end" defaultChecked />
        <Switch label="Show breadcrumbs" labelPosition="end" />
      </Specimen>
    </>
  );
}
