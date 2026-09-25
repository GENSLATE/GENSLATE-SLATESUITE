import { Button, type ButtonVariant } from '@genslate/design-system';
import { useState } from 'react';
import { PropsTable } from '../../components/props-table.component';
import { Specimen } from '../../components/specimen.component';
import { StateMatrix } from '../../components/state-matrix.component';

const VARIANTS: readonly {
  variant: ButtonVariant;
  label: string;
  hover: string;
  pressed: string;
}[] = [
  { variant: 'primary', label: 'Primary', hover: 'bg-accent-hover', pressed: 'bg-accent-active' },
  {
    variant: 'secondary',
    label: 'Secondary',
    hover: 'bg-control-hover',
    pressed: 'bg-control-pressed',
  },
  { variant: 'ghost', label: 'Ghost', hover: 'bg-fill-hover', pressed: 'bg-fill-pressed' },
  { variant: 'danger', label: 'Danger', hover: 'bg-danger-hover', pressed: 'brightness-90' },
  {
    variant: 'link',
    label: 'Link',
    hover: 'underline underline-offset-2',
    pressed: 'underline underline-offset-2',
  },
];

const FOCUS = 'outline-focus!';

export function ButtonSection() {
  const [saving, setSaving] = useState(false);
  const save = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1600);
  };

  return (
    <>
      <Specimen
        title="Variants"
        description="Secondary is the default; one primary action per view."
        code={`<Button variant="primary" leadingIcon="codicon:check">Save</Button>`}
      >
        <Button variant="primary">Primary</Button>
        <Button>Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Delete</Button>
        <Button variant="link">Learn more</Button>
      </Specimen>

      <StateMatrix
        caption="Button states"
        columns={['Rest', 'Hover', 'Pressed', 'Focus', 'Disabled', 'Loading']}
        rows={VARIANTS.map(({ variant, label, hover, pressed }) => ({
          label,
          cells: [
            <Button key="rest" variant={variant}>
              {label}
            </Button>,
            <Button key="hover" variant={variant} className={hover}>
              {label}
            </Button>,
            <Button key="pressed" variant={variant} className={pressed}>
              {label}
            </Button>,
            <Button key="focus" variant={variant} className={FOCUS}>
              {label}
            </Button>,
            <Button key="disabled" variant={variant} disabled>
              {label}
            </Button>,
            <Button key="loading" variant={variant} loading>
              {label}
            </Button>,
          ],
        }))}
      />

      <Specimen title="Sizes" description="xs 20 · sm 24 · md 28 (default) · lg 32.">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
        <Button size="lg" variant="primary">
          Large primary
        </Button>
      </Specimen>

      <Specimen title="Icons, loading and width" stageClassName="flex-col items-start gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button leadingIcon="codicon:add">New file</Button>
          <Button trailingIcon="codicon:chevron-down">Branch</Button>
          <Button
            variant="primary"
            leadingIcon="codicon:cloud-upload"
            loading={saving}
            onClick={save}
          >
            Publish
          </Button>
          <Button variant="ghost" leadingIcon="codicon:refresh" size="sm">
            Refresh
          </Button>
        </div>
        <div className="w-72">
          <Button variant="primary" fullWidth>
            Continue
          </Button>
        </div>
      </Specimen>

      <PropsTable
        rows={[
          {
            name: 'variant',
            type: "'primary' | 'secondary' | 'ghost' | 'danger' | 'link'",
            default: "'secondary'",
            description: 'Visual weight.',
          },
          {
            name: 'size',
            type: "'xs' | 'sm' | 'md' | 'lg'",
            default: "'md'",
            description: 'Height 20 / 24 / 28 / 32.',
          },
          {
            name: 'loading',
            type: 'boolean',
            default: 'false',
            description: 'Spinner, keeps width, aria-busy, stays focusable.',
          },
          {
            name: 'leadingIcon · trailingIcon',
            type: 'CodiconRef | ReactNode',
            description: 'Icons sized to the button.',
          },
          {
            name: 'fullWidth',
            type: 'boolean',
            default: 'false',
            description: 'Stretch to the container.',
          },
        ]}
      />
    </>
  );
}
