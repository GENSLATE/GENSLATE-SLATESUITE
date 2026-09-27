import {
  Button,
  type CursorStyle,
  IconButton,
  SegmentedControl,
  SegmentedControlItem,
  Tab,
  Tabs,
  TabsList,
  TextField,
  useCursorStyle,
  useTheme,
} from '@genslate/design-system';
import { type CursorKey, cursorDataUri, THEMES } from '@genslate/tokens';
import type { CSSProperties } from 'react';
import { Specimen } from '../../components/specimen.component';

/** Where each cursor shows up, in family order. */
const FAMILY: ReadonlyArray<readonly [CursorKey, string]> = [
  ['default', 'Chrome, canvas, labels'],
  ['interactive', 'Buttons, tabs, menu items'],
  ['pointer', 'Links'],
  ['text', 'Text fields, editable text'],
  ['vertical-text', 'Vertical text'],
  ['not-allowed', 'Disabled controls'],
  ['progress', 'Busy, still usable'],
  ['wait', 'Blocked'],
  ['help', 'Help targets'],
  ['copy', 'Drop copies'],
  ['alias', 'Drop links'],
  ['context-menu', 'Opens a menu'],
  ['grab', 'Draggable'],
  ['grabbing', 'Dragging'],
  ['move', 'Moves freely'],
  ['crosshair', 'Precise picking'],
  ['col-resize', 'Column sashes'],
  ['row-resize', 'Row sashes'],
  ['ew-resize', 'Resize sideways'],
  ['ns-resize', 'Resize up and down'],
  ['nwse-resize', 'Corner resize'],
  ['nesw-resize', 'Corner resize'],
  ['zoom-in', 'Zoom in'],
  ['zoom-out', 'Zoom out'],
];

/** Inline cursor from the generated variable (class names built at runtime aren't compiled). */
const cursorStyle = (key: CursorKey): CSSProperties => ({ cursor: `var(--gs-cursor-${key})` });

function Target({ label, className }: { label: string; className: string }) {
  return (
    <div
      className={`flex h-16 min-w-0 flex-1 items-center justify-center rounded-control border border-border border-dashed text-fg-muted text-sm ${className}`}
    >
      {label}
    </div>
  );
}

export function CursorsSection() {
  const { resolvedTheme } = useTheme();
  const { cursorStyle: style, setCursorStyle } = useCursorStyle();
  const theme = THEMES[resolvedTheme];

  return (
    <>
      <Specimen
        title="Family"
        description="Drawn from the theme's Nord colours. Hover a tile to wear that cursor."
        stageClassName="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-1 p-3"
      >
        {FAMILY.map(([key, use]) => (
          <div
            key={key}
            data-cursor-key={key}
            style={cursorStyle(key)}
            className="flex h-28 min-w-0 flex-col items-center justify-center gap-1.5 rounded-control px-2 transition-colors duration-fast ease-standard hover:bg-fill-hover"
          >
            <img src={cursorDataUri(key, theme)} alt="" width={48} height={48} draggable={false} />
            <span className="font-mono text-code text-fg">{`cursor-${key}`}</span>
            <span className="w-full truncate text-center text-2xs text-fg-muted">{use}</span>
          </div>
        ))}
      </Specimen>

      <Specimen
        title="In the components"
        description="Nothing to wire up: components and plain elements pick the right cursor."
        stageClassName="flex-col items-stretch gap-4"
        code={`<button className="cursor-interactive">…</button>  // controls (the default for Button)\n<a href="…">…</a>                                  // links show the hand\n<div className="cursor-grab active:cursor-grabbing">…</div>`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button>Secondary</Button>
          <IconButton icon="codicon:gear" label="Settings" />
          <Button disabled>Disabled</Button>
          <Button loading>Saving</Button>
          <a href="https://www.nordtheme.com" target="_blank" rel="noreferrer">
            nordtheme.com
          </a>
          <TextField aria-label="Text" placeholder="Type here" className="w-48" />
        </div>
        <Tabs defaultValue="problems">
          <TabsList aria-label="Panel">
            <Tab value="problems">Problems</Tab>
            <Tab value="output">Output</Tab>
            <Tab value="ports" disabled>
              Ports
            </Tab>
          </TabsList>
        </Tabs>
        <div className="flex gap-3">
          <Target label="Drag me" className="cursor-grab active:cursor-grabbing" />
          <Target label="Resize" className="cursor-col-resize" />
          <Target label="Pick" className="cursor-crosshair" />
          <Target label="Zoom" className="cursor-zoom-in" />
          <Target label="Help" className="cursor-help" />
        </div>
      </Specimen>

      <Specimen
        title="Cursor style"
        description="System hands every cursor back to the OS, keeping an enlarged or high-contrast pointer. Forced-colours mode always does."
        aside={
          <SegmentedControl<CursorStyle>
            aria-label="Cursor style"
            size="sm"
            value={style}
            onValueChange={setCursorStyle}
          >
            <SegmentedControlItem value="themed">GENSLATE</SegmentedControlItem>
            <SegmentedControlItem value="system">System</SegmentedControlItem>
          </SegmentedControl>
        }
        code={`<DesignSystemProvider defaultCursorStyle="themed">…</DesignSystemProvider>\nconst { cursorStyle, setCursorStyle } = useCursorStyle();`}
      >
        <p className="text-base text-fg-muted">
          {style === 'themed'
            ? 'Themed cursors are on. They never animate, so reduced motion is unaffected.'
            : 'System cursors are on.'}
        </p>
      </Specimen>
    </>
  );
}
