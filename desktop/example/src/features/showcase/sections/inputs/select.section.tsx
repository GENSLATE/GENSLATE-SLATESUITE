import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectSeparator,
  SelectTrigger,
} from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';
import { StateMatrix } from '../../components/state-matrix.component';

const LANGUAGES = [
  { value: 'ts', label: 'TypeScript', group: 'Web', icon: 'codicon:symbol-namespace' as const },
  { value: 'css', label: 'CSS', group: 'Web', icon: 'codicon:symbol-color' as const },
  { value: 'html', label: 'HTML', group: 'Web', icon: 'codicon:code' as const },
  { value: 'rs', label: 'Rust', group: 'Systems', icon: 'codicon:gear' as const },
  { value: 'go', label: 'Go', group: 'Systems', icon: 'codicon:rocket' as const, disabled: true },
];

const FOCUS = 'border-accent shadow-[0_0_0_3px_var(--gs-color-focus-halo)]';

export function SelectSection() {
  return (
    <>
      <Specimen
        title="Select"
        description="A macOS pop-up button: the list opens over the trigger with the current value aligned."
        stageClassName="grid grid-cols-3 items-start gap-6"
        code={`<Select label="Language" options={languages} defaultValue="ts" />`}
      >
        <Select label="Language" options={LANGUAGES} defaultValue="ts" />
        <Select
          label="Encoding"
          placeholder="Choose…"
          options={[
            { value: 'utf8', label: 'UTF-8' },
            { value: 'utf16', label: 'UTF-16 LE' },
            { value: 'latin1', label: 'Western (ISO 8859-1)' },
          ]}
        />
        <Select
          label="Line endings"
          placeholder="Choose…"
          options={[
            { value: 'lf', label: 'LF' },
            { value: 'crlf', label: 'CRLF' },
          ]}
          error="Mixed line endings found."
        />
      </Specimen>

      <StateMatrix
        caption="Select trigger states"
        columns={['Rest', 'Hover', 'Focus', 'Placeholder', 'Invalid', 'Disabled']}
        rows={(['sm', 'md', 'lg'] as const).map((size) => ({
          label: size.toUpperCase(),
          cells: [
            <Select
              className="w-32"
              key="rest"
              aria-label="Rest"
              size={size}
              options={LANGUAGES}
              defaultValue="ts"
            />,
            <Select
              className="w-32"
              key="hover"
              aria-label="Hover"
              size={size}
              options={LANGUAGES}
              defaultValue="ts"
              triggerClassName="border-border-strong"
            />,
            <Select
              className="w-32"
              key="focus"
              aria-label="Focus"
              size={size}
              options={LANGUAGES}
              defaultValue="ts"
              triggerClassName={FOCUS}
            />,
            <Select
              className="w-32"
              key="placeholder"
              aria-label="Placeholder"
              size={size}
              options={LANGUAGES}
              placeholder="Choose…"
            />,
            <Select
              className="w-32"
              key="invalid"
              aria-label="Invalid"
              size={size}
              options={LANGUAGES}
              defaultValue="rs"
              invalid
            />,
            <Select
              className="w-32"
              key="disabled"
              aria-label="Disabled"
              size={size}
              options={LANGUAGES}
              defaultValue="ts"
              disabled
            />,
          ],
        }))}
      />

      <Specimen
        title="Compound parts"
        description="Compose the trigger, popup, groups and items yourself."
        stageClassName="items-start"
      >
        <div className="w-56">
          <Select
            aria-label="Font"
            defaultValue="inter"
            items={{ inter: 'Inter', sf: 'SF Pro', mono: 'JetBrains Mono', fira: 'Fira Code' }}
          >
            <SelectTrigger aria-label="Font" />
            <SelectPopup>
              <SelectGroup>
                <SelectGroupLabel>Proportional</SelectGroupLabel>
                <SelectItem value="inter">Inter</SelectItem>
                <SelectItem value="sf">SF Pro</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectGroupLabel>Monospace</SelectGroupLabel>
                <SelectItem value="mono">JetBrains Mono</SelectItem>
                <SelectItem value="fira">Fira Code</SelectItem>
              </SelectGroup>
            </SelectPopup>
          </Select>
        </div>
      </Specimen>
    </>
  );
}
