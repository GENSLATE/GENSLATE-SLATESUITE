import { describe, expect, test } from 'bun:test';
import {
  CHROME_COLOR_KEYS,
  contrastRatio,
  DERIVED,
  mix,
  NORD,
  opticalTracking,
  resolveHex,
  SEMANTIC_COLOR_KEYS,
  shiftLightness,
  springStops,
  THEMES,
} from '../../src/index';
import { checkContrast } from '../../scripts/emit/data.emitter';

describe('Nord palette', () => {
  test('matches the official hex values', () => {
    expect(NORD['nord-0'].hex).toBe('#2e3440');
    expect(NORD['nord-6'].hex).toBe('#eceff4');
    expect(NORD['nord-8'].hex).toBe('#88c0d0');
    expect(NORD['nord-11'].hex).toBe('#bf616a');
  });

  test('derived shades re-derive from their op', () => {
    for (const [key, d] of Object.entries(DERIVED)) {
      const base = NORD[d.from].hex;
      const expected =
        d.op.kind === 'mix'
          ? mix(base, NORD[d.op.with as keyof typeof NORD].hex, d.op.weight / 100)
          : shiftLightness(base, d.op.kind === 'lighten' ? d.op.deltaL : -d.op.deltaL);
      expect(d.hex, key).toBe(expected);
    }
  });

  test('pins a few derived values', () => {
    expect(DERIVED['nord-4-m0-85'].hex).toBe('#bfc5d0');
    expect(DERIVED['nord-0-d03'].hex).toBe('#272c38');
  });
});

describe('themes', () => {
  test('define every semantic and chrome key', () => {
    for (const theme of Object.values(THEMES)) {
      for (const key of [...SEMANTIC_COLOR_KEYS, ...CHROME_COLOR_KEYS]) {
        expect(resolveHex(theme, key)).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  test('every declared contrast pair passes WCAG AA', () => {
    const failures = checkContrast(Object.values(THEMES)).filter((r) => !r.pass);
    expect(failures).toEqual([]);
  });

  test('body text is comfortably readable', () => {
    const dark = THEMES['polar-night'];
    expect(contrastRatio(resolveHex(dark, 'fg'), resolveHex(dark, 'canvas'))).toBeGreaterThan(7);
  });
});

describe('scales', () => {
  test('optical tracking tightens as size grows', () => {
    expect(opticalTracking(11)).toBeGreaterThan(opticalTracking(13));
    expect(opticalTracking(13)).toBeGreaterThan(opticalTracking(24));
  });

  test('spring starts at 0, settles at 1 and overshoots', () => {
    const stops = springStops();
    expect(stops[0]).toBe(0);
    expect(stops.at(-1)).toBe(1);
    expect(Math.max(...stops)).toBeGreaterThan(1);
  });
});
