import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogPopup,
  DialogTitle,
  Select,
  type SelectOption,
  Slider,
} from '@genslate/design-system';
import { useState } from 'react';

import { useGallery } from '../../app/gallery.context';
import type { ExportFormat } from '../../ipc/gallery.types';
import { plural } from '../../model/format.util';

const FORMAT_OPTIONS: readonly SelectOption<ExportFormat>[] = [
  { value: 'original', label: 'Original files (a plain copy)' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
];

/** Long-edge sizes, in pixels ("full" keeps the size). */
const SIZE_OPTIONS: readonly SelectOption<string>[] = [
  { value: 'full', label: 'Full size' },
  { value: '4096', label: 'Large · 4096 px' },
  { value: '2560', label: 'Medium · 2560 px' },
  { value: '1600', label: 'Small · 1600 px' },
  { value: '1080', label: 'For sharing · 1080 px' },
];

/** Exports copies to a folder you pick: as they are, or converted and resized. */
export function ExportDialog({ ids }: { readonly ids: readonly number[] }) {
  const api = useGallery();
  const [format, setFormat] = useState<ExportFormat>('jpeg');
  const [size, setSize] = useState('full');
  const [quality, setQuality] = useState(90);
  const converts = format !== 'original';
  const videos = ids.filter((id) => api.itemById(id)?.kind === 'video').length;

  const start = () =>
    api.exportItems(ids, {
      format,
      longEdge: converts && size !== 'full' ? Number(size) : null,
      quality,
    });

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <DialogPopup size="sm">
        <DialogTitle>Export {plural(ids.length, 'item')}</DialogTitle>
        <DialogDescription>
          Copies go to a folder you choose next. The originals don’t change.
        </DialogDescription>
        <DialogBody className="flex flex-col gap-4">
          <Select<ExportFormat>
            label="Format"
            options={FORMAT_OPTIONS}
            value={format}
            onValueChange={(value) => (value === null ? undefined : setFormat(value))}
          />
          <Select<string>
            label="Size"
            options={SIZE_OPTIONS}
            value={converts ? size : 'full'}
            disabled={!converts}
            onValueChange={(value) => (value === null ? undefined : setSize(value))}
          />
          {format === 'jpeg' ? (
            <Slider
              label="Quality"
              showValue
              min={40}
              max={100}
              value={quality}
              onValueChange={setQuality}
            />
          ) : null}
          {converts && videos > 0 ? (
            <p className="text-fg-muted text-xs">
              {plural(videos, 'video')} will be copied as {videos === 1 ? 'it is' : 'they are'}.
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <DialogClose tone="primary" onClick={start}>
            Choose folder and export
          </DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
