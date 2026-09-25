import { LAYOUT_SIZE, RADIUS, SPACE } from '@genslate/tokens';
import { Specimen } from '../../components/specimen.component';

const SHADOWS = [
  { name: 'shadow-control', className: 'shadow-control', use: 'Buttons, segmented thumbs' },
  { name: 'shadow-card', className: 'shadow-card', use: 'Raised cards' },
  { name: 'shadow-popover', className: 'shadow-popover', use: 'Menus, popovers' },
  { name: 'shadow-dialog', className: 'shadow-dialog', use: 'Dialogs, palettes' },
  { name: 'shadow-inset', className: 'shadow-inset', use: 'Fields, wells' },
] as const;

const RADIUS_CLASS: Readonly<Record<string, string>> = {
  none: 'rounded-none',
  xs: 'rounded-xs',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

const SIZE_GROUPS = [
  { title: 'Chrome', keys: ['titlebar', 'statusbar', 'tabbar', 'toolbar', 'panel-header'] },
  {
    title: 'Controls & rows',
    keys: [
      'control-xs',
      'control-sm',
      'control-md',
      'control-lg',
      'control-xl',
      'row-sm',
      'row-md',
      'menu-item',
    ],
  },
  {
    title: 'Panes',
    keys: ['sidebar', 'sidebar-min', 'sidebar-max', 'command-center-max', 'palette', 'content-max'],
  },
] as const;

export function SpacingSection() {
  const spaces = Object.entries(SPACE)
    .filter(([key]) => key !== '0')
    .sort(([, a], [, b]) => a - b);
  return (
    <>
      <Specimen
        title="Spacing"
        description="Tailwind's 4px grid — p-2 is 8px. Half steps exist for optical tweaks."
        stageClassName="flex-col items-stretch gap-2"
      >
        {spaces.map(([key, px]) => (
          <div key={key} className="grid grid-cols-[4rem_3rem_1fr] items-center gap-3">
            <span className="font-mono text-accent-fg text-code">{key}</span>
            <span className="text-fg-muted text-sm tabular-nums">{px}px</span>
            <span className="h-3 rounded-xs bg-accent/70" style={{ width: px * 4 }} />
          </div>
        ))}
      </Specimen>

      <Specimen
        title="Radius"
        description="Controls 6 · menu items 4 · popovers & cards 8 · windows 10 · dialogs 12."
        stageClassName="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-5"
      >
        {Object.entries(RADIUS.scale).map(([key, px]) => (
          <div key={key} className="flex flex-col items-center gap-2">
            <div
              className={`inset-ring inset-ring-accent-border size-16 bg-accent-subtle ${RADIUS_CLASS[key] ?? ''}`}
            />
            <span className="font-mono text-code text-fg">rounded-{key}</span>
            <span className="text-fg-muted text-xs tabular-nums">
              {px === 9999 ? 'pill' : `${px}px`}
            </span>
          </div>
        ))}
      </Specimen>

      <Specimen
        title="Elevation"
        description="Flat at rest. Shadows only for things that float."
        stageClassName="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-6 bg-surface-sunken p-8"
      >
        {SHADOWS.map((shadow) => (
          <div
            key={shadow.name}
            className={`flex h-24 flex-col justify-end gap-0.5 rounded-card bg-surface-raised p-3 ${shadow.className}`}
          >
            <span className="font-mono text-code text-fg">{shadow.name}</span>
            <span className="text-fg-muted text-xs">{shadow.use}</span>
          </div>
        ))}
      </Specimen>

      <Specimen
        title="Layout sizes"
        description="Density from VS Code, proportions from macOS."
        bare
      >
        <div className="grid grid-cols-3 gap-4">
          {SIZE_GROUPS.map((group) => (
            <div
              key={group.title}
              className="inset-ring inset-ring-border-subtle flex flex-col rounded-card py-2"
            >
              <span className="px-4 pt-1 pb-2 font-semibold text-2xs text-fg-muted uppercase tracking-wider">
                {group.title}
              </span>
              {group.keys.map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 px-4 py-1.5 text-sm"
                >
                  <span className="font-mono text-code text-fg">{key}</span>
                  <span className="text-fg-muted tabular-nums">{LAYOUT_SIZE[key]}px</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Specimen>
    </>
  );
}
