/**
 * T0 colour primitives: the official Nord palette (https://www.nordtheme.com/docs/colors-and-palettes)
 * plus a small set of derived shades. Themes only ever reference these keys.
 */

import { mix, shiftLightness } from '../lib/color.math';
import type { DerivedColor, DerivedColorKey, HexColor, NordColor, NordColorKey } from '../token.types';

export const NORD: Readonly<Record<NordColorKey, NordColor>> = {
  // ── Polar Night ── dark base colours
  'nord-0': { hex: '#2e3440', group: 'Polar Night', usage: 'Dark base: backgrounds, the editor surface.' },
  'nord-1': { hex: '#3b4252', group: 'Polar Night', usage: 'Elevated UI: panels, popovers, status bars.' },
  'nord-2': { hex: '#434c5e', group: 'Polar Night', usage: 'Active line, selection and hover backgrounds.' },
  'nord-3': { hex: '#4c566a', group: 'Polar Night', usage: 'Guides, invisible characters, comments.' },
  // ── Snow Storm ── bright base colours
  'nord-4': { hex: '#d8dee9', group: 'Snow Storm', usage: 'Text on dark; UI elements on light.' },
  'nord-5': { hex: '#e5e9f0', group: 'Snow Storm', usage: 'Subtle UI text / light elevated surfaces.' },
  'nord-6': { hex: '#eceff4', group: 'Snow Storm', usage: 'Brightest text on dark; light background.' },
  // ── Frost ── bluish core accents
  'nord-7': { hex: '#8fbcbb', group: 'Frost', usage: 'Classes, types and primitives.' },
  'nord-8': { hex: '#88c0d0', group: 'Frost', usage: 'Primary accent: focus, primary actions.' },
  'nord-9': { hex: '#81a1c1', group: 'Frost', usage: 'Secondary accent: keywords, info.' },
  'nord-10': { hex: '#5e81ac', group: 'Frost', usage: 'Tertiary accent: pragmas, selections.' },
  // ── Aurora ── status colours
  'nord-11': { hex: '#bf616a', group: 'Aurora', usage: 'Errors and destructive actions.' },
  'nord-12': { hex: '#d08770', group: 'Aurora', usage: 'Advanced / annotations.' },
  'nord-13': { hex: '#ebcb8b', group: 'Aurora', usage: 'Warnings.' },
  'nord-14': { hex: '#a3be8c', group: 'Aurora', usage: 'Success.' },
  'nord-15': { hex: '#b48ead', group: 'Aurora', usage: 'Uncommon / numbers.' },
};

type DerivedOp = DerivedColor['op'];

/** Builds a derived colour, computing its hex from the op (a unit test re-derives it). */
function derive(from: NordColorKey, op: DerivedOp, reason: string): DerivedColor {
  const base = NORD[from].hex;
  let hex: HexColor;
  if (op.kind === 'mix') {
    const other = op.with === 'black' ? '#000000' : op.with === 'white' ? '#ffffff' : primitiveHexOf(op.with);
    hex = mix(base, other, op.weight / 100);
  } else {
    hex = shiftLightness(base, op.kind === 'lighten' ? op.deltaL : -op.deltaL);
  }
  return { hex, from, op, reason };
}

function primitiveHexOf(key: string): HexColor {
  const nord = (NORD as Readonly<Record<string, NordColor | undefined>>)[key];
  if (!nord) throw new Error(`Derived colours may only mix with Nord primitives, got ${key}`);
  return nord.hex;
}

const lighten = (deltaL: number) => ({ kind: 'lighten', deltaL }) as const;
const darken = (deltaL: number) => ({ kind: 'darken', deltaL }) as const;
const over = (withKey: NordColorKey, weight: number) => ({ kind: 'mix', with: withKey, weight }) as const;

export const DERIVED: Readonly<Record<DerivedColorKey, DerivedColor>> = {
  // Polar Night chrome
  'nord-0-d03': derive('nord-0', darken(0.03), 'Receding chrome (titlebar, sidebar, status bar) in Polar Night.'),
  'nord-3-bright': derive('nord-3', lighten(0.1), 'Nord "bright nord3": comments and strong borders on dark.'),
  'nord-3-bright-d05': derive('nord-3', lighten(0.05), 'Placeholder text on dark fields.'),
  // Text ramps (mixes keep Nord hue exactly)
  'nord-4-m0-85': derive('nord-4', over('nord-0', 85), 'Secondary text on dark.'),
  'nord-4-m0-75': derive('nord-4', over('nord-0', 75), 'Muted text on dark (≥ 4.5:1 on every dark surface).'),
  'nord-4-m0-35': derive('nord-4', over('nord-0', 35), 'Disabled text on dark.'),
  'nord-3-m6-45': derive('nord-3', over('nord-6', 45), 'Disabled text on light.'),
  'snow-bright': derive('nord-6', lighten(0.025), 'Snow Storm content surface (brighter than nord6, never pure white).'),
  // Frost
  'nord-8-l03': derive('nord-8', lighten(0.03), 'Primary accent hover (dark).'),
  'nord-8-d04': derive('nord-8', darken(0.04), 'Primary accent pressed (dark).'),
  'nord-9-l04': derive('nord-9', lighten(0.04), 'Info hover (dark).'),
  'nord-9-l08': derive('nord-9', lighten(0.08), 'Info text (dark).'),
  'nord-9-d14': derive('nord-9', darken(0.14), 'Info solid (light).'),
  'nord-9-d20': derive('nord-9', darken(0.2), 'Info text & hover (light).'),
  'nord-10-d08': derive('nord-10', darken(0.08), 'Primary accent (light) — white text ≥ 4.5:1.'),
  'nord-10-d10': derive('nord-10', darken(0.1), 'Primary accent hover (light).'),
  'nord-10-d12': derive('nord-10', darken(0.12), 'Primary accent pressed (light).'),
  // Aurora
  'nord-11-l16': derive('nord-11', lighten(0.16), 'Danger text (dark).'),
  'nord-11-d08': derive('nord-11', darken(0.08), 'Danger solid — white text ≥ 4.5:1.'),
  'nord-11-d10': derive('nord-11', darken(0.1), 'Danger hover / text (light).'),
  'nord-13-l03': derive('nord-13', lighten(0.03), 'Warning hover (dark).'),
  'nord-13-d08': derive('nord-13', darken(0.08), 'Warning hover (light).'),
  'nord-13-d20': derive('nord-13', darken(0.2), 'Warning border (light).'),
  'nord-13-d36': derive('nord-13', darken(0.36), 'Warning text (light).'),
  'nord-14-l03': derive('nord-14', lighten(0.03), 'Success hover (dark).'),
  'nord-14-d08': derive('nord-14', darken(0.08), 'Success solid (light).'),
  'nord-14-d12': derive('nord-14', darken(0.12), 'Success hover (light).'),
  'nord-14-d28': derive('nord-14', darken(0.28), 'Success text (light).'),
};

/** Every primitive a theme may reference, resolved to hex. */
export const PRIMITIVE_HEX: Readonly<Record<string, HexColor>> = {
  ...Object.fromEntries(Object.entries(NORD).map(([k, v]) => [k, v.hex])),
  ...Object.fromEntries(Object.entries(DERIVED).map(([k, v]) => [k, v.hex])),
  black: '#000000',
  white: '#ffffff',
};
