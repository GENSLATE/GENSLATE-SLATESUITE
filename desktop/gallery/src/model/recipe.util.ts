/**
 * Editor maths shared by the live preview and the tests. The preview mirrors
 * `genslate-core-gallery::edit::apply` step for step (turns → flips → straighten → crop →
 * colour), so what you see is what the saved copy looks like.
 */
import type { Crop, Recipe } from '../ipc/gallery.types';

/** The widest straighten angle, in degrees (the core refuses more). */
export const MAX_STRAIGHTEN = 45;

/** The smallest crop side, as a fraction of the image. */
const MIN_CROP = 0.05;

/** A crop shape: free, or width ÷ height (flipped to match a portrait photo). */
export type CropPreset = 'free' | 'original' | 'square' | '4:3' | '3:2' | '16:9';

export const CROP_PRESETS: readonly { readonly id: CropPreset; readonly label: string }[] = [
  { id: 'free', label: 'Free' },
  { id: 'original', label: 'Original' },
  { id: 'square', label: 'Square' },
  { id: '4:3', label: '4:3' },
  { id: '3:2', label: '3:2' },
  { id: '16:9', label: '16:9' },
];

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** Whether the recipe changes anything. */
export function isUnchanged(recipe: Recipe): boolean {
  return (
    recipe.quarterTurns % 4 === 0 &&
    !recipe.flipHorizontal &&
    !recipe.flipVertical &&
    recipe.straighten === 0 &&
    recipe.crop === null &&
    recipe.light === 0 &&
    recipe.contrast === 0 &&
    recipe.saturation === 0 &&
    recipe.warmth === 0
  );
}

/** The image's size after its quarter turns. */
export function turnedSize(size: Size, quarterTurns: number): Size {
  return quarterTurns % 2 === 1 ? { width: size.height, height: size.width } : size;
}

/** The zoom at which an image straightened by `degrees` still fills its frame. */
export function straightenScale(size: Size, degrees: number): number {
  const angle = (degrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(angle));
  const cos = Math.cos(angle);
  const { width, height } = size;
  if (width <= 0 || height <= 0) return 1;
  return Math.max(cos + (height / width) * sin, (width / height) * sin + cos);
}

/** Width ÷ height of a preset for an image of `aspect`; `null` for a free crop. */
export function presetRatio(preset: CropPreset, aspect: number): number | null {
  const landscape = aspect >= 1;
  const oriented = (ratio: number) => (landscape ? ratio : 1 / ratio);
  switch (preset) {
    case 'free':
      return null;
    case 'original':
      return aspect;
    case 'square':
      return 1;
    case '4:3':
      return oriented(4 / 3);
    case '3:2':
      return oriented(3 / 2);
    case '16:9':
      return oriented(16 / 9);
  }
}

/** The largest centred crop of `ratio` (width ÷ height) in an image of `aspect`. */
export function centredCrop(ratio: number, aspect: number): Crop {
  if (aspect > ratio) {
    const width = ratio / aspect;
    return { x: (1 - width) / 2, y: 0, width, height: 1 };
  }
  const height = aspect / ratio;
  return { x: 0, y: (1 - height) / 2, width: 1, height };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Moves a crop by fractions `dx`, `dy`, keeping it inside the image. */
export function moveCrop(crop: Crop, dx: number, dy: number): Crop {
  return {
    ...crop,
    x: clamp(crop.x + dx, 0, 1 - crop.width),
    y: clamp(crop.y + dy, 0, 1 - crop.height),
  };
}

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Drags one corner by fractions `dx`, `dy`; the opposite corner stays put. With a `ratio`
 * (width ÷ height, in pixels of an image of `aspect`) the crop keeps its shape.
 */
export function resizeCrop(
  crop: Crop,
  corner: Corner,
  dx: number,
  dy: number,
  ratio: number | null,
  aspect: number,
): Crop {
  const left = corner === 'top-left' || corner === 'bottom-left';
  const top = corner === 'top-left' || corner === 'top-right';
  // The fixed corner and the room there is to grow towards the dragged one.
  const anchorX = left ? crop.x + crop.width : crop.x;
  const anchorY = top ? crop.y + crop.height : crop.y;
  const roomX = left ? anchorX : 1 - anchorX;
  const roomY = top ? anchorY : 1 - anchorY;

  let width = clamp(crop.width + (left ? -dx : dx), MIN_CROP, roomX);
  let height = clamp(crop.height + (top ? -dy : dy), MIN_CROP, roomY);
  if (ratio !== null) {
    // In fractions, a crop of `ratio` has width / height = ratio / aspect.
    const shape = ratio / aspect;
    if (width / height > shape) width = height * shape;
    else height = width / shape;
    if (width > roomX) {
      width = roomX;
      height = width / shape;
    }
    if (height > roomY) {
      height = roomY;
      width = height * shape;
    }
  }
  return {
    x: left ? anchorX - width : anchorX,
    y: top ? anchorY - height : anchorY,
    width,
    height,
  };
}

/**
 * The colour adjustments as one SVG `feColorMatrix` (20 values, row-major): gain
 * (2^light), contrast about mid-grey, saturation about Rec. 709 luma, then warmth scaling
 * red up and blue down, exactly as the core does per pixel.
 */
export function colorMatrix(recipe: Recipe): readonly number[] {
  const gain = 2 ** recipe.light;
  const contrast = 1 + recipe.contrast;
  const saturation = 1 + recipe.saturation;
  const luma = [0.2126, 0.7152, 0.0722] as const;
  const warm = [1 + 0.12 * recipe.warmth, 1, 1 - 0.12 * recipe.warmth] as const;
  const offset = 0.5 * (1 - contrast);

  const rows: number[] = [];
  for (let row = 0; row < 3; row += 1) {
    const scale = warm[row] ?? 1;
    for (let column = 0; column < 3; column += 1) {
      const weight = luma[column] ?? 0;
      const mixed = (row === column ? saturation : 0) + (1 - saturation) * weight;
      rows.push(scale * mixed * contrast * gain);
    }
    // Saturation keeps a grey offset grey (the luma weights sum to 1).
    rows.push(0, scale * offset);
  }
  rows.push(0, 0, 0, 1, 0);
  return rows;
}
