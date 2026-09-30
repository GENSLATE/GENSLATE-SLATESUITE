import { cn, Spinner } from '@genslate/design-system';
import { type PointerEvent, useId, useRef, useState } from 'react';

import type { Crop, Recipe } from '../../ipc/gallery.types';
import {
  type Corner,
  colorMatrix,
  moveCrop,
  resizeCrop,
  type Size,
  straightenScale,
  turnedSize,
} from '../../model/recipe.util';
import { useViewport } from '../library/use-viewport.hook';

/** Room left around the picture. */
const MARGIN = 32;
const FULL: Crop = { x: 0, y: 0, width: 1, height: 1 };
const CORNERS: readonly Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

interface EditCanvasProps {
  readonly source: string;
  readonly alt: string;
  readonly recipe: Recipe;
  /** The picture's pixel size (a guess until it loads). */
  readonly size: Size;
  readonly onLoad: (size: Size) => void;
  /** Showing the crop frame (the whole picture with handles) instead of the result. */
  readonly cropping: boolean;
  /** The crop's locked shape (width ÷ height), `null` for free. */
  readonly ratio: number | null;
  readonly onCrop: (crop: Crop) => void;
}

/**
 * The editor's live preview. The same steps as the saved copy, in the same order: quarter
 * turns and flips as a CSS transform, straighten as a rotation zoomed to fill the frame, the
 * crop as a window onto that frame, and the colour as an SVG colour matrix.
 */
export function EditCanvas({
  source,
  alt,
  recipe,
  size,
  onLoad,
  cropping,
  ratio,
  onCrop,
}: EditCanvasProps) {
  const filterId = `gallery-edit-${useId().replaceAll(':', '')}`;
  const { ref, viewport } = useViewport();
  const [loaded, setLoaded] = useState(false);

  const turned = turnedSize(size, recipe.quarterTurns);
  const crop = cropping ? FULL : (recipe.crop ?? FULL);
  // The shown area's pixel size, fitted into the stage.
  const shownWidth = turned.width * crop.width;
  const shownHeight = turned.height * crop.height;
  const fit = Math.min(
    Math.max(0, viewport.width - MARGIN * 2) / shownWidth,
    Math.max(0, viewport.height - MARGIN * 2) / shownHeight,
  );
  const box = { width: shownWidth * fit, height: shownHeight * fit };

  const odd = recipe.quarterTurns % 2 === 1;
  const flipX = recipe.flipHorizontal ? -1 : 1;
  const flipY = recipe.flipVertical ? -1 : 1;
  // Read right to left: turn, flip, then straighten about the centre.
  const transform = [
    'translate(-50%, -50%)',
    `rotate(${recipe.straighten}deg)`,
    `scale(${straightenScale(turned, recipe.straighten)})`,
    `scale(${flipX}, ${flipY})`,
    `rotate(${recipe.quarterTurns * 90}deg)`,
  ].join(' ');

  return (
    <div
      ref={ref}
      data-slot="edit-canvas"
      className="relative grid min-h-0 min-w-0 flex-1 place-items-center overflow-hidden bg-surface-sunken"
    >
      <svg aria-hidden className="absolute size-0" focusable="false">
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={colorMatrix(recipe).join(' ')} />
        </filter>
      </svg>
      {viewport.width === 0 ? null : (
        <div
          className="relative overflow-hidden shadow-card"
          style={{ width: box.width, height: box.height }}
        >
          {/* The whole turned frame, offset so the crop shows. */}
          <div
            className="absolute"
            style={{
              width: `${100 / crop.width}%`,
              height: `${100 / crop.height}%`,
              left: `${(-crop.x / crop.width) * 100}%`,
              top: `${(-crop.y / crop.height) * 100}%`,
            }}
          >
            <img
              src={source}
              alt={alt}
              draggable={false}
              onLoad={(event) => {
                setLoaded(true);
                const image = event.currentTarget;
                if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                  onLoad({ width: image.naturalWidth, height: image.naturalHeight });
                }
              }}
              className="absolute top-1/2 left-1/2 max-w-none select-none"
              style={{
                width: odd ? `${(turned.height / turned.width) * 100}%` : '100%',
                height: odd ? `${(turned.width / turned.height) * 100}%` : '100%',
                transform,
                filter: `url(#${filterId})`,
              }}
            />
          </div>
          {cropping ? (
            <CropFrame
              crop={recipe.crop ?? FULL}
              box={box}
              ratio={ratio}
              aspect={turned.width / turned.height}
              onCrop={onCrop}
            />
          ) : null}
        </div>
      )}
      {loaded ? null : (
        <Spinner size={16} label="Loading the picture" className="absolute right-4 bottom-4" />
      )}
    </div>
  );
}

interface CropFrameProps {
  readonly crop: Crop;
  readonly box: Size;
  readonly ratio: number | null;
  readonly aspect: number;
  readonly onCrop: (crop: Crop) => void;
}

type Drag = {
  readonly corner: Corner | null;
  readonly x: number;
  readonly y: number;
  readonly crop: Crop;
};

/** The crop rectangle: drag inside to move it, drag a corner to resize it. */
function CropFrame({ crop, box, ratio, aspect, onCrop }: CropFrameProps) {
  const drag = useRef<Drag | null>(null);

  const start = (corner: Corner | null) => (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { corner, x: event.clientX, y: event.clientY, crop };
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (current === null) return;
    const dx = (event.clientX - current.x) / box.width;
    const dy = (event.clientY - current.y) / box.height;
    onCrop(
      current.corner === null
        ? moveCrop(current.crop, dx, dy)
        : resizeCrop(current.crop, current.corner, dx, dy, ratio, aspect),
    );
  };
  const end = () => {
    drag.current = null;
  };

  const percent = (value: number) => `${value * 100}%`;
  return (
    <div className="absolute inset-0" data-slot="crop-frame">
      {/* Dim what the crop leaves out. */}
      <div className="absolute inset-x-0 top-0 bg-scrim" style={{ height: percent(crop.y) }} />
      <div
        className="absolute inset-x-0 bottom-0 bg-scrim"
        style={{ height: percent(1 - crop.y - crop.height) }}
      />
      <div
        className="absolute left-0 bg-scrim"
        style={{ top: percent(crop.y), height: percent(crop.height), width: percent(crop.x) }}
      />
      <div
        className="absolute right-0 bg-scrim"
        style={{
          top: percent(crop.y),
          height: percent(crop.height),
          width: percent(1 - crop.x - crop.width),
        }}
      />
      <div
        role="presentation"
        onPointerDown={start(null)}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="absolute cursor-move ring-1 ring-on-media"
        style={{
          left: percent(crop.x),
          top: percent(crop.y),
          width: percent(crop.width),
          height: percent(crop.height),
        }}
      >
        {/* Rule of thirds. */}
        <div className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-on-media opacity-40" />
        <div className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-on-media opacity-40" />
        <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-on-media opacity-40" />
        <div className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-on-media opacity-40" />
        {CORNERS.map((corner) => (
          <span
            key={corner}
            role="presentation"
            onPointerDown={start(corner)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            className={cn(
              'absolute size-3.5 rounded-xs bg-on-media shadow-control',
              corner === 'top-left' && '-top-1.5 -left-1.5 cursor-nwse-resize',
              corner === 'top-right' && '-top-1.5 -right-1.5 cursor-nesw-resize',
              corner === 'bottom-left' && '-bottom-1.5 -left-1.5 cursor-nesw-resize',
              corner === 'bottom-right' && '-right-1.5 -bottom-1.5 cursor-nwse-resize',
            )}
          />
        ))}
      </div>
    </div>
  );
}
