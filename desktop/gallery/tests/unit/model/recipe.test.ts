import { describe, expect, test } from 'bun:test';

import { EMPTY_RECIPE } from '../../../src/ipc/gallery.types';
import {
  centredCrop,
  colorMatrix,
  isUnchanged,
  moveCrop,
  presetRatio,
  resizeCrop,
  straightenScale,
  turnedSize,
} from '../../../src/model/recipe.util';

/** Applies a 4×5 colour matrix to one RGB pixel (0–1), unclamped. */
function apply(matrix: readonly number[], [r, g, b]: readonly [number, number, number]) {
  return [0, 1, 2].map(
    (row) =>
      (matrix[row * 5] ?? 0) * r +
      (matrix[row * 5 + 1] ?? 0) * g +
      (matrix[row * 5 + 2] ?? 0) * b +
      (matrix[row * 5 + 4] ?? 0),
  );
}

describe('recipe', () => {
  test('the empty recipe changes nothing', () => {
    expect(isUnchanged(EMPTY_RECIPE)).toBe(true);
    expect(isUnchanged({ ...EMPTY_RECIPE, warmth: 0.1 })).toBe(false);
    expect(isUnchanged({ ...EMPTY_RECIPE, quarterTurns: 1 })).toBe(false);
  });

  test('odd quarter turns swap the sides', () => {
    expect(turnedSize({ width: 3, height: 2 }, 1)).toEqual({ width: 2, height: 3 });
    expect(turnedSize({ width: 3, height: 2 }, 2)).toEqual({ width: 3, height: 2 });
  });

  test('straightening zooms in just enough to fill the frame', () => {
    expect(straightenScale({ width: 3, height: 2 }, 0)).toBe(1);
    const scale = straightenScale({ width: 3, height: 2 }, 10);
    expect(scale).toBeGreaterThan(1);
    expect(straightenScale({ width: 3, height: 2 }, -10)).toBeCloseTo(scale);
  });

  test('presets follow the photo’s orientation', () => {
    expect(presetRatio('free', 1.5)).toBeNull();
    expect(presetRatio('original', 1.5)).toBe(1.5);
    expect(presetRatio('4:3', 1.5)).toBeCloseTo(4 / 3);
    expect(presetRatio('4:3', 0.75)).toBeCloseTo(3 / 4);
    expect(presetRatio('square', 0.5)).toBe(1);
  });

  test('a centred crop is the largest of its shape', () => {
    // A square out of a 3:2 photo keeps the full height.
    const crop = centredCrop(1, 1.5);
    expect(crop.height).toBe(1);
    expect(crop.width).toBeCloseTo(2 / 3);
    expect(crop.x).toBeCloseTo(1 / 6);
    // 16:9 out of a 3:2 photo keeps the full width.
    const wide = centredCrop(16 / 9, 1.5);
    expect(wide.width).toBe(1);
    expect(wide.y).toBeGreaterThan(0);
  });

  test('moving a crop keeps it inside the picture', () => {
    const crop = { x: 0.1, y: 0.1, width: 0.5, height: 0.5 };
    expect(moveCrop(crop, 1, 1)).toEqual({ x: 0.5, y: 0.5, width: 0.5, height: 0.5 });
    expect(moveCrop(crop, -1, 0).x).toBe(0);
  });

  test('resizing from a corner keeps the opposite corner still', () => {
    const crop = { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };
    const resized = resizeCrop(crop, 'top-left', 0.1, 0.1, null, 1.5);
    expect(resized.x + resized.width).toBeCloseTo(0.8);
    expect(resized.y + resized.height).toBeCloseTo(0.8);
    expect(resized.width).toBeCloseTo(0.5);
  });

  test('resizing with a locked shape keeps the ratio and stays inside', () => {
    const crop = centredCrop(1, 1.5);
    const resized = resizeCrop(crop, 'bottom-right', 0.5, 0.5, 1, 1.5);
    // Square in pixels: width × 1.5 = height × 1.
    expect(resized.width * 1.5).toBeCloseTo(resized.height);
    expect(resized.x + resized.width).toBeLessThanOrEqual(1 + 1e-9);
    expect(resized.y + resized.height).toBeLessThanOrEqual(1 + 1e-9);
  });

  test('the colour matrix is the identity for no adjustment', () => {
    expect(apply(colorMatrix(EMPTY_RECIPE), [0.2, 0.5, 0.8])).toEqual([0.2, 0.5, 0.8]);
  });

  test('the colour matrix matches the core’s per-pixel maths', () => {
    const recipe = { ...EMPTY_RECIPE, light: 0.5, contrast: 0.3, saturation: -0.4, warmth: 0.6 };
    const pixel = [0.2, 0.5, 0.8] as const;
    // genslate-core-gallery::edit::adjust, step by step.
    const gain = 2 ** recipe.light;
    let channels = pixel.map((value) => value * gain);
    channels = channels.map((value) => (value - 0.5) * (1 + recipe.contrast) + 0.5);
    const luma =
      0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
    channels = channels.map((value) => luma + (value - luma) * (1 + recipe.saturation));
    const expected = [
      (channels[0] ?? 0) * (1 + 0.12 * recipe.warmth),
      channels[1] ?? 0,
      (channels[2] ?? 0) * (1 - 0.12 * recipe.warmth),
    ];
    const actual = apply(colorMatrix(recipe), pixel);
    for (const [index, value] of expected.entries()) {
      expect(actual[index]).toBeCloseTo(value, 10);
    }
  });
});
