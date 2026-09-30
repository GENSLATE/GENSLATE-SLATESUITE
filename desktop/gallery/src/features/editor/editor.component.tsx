import { Button, EmptyState } from '@genslate/design-system';
import { useEffect, useEffectEvent, useState } from 'react';

import { useGallery } from '../../app/gallery.context';
import { DISPLAY_EDGE } from '../../ipc/gallery.client';
import { EMPTY_RECIPE, type Recipe } from '../../ipc/gallery.types';
import {
  type CropPreset,
  centredCrop,
  isUnchanged,
  presetRatio,
  type Size,
  turnedSize,
} from '../../model/recipe.util';
import { EditCanvas } from './edit-canvas.component';
import { EditPanel, type EditTool } from './edit-panel.component';

/**
 * Edits a copy of one photo: crop, rotate, flip and straighten, then light and colour.
 * Save writes “name (edited).ext” next to the original, which never changes.
 */
export function Editor({ id }: { readonly id: number }) {
  const api = useGallery();
  const item = api.itemById(id);
  const [recipe, setRecipe] = useState<Recipe>(EMPTY_RECIPE);
  const [tool, setTool] = useState<EditTool>('adjust');
  const [preset, setPreset] = useState<CropPreset>('free');
  const [natural, setNatural] = useState<Size | null>(null);
  const [saving, setSaving] = useState(false);

  const leave = () => api.setMode({ type: 'view', id });
  const unchanged = isUnchanged(recipe);

  const save = () => {
    if (unchanged || saving) return;
    setSaving(true);
    api.saveEdit(id, recipe).then(
      (saved) => {
        setSaving(false);
        if (saved) leave();
      },
      () => setSaving(false),
    );
  };

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || api.dialog.type !== 'none' || api.paletteOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      leave();
    } else if (event.key.toLowerCase() === 's' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      save();
    }
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  if (item === undefined) {
    return (
      <EmptyState
        className="flex-1"
        icon="codicon:edit"
        title="This photo is gone"
        description="It was moved or removed while you were editing."
        actions={
          <Button size="sm" onClick={() => api.setMode({ type: 'browse' })}>
            Back to the photos
          </Button>
        }
      />
    );
  }

  const size: Size = natural ?? {
    width: item.width ?? 3,
    height: item.height ?? 2,
  };
  const turned = turnedSize(size, recipe.quarterTurns);
  const aspect = turned.width / turned.height;

  const choosePreset = (next: CropPreset) => {
    setPreset(next);
    const ratio = presetRatio(next, aspect);
    setRecipe((current) => ({
      ...current,
      crop: ratio === null ? current.crop : centredCrop(ratio, aspect),
    }));
  };
  // Turning swaps the frame's sides, so a crop made for the old frame no longer fits.
  const change = (next: Recipe) => {
    const turnedAgain = next.quarterTurns !== recipe.quarterTurns;
    setRecipe(turnedAgain ? { ...next, crop: null } : next);
    if (turnedAgain) setPreset('free');
  };

  return (
    <section
      aria-label={`Editing ${item.name}`}
      data-slot="editor"
      data-context-zone="editor"
      className="flex min-h-0 flex-1 flex-col bg-canvas"
    >
      <div className="hairline-b flex h-12 shrink-0 items-center gap-2 px-3">
        <Button size="sm" variant="ghost" onClick={leave}>
          Cancel
        </Button>
        <div className="flex min-w-0 flex-1 flex-col items-center leading-tight">
          <span className="truncate font-medium text-fg-strong text-sm">{item.name}</span>
          <span className="truncate text-fg-muted text-xs">Saves a copy next to the original</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          leadingIcon="codicon:discard"
          disabled={unchanged}
          onClick={() => {
            setRecipe(EMPTY_RECIPE);
            setPreset('free');
          }}
        >
          Reset
        </Button>
        <Button size="sm" variant="primary" disabled={unchanged || saving} onClick={save}>
          {saving ? 'Saving…' : 'Save copy'}
        </Button>
      </div>
      <div className="flex min-h-0 flex-1">
        <EditCanvas
          source={api.backend.thumbUrl(item, DISPLAY_EDGE)}
          alt={item.name}
          recipe={recipe}
          size={size}
          onLoad={setNatural}
          cropping={tool === 'crop'}
          ratio={presetRatio(preset, aspect)}
          onCrop={(crop) => setRecipe((current) => ({ ...current, crop }))}
        />
        <EditPanel
          tool={tool}
          onTool={setTool}
          recipe={recipe}
          onChange={change}
          preset={preset}
          onPreset={choosePreset}
        />
      </div>
    </section>
  );
}
