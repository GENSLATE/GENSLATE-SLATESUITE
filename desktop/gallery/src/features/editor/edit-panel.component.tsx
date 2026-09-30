import {
  Badge,
  Button,
  type CodiconRef,
  Icon,
  IconButton,
  ScrollArea,
  SegmentedControl,
  SegmentedControlItem,
  Slider,
} from '@genslate/design-system';
import type { ReactNode } from 'react';

import { COMMANDS, type CommandId } from '../../app/commands.registry';
import type { Recipe } from '../../ipc/gallery.types';
import { CROP_PRESETS, type CropPreset, MAX_STRAIGHTEN } from '../../model/recipe.util';

/** The editor's tools. */
export type EditTool = 'crop' | 'adjust';

/** The assistant's edits, shown as coming soon. */
const AI_EDITS: readonly CommandId[] = [
  'auto-enhance',
  'remove-background',
  'erase-object',
  'upscale',
  'relight',
];

const ADJUSTMENTS: readonly {
  readonly key: 'light' | 'contrast' | 'saturation' | 'warmth';
  readonly label: string;
  readonly icon: CodiconRef;
}[] = [
  { key: 'light', label: 'Light', icon: 'codicon:lightbulb' },
  { key: 'contrast', label: 'Contrast', icon: 'codicon:color-mode' },
  { key: 'saturation', label: 'Saturation', icon: 'codicon:symbol-color' },
  { key: 'warmth', label: 'Warmth', icon: 'codicon:flame' },
];

interface EditPanelProps {
  readonly tool: EditTool;
  readonly onTool: (tool: EditTool) => void;
  readonly recipe: Recipe;
  readonly onChange: (recipe: Recipe) => void;
  readonly preset: CropPreset;
  readonly onPreset: (preset: CropPreset) => void;
}

/** The editor's side panel: crop and rotate, the colour sliders, and the ✦ edits to come. */
export function EditPanel({ tool, onTool, recipe, onChange, preset, onPreset }: EditPanelProps) {
  const set = <K extends keyof Recipe>(key: K, value: Recipe[K]) =>
    onChange({ ...recipe, [key]: value });
  // Hundredths for the sliders, fractions for the recipe.
  const slider = (value: number) => Math.round(value * 100);

  return (
    <aside
      aria-label="Edit tools"
      data-slot="edit-panel"
      className="flex w-72 shrink-0 flex-col border-border-subtle border-l bg-surface-panel"
    >
      <div className="hairline-b p-3">
        <SegmentedControl<EditTool>
          aria-label="Tool"
          value={tool}
          onValueChange={onTool}
          fullWidth
          size="sm"
        >
          <SegmentedControlItem value="crop" icon="codicon:screen-normal">
            Crop
          </SegmentedControlItem>
          <SegmentedControlItem value="adjust" icon="codicon:settings">
            Adjust
          </SegmentedControlItem>
        </SegmentedControl>
      </div>
      <ScrollArea className="min-h-0 flex-1" aria-label="Edit tools">
        <div className="flex flex-col gap-5 p-4">
          {tool === 'crop' ? (
            <>
              <Group title="Rotate and flip">
                <div className="flex items-center gap-1">
                  <IconButton
                    icon="codicon:debug-step-back"
                    label="Rotate left"
                    onClick={() => set('quarterTurns', (recipe.quarterTurns + 3) % 4)}
                  />
                  <IconButton
                    icon="codicon:debug-step-over"
                    label="Rotate right"
                    onClick={() => set('quarterTurns', (recipe.quarterTurns + 1) % 4)}
                  />
                  <IconButton
                    icon="codicon:arrow-both"
                    label="Flip horizontally"
                    toggled={recipe.flipHorizontal}
                    onClick={() => set('flipHorizontal', !recipe.flipHorizontal)}
                  />
                  <IconButton
                    icon="codicon:fold"
                    label="Flip vertically"
                    toggled={recipe.flipVertical}
                    onClick={() => set('flipVertical', !recipe.flipVertical)}
                  />
                </div>
                <Slider
                  label="Straighten"
                  showValue
                  min={-MAX_STRAIGHTEN}
                  max={MAX_STRAIGHTEN}
                  step={0.5}
                  value={recipe.straighten}
                  onValueChange={(value) => set('straighten', value)}
                />
              </Group>
              <Group title="Aspect ratio">
                <div className="grid grid-cols-3 gap-1.5">
                  {CROP_PRESETS.map((entry) => (
                    <Button
                      key={entry.id}
                      size="sm"
                      variant={preset === entry.id ? 'primary' : 'secondary'}
                      aria-pressed={preset === entry.id}
                      onClick={() => onPreset(entry.id)}
                    >
                      {entry.label}
                    </Button>
                  ))}
                </div>
                <p className="text-fg-muted text-xs">
                  Drag the frame to move it and its corners to resize it.
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  leadingIcon="codicon:discard"
                  disabled={recipe.crop === null}
                  onClick={() => set('crop', null)}
                >
                  Clear the crop
                </Button>
              </Group>
            </>
          ) : (
            <Group title="Light and colour">
              {ADJUSTMENTS.map((entry) => (
                <Slider
                  key={entry.key}
                  label={
                    <span className="flex items-center gap-1.5">
                      <Icon name={entry.icon} size={14} className="text-fg-muted" />
                      {entry.label}
                    </span>
                  }
                  showValue
                  min={-100}
                  max={100}
                  value={slider(recipe[entry.key])}
                  onValueChange={(value) => set(entry.key, value / 100)}
                />
              ))}
            </Group>
          )}
          <SmartEdits />
        </div>
      </ScrollArea>
    </aside>
  );
}

/** ✦ The assistant's edits: listed so people find them, not available yet. */
function SmartEdits() {
  return (
    <section
      aria-label="Smart edits (coming soon)"
      className="flex flex-col gap-2 rounded-card border border-border-subtle border-dashed p-3"
    >
      <div className="flex items-center gap-2">
        <Icon name="codicon:sparkle" size={14} className="text-accent-fg" />
        <h3 className="font-semibold text-fg-strong text-sm">Smart edits</h3>
        <Badge tone="accent" size="sm" pill className="ml-auto">
          Coming soon
        </Badge>
      </div>
      <p className="text-fg-muted text-xs leading-relaxed">
        One click fixes that run on this computer: nothing is uploaded.
      </p>
      <div className="flex flex-col gap-1">
        {COMMANDS.filter((entry) => AI_EDITS.includes(entry.id)).map((entry) => (
          <Button
            key={entry.id}
            size="sm"
            variant="ghost"
            leadingIcon={entry.icon}
            disabled
            title="Coming soon"
            className="justify-start"
          >
            {entry.label}
          </Button>
        ))}
      </div>
    </section>
  );
}

function Group({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold text-2xs text-fg-muted uppercase tracking-wider">{title}</h3>
      {children}
    </section>
  );
}
