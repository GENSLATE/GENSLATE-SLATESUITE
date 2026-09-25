import { Icon, TextField } from '@genslate/design-system';
import { useState } from 'react';
import { PropsTable } from '../../components/props-table.component';
import { Specimen } from '../../components/specimen.component';
import { StateMatrix } from '../../components/state-matrix.component';

const HOVER = 'border-border-strong';
const FOCUS = 'border-accent shadow-[0_0_0_3px_var(--gs-color-focus-halo)]';
const SIZES = ['sm', 'md', 'lg'] as const;

export function TextFieldSection() {
  const [name, setName] = useState('genslate-app');
  return (
    <>
      <Specimen
        title="Labelled field"
        description="Label, helper text and error come from Base UI Field, so they are wired to the input."
        stageClassName="grid grid-cols-2 items-start gap-6"
        code={`<TextField label="Project name" description="Lowercase, no spaces." />`}
      >
        <TextField
          label="Project name"
          description="Lowercase letters, digits and dashes."
          value={name}
          onValueChange={setName}
          clearable
        />
        <TextField label="Email" defaultValue="dustin@" error="Enter a complete email address." />
      </Specimen>

      <StateMatrix
        caption="Text field states"
        columns={['Rest', 'Hover', 'Focus', 'Filled', 'Invalid', 'Disabled']}
        rows={SIZES.map((size) => ({
          label: size.toUpperCase(),
          cells: [
            <TextField
              className="w-28"
              key="rest"
              aria-label="Rest"
              size={size}
              placeholder="Placeholder"
            />,
            <TextField
              className="w-28"
              key="hover"
              aria-label="Hover"
              size={size}
              placeholder="Placeholder"
              controlClassName={HOVER}
            />,
            <TextField
              className="w-28"
              key="focus"
              aria-label="Focus"
              size={size}
              defaultValue="Focused"
              controlClassName={FOCUS}
            />,
            <TextField
              className="w-28"
              key="filled"
              aria-label="Filled"
              size={size}
              defaultValue="main.tsx"
              clearable
            />,
            <TextField
              className="w-28"
              key="invalid"
              aria-label="Invalid"
              size={size}
              defaultValue="bad value"
              invalid
            />,
            <TextField
              className="w-28"
              key="disabled"
              aria-label="Disabled"
              size={size}
              defaultValue="Read only"
              disabled
            />,
          ],
        }))}
      />

      <Specimen
        title="Adornments"
        description="Leading icons, trailing units and a clear button."
        stageClassName="grid grid-cols-3 gap-4"
      >
        <TextField
          aria-label="Path"
          leading={<Icon name="codicon:folder" size={14} />}
          defaultValue="~/Projects/genslate"
        />
        <TextField
          aria-label="Width"
          trailing={<span className="text-sm">px</span>}
          defaultValue="1280"
        />
        <TextField
          aria-label="Branch"
          leading={<Icon name="codicon:git-branch-compact" size={14} />}
          defaultValue="feature/tree-view"
          clearable
        />
      </Specimen>

      <PropsTable
        rows={[
          {
            name: 'label / description / error',
            type: 'ReactNode',
            description: 'Field slots (Base UI Field).',
          },
          {
            name: 'value / defaultValue',
            type: 'string',
            description: 'Controlled or uncontrolled value.',
          },
          {
            name: 'onValueChange',
            type: '(value: string) => void',
            description: 'Every edit and clear.',
          },
          {
            name: 'size',
            type: "'sm' | 'md' | 'lg'",
            default: "'md'",
            description: 'Control height 24 / 28 / 32.',
          },
          {
            name: 'leading / trailing',
            type: 'ReactNode',
            description: 'Adornments inside the field chrome.',
          },
          {
            name: 'clearable',
            type: 'boolean',
            default: 'false',
            description: 'Show × while non-empty.',
          },
          {
            name: 'invalid',
            type: 'boolean',
            default: 'Boolean(error)',
            description: 'Danger border + aria-invalid.',
          },
        ]}
      />
    </>
  );
}
