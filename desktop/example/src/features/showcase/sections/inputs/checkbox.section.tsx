import { Checkbox, CheckboxGroup } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';
import { StateMatrix } from '../../components/state-matrix.component';

const HOVER = 'border-fg-muted';
const FOCUS = 'outline-focus!';

export function CheckboxSection() {
  return (
    <>
      <Specimen
        title="Checkbox"
        description="A crisp 14px box with an accent fill; the check springs in."
        stageClassName="flex-col items-start gap-3"
        code={`<Checkbox label="Word wrap" description="Wrap lines at the viewport width." />`}
      >
        <Checkbox
          label="Word wrap"
          description="Wrap long lines at the viewport width."
          defaultChecked
        />
        <Checkbox label="Render whitespace" />
        <Checkbox label="Format on save" disabled />
        <Checkbox label="I accept the licence" invalid />
      </Specimen>

      <StateMatrix
        caption="Checkbox states"
        columns={['Rest', 'Hover', 'Focus', 'Disabled', 'Invalid']}
        rows={[
          { label: 'Unchecked', checked: false, indeterminate: false },
          { label: 'Checked', checked: true, indeterminate: false },
          { label: 'Mixed', checked: false, indeterminate: true },
        ].map(({ label, checked, indeterminate }) => ({
          label,
          cells: [
            <Checkbox
              key="rest"
              aria-label="Rest"
              defaultChecked={checked}
              indeterminate={indeterminate}
            />,
            <Checkbox
              key="hover"
              aria-label="Hover"
              defaultChecked={checked}
              indeterminate={indeterminate}
              className={HOVER}
            />,
            <Checkbox
              key="focus"
              aria-label="Focus"
              defaultChecked={checked}
              indeterminate={indeterminate}
              className={FOCUS}
            />,
            <Checkbox
              key="disabled"
              aria-label="Disabled"
              defaultChecked={checked}
              indeterminate={indeterminate}
              disabled
            />,
            <Checkbox
              key="invalid"
              aria-label="Invalid"
              defaultChecked={checked}
              indeterminate={indeterminate}
              invalid
            />,
          ],
        }))}
      />

      <Specimen
        title="Checkbox group"
        description="Shared state, with a parent box that reflects a mixed selection."
        stageClassName="grid grid-cols-2 items-start gap-8"
      >
        <CheckboxGroup
          label="Show in editor"
          allValues={['minimap', 'breadcrumbs', 'sticky']}
          defaultValue={['minimap']}
        >
          <Checkbox parent label="All" />
          <Checkbox value="minimap" label="Minimap" className="pl-6" />
          <Checkbox value="breadcrumbs" label="Breadcrumbs" className="pl-6" />
          <Checkbox value="sticky" label="Sticky scroll" className="pl-6" />
        </CheckboxGroup>
        <CheckboxGroup label="Platforms" orientation="horizontal" defaultValue={['macos', 'linux']}>
          <Checkbox value="macos" label="macOS" />
          <Checkbox value="windows" label="Windows" />
          <Checkbox value="linux" label="Linux" />
        </CheckboxGroup>
      </Specimen>
    </>
  );
}
