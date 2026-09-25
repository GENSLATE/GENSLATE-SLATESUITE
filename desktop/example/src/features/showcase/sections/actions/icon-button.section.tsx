import { IconButton, type IconButtonVariant } from '@genslate/design-system';
import { useState } from 'react';
import { Specimen } from '../../components/specimen.component';
import { StateMatrix } from '../../components/state-matrix.component';

const VARIANTS: readonly { variant: IconButtonVariant; hover: string; pressed: string }[] = [
  {
    variant: 'ghost',
    hover: 'bg-fill-hover text-fg-strong',
    pressed: 'bg-fill-pressed text-fg-strong',
  },
  { variant: 'secondary', hover: 'bg-control-hover', pressed: 'bg-control-pressed' },
  { variant: 'primary', hover: 'bg-accent-hover', pressed: 'bg-accent-active' },
  { variant: 'danger', hover: 'bg-danger-subtle', pressed: 'bg-danger-subtle' },
];

export function IconButtonSection() {
  const [wrap, setWrap] = useState(true);
  const [pinned, setPinned] = useState(false);

  return (
    <>
      <Specimen
        title="Action bar"
        description="Ghost by default; label is required and doubles as the tooltip."
      >
        <div className="flex items-center gap-0.5">
          <IconButton icon="codicon:new-file" label="New file" />
          <IconButton icon="codicon:new-folder" label="New folder" />
          <IconButton icon="codicon:refresh" label="Refresh" />
          <IconButton icon="codicon:collapse-all" label="Collapse all" />
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton
            icon="codicon:word-wrap"
            label="Word wrap"
            toggled={wrap}
            onClick={() => setWrap(!wrap)}
          />
          <IconButton
            icon="codicon:pin"
            label="Pin"
            toggled={pinned}
            onClick={() => setPinned(!pinned)}
          />
        </div>
        <IconButton icon="codicon:sync" label="Syncing" loading />
      </Specimen>

      <StateMatrix
        caption="Icon button states"
        columns={['Rest', 'Hover', 'Pressed', 'Focus', 'Toggled', 'Disabled']}
        rows={VARIANTS.map(({ variant, hover, pressed }) => ({
          label: variant[0]?.toUpperCase() + variant.slice(1),
          cells: [
            <IconButton key="rest" variant={variant} icon="codicon:gear" label="Settings" />,
            <IconButton
              key="hover"
              variant={variant}
              icon="codicon:gear"
              label="Settings"
              className={hover}
            />,
            <IconButton
              key="pressed"
              variant={variant}
              icon="codicon:gear"
              label="Settings"
              className={pressed}
            />,
            <IconButton
              key="focus"
              variant={variant}
              icon="codicon:gear"
              label="Settings"
              className="outline-focus!"
            />,
            <IconButton
              key="toggled"
              variant={variant}
              icon="codicon:gear"
              label="Settings"
              toggled
            />,
            <IconButton
              key="disabled"
              variant={variant}
              icon="codicon:gear"
              label="Settings"
              disabled
            />,
          ],
        }))}
      />

      <Specimen title="Sizes" description="xs 20 · sm 24 · md 28 · lg 32 — 12/14/16/16px glyphs.">
        {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
          <div key={size} className="flex flex-col items-center gap-2">
            <IconButton
              size={size}
              variant="secondary"
              icon="codicon:search"
              label={`Search (${size})`}
            />
            <span className="text-fg-muted text-xs">{size}</span>
          </div>
        ))}
      </Specimen>
    </>
  );
}
