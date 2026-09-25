import { Radio, RadioGroup } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';
import { StateMatrix } from '../../components/state-matrix.component';

export function RadioGroupSection() {
  return (
    <>
      <Specimen
        title="Radio group"
        description="One choice; arrow keys move and select."
        stageClassName="grid grid-cols-2 items-start gap-8"
        code={`<RadioGroup label="Theme" defaultValue="system">\n  <Radio value="system" label="System" />\n</RadioGroup>`}
      >
        <RadioGroup label="Appearance" defaultValue="polar-night">
          <Radio value="system" label="System" description="Follow the OS setting." />
          <Radio value="polar-night" label="Polar Night" description="Nord dark." />
          <Radio value="snow-storm" label="Snow Storm" description="Nord light." />
          <Radio value="high-contrast" label="High contrast" disabled />
        </RadioGroup>
        <RadioGroup label="Indentation" orientation="horizontal" defaultValue="spaces">
          <Radio value="spaces" label="Spaces" />
          <Radio value="tabs" label="Tabs" />
        </RadioGroup>
      </Specimen>
      <StateMatrix
        caption="Radio states"
        columns={['Rest', 'Hover', 'Focus', 'Disabled']}
        rows={[
          { label: 'Unchecked', value: 'b' },
          { label: 'Checked', value: 'a' },
        ].map(({ label, value }) => ({
          label,
          cells: ['rest', 'hover', 'focus', 'disabled'].map((state) => (
            <RadioGroup
              key={state}
              aria-label={state}
              defaultValue={value}
              disabled={state === 'disabled'}
            >
              <Radio
                value="a"
                aria-label={label}
                className={
                  state === 'hover'
                    ? 'border-fg-muted'
                    : state === 'focus'
                      ? 'outline-focus!'
                      : undefined
                }
              />
            </RadioGroup>
          )),
        }))}
      />
    </>
  );
}
