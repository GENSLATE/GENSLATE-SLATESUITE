/**
 * Procedural "photos" for the browser mock: small SVG landscapes (mountains, sea, forest,
 * city, dunes, lakes, aurora…) drawn from a seed, so the sample library looks like a real
 * camera roll in screenshots without shipping any image files.
 */

export type SceneKind =
  | 'mountains'
  | 'sea'
  | 'forest'
  | 'city'
  | 'dunes'
  | 'lake'
  | 'aurora'
  | 'meadow'
  | 'snow'
  | 'lights'
  | 'screenshot';

export type TimeOfDay = 'dawn' | 'day' | 'golden' | 'dusk' | 'night' | 'overcast';

/** A small, fast, seeded random number generator (mulberry32). */
export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const SKIES: Readonly<Record<TimeOfDay, readonly [string, string, string]>> = {
  dawn: ['#7d93c9', '#e9b8b0', '#f7dcc0'],
  day: ['#3f86d0', '#8cc0ec', '#d8ecfa'],
  golden: ['#4a5c9a', '#e8906a', '#f9cf85'],
  dusk: ['#1f2350', '#8b4f7d', '#f08a5d'],
  night: ['#070b1f', '#142148', '#2c3f73'],
  overcast: ['#8390a0', '#b4bdc7', '#dfe3e8'],
};

const LIGHT: Readonly<Record<TimeOfDay, number>> = {
  dawn: 0.8,
  day: 1,
  golden: 0.85,
  dusk: 0.55,
  night: 0.3,
  overcast: 0.75,
};

function shade(hex: string, factor: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) =>
    Math.max(0, Math.min(255, Math.round(((value >> shift) & 0xff) * factor)));
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

function mix(a: string, b: string, amount: number): string {
  const pa = Number.parseInt(a.slice(1), 16);
  const pb = Number.parseInt(b.slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((pa >> shift) & 0xff) * (1 - amount) + ((pb >> shift) & 0xff) * amount);
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')}`;
}

interface Canvas {
  readonly w: number;
  readonly h: number;
  readonly rnd: () => number;
  readonly time: TimeOfDay;
  readonly parts: string[];
}

function sky({ w, h, time, parts }: Canvas, horizon: number) {
  const [top, middle, bottom] = SKIES[time];
  parts.push(
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".6" stop-color="${middle}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`,
    `<radialGradient id="g"><stop offset="0" stop-color="#fff6d8" stop-opacity=".95"/><stop offset=".25" stop-color="#ffe2a0" stop-opacity=".55"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>`,
    `<rect width="${w}" height="${h}" fill="url(#s)"/>`,
  );
  return horizon;
}

function sunOrMoon(canvas: Canvas, horizon: number) {
  const { w, rnd, time, parts } = canvas;
  if (time === 'overcast') return;
  const x = w * (0.2 + rnd() * 0.6);
  if (time === 'night') {
    for (let index = 0; index < 60; index += 1) {
      parts.push(
        `<circle cx="${(rnd() * w).toFixed(1)}" cy="${(rnd() * horizon * 0.9).toFixed(1)}" r="${(rnd() * 0.9 + 0.2).toFixed(2)}" fill="#fff" opacity="${(rnd() * 0.7 + 0.3).toFixed(2)}"/>`,
      );
    }
    parts.push(`<circle cx="${x}" cy="${horizon * 0.3}" r="${w * 0.03}" fill="#f4f1e0"/>`);
    return;
  }
  const y = time === 'day' ? horizon * 0.3 : horizon * (0.75 + rnd() * 0.15);
  parts.push(
    `<circle cx="${x}" cy="${y}" r="${w * 0.22}" fill="url(#g)"/>`,
    `<circle cx="${x}" cy="${y}" r="${w * 0.035}" fill="#fff8e6"/>`,
  );
}

/** A jagged ridge from left to right around `base`, filled down to the bottom. */
function ridge(canvas: Canvas, base: number, height: number, color: string, jag = 10) {
  const { w, h, rnd, parts } = canvas;
  let d = `M0 ${h} L0 ${base - rnd() * height}`;
  const steps = jag + Math.floor(rnd() * jag);
  for (let index = 1; index <= steps; index += 1) {
    d += ` L${((index / steps) * w).toFixed(1)} ${(base - rnd() * height).toFixed(1)}`;
  }
  parts.push(`<path d="${d} L${w} ${h} Z" fill="${color}"/>`);
}

/** A soft, rolling ridge (hills, dunes). */
function hills(canvas: Canvas, base: number, height: number, color: string) {
  const { w, h, rnd, parts } = canvas;
  let d = `M0 ${h} L0 ${base}`;
  const steps = 3 + Math.floor(rnd() * 3);
  for (let index = 0; index < steps; index += 1) {
    const x0 = (index / steps) * w;
    const x1 = ((index + 1) / steps) * w;
    d += ` Q${((x0 + x1) / 2).toFixed(1)} ${(base - height * (0.4 + rnd())).toFixed(1)} ${x1.toFixed(1)} ${(base - rnd() * height * 0.3).toFixed(1)}`;
  }
  parts.push(`<path d="${d} L${w} ${h} Z" fill="${color}"/>`);
}

function pines(canvas: Canvas, base: number, size: number, color: string, count: number) {
  const { w, rnd, parts } = canvas;
  for (let index = 0; index < count; index += 1) {
    const x = rnd() * w;
    const s = size * (0.6 + rnd() * 0.6);
    const y = base + rnd() * size * 0.4;
    parts.push(
      `<path d="M${x.toFixed(1)} ${(y - s * 2.4).toFixed(1)} L${(x + s * 0.7).toFixed(1)} ${y.toFixed(1)} L${(x - s * 0.7).toFixed(1)} ${y.toFixed(1)} Z" fill="${color}"/>`,
    );
  }
}

function water(canvas: Canvas, horizon: number, tint: string) {
  const { w, h, rnd, time, parts } = canvas;
  const [top, , bottom] = SKIES[time];
  parts.push(
    `<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(bottom, tint, 0.5)}"/><stop offset="1" stop-color="${mix(top, tint, 0.6)}"/></linearGradient></defs>`,
    `<rect y="${horizon}" width="${w}" height="${h - horizon}" fill="url(#w)"/>`,
  );
  for (let index = 0; index < 26; index += 1) {
    const y = horizon + rnd() ** 1.6 * (h - horizon);
    const x = rnd() * w;
    const length = 4 + rnd() * w * 0.12;
    parts.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${length.toFixed(1)}" height=".7" fill="#fff" opacity="${(0.15 + rnd() * 0.25).toFixed(2)}"/>`,
    );
  }
}

function city(canvas: Canvas, base: number) {
  const { w, rnd, time, parts } = canvas;
  const lit = time === 'dusk' || time === 'night';
  let x = 0;
  while (x < w) {
    const width = 10 + rnd() * 22;
    const height = 20 + rnd() * base * 0.55;
    const color = shade('#3b4252', lit ? 0.55 : 1.2 + rnd() * 0.3);
    parts.push(
      `<rect x="${x.toFixed(1)}" y="${(base - height).toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}" fill="${color}"/>`,
    );
    if (lit) {
      for (let wy = base - height + 4; wy < base - 3; wy += 5) {
        for (let wx = x + 2; wx < x + width - 3; wx += 4) {
          if (rnd() < 0.45) {
            parts.push(
              `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="2" height="2.4" fill="#ffd98a" opacity="${(0.6 + rnd() * 0.4).toFixed(2)}"/>`,
            );
          }
        }
      }
    }
    x += width + rnd() * 3;
  }
}

function aurora(canvas: Canvas, horizon: number) {
  const { w, rnd, parts } = canvas;
  parts.push(
    '<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ff0c6" stop-opacity="0"/><stop offset=".5" stop-color="#66e3a4" stop-opacity=".55"/><stop offset="1" stop-color="#3fbf9b" stop-opacity="0"/></linearGradient></defs>',
  );
  for (let band = 0; band < 3; band += 1) {
    const y = horizon * (0.15 + band * 0.18 + rnd() * 0.1);
    let d = `M0 ${y.toFixed(1)}`;
    for (let index = 1; index <= 6; index += 1) {
      d += ` Q${((index - 0.5) * (w / 6)).toFixed(1)} ${(y + (rnd() - 0.5) * 60).toFixed(1)} ${(index * (w / 6)).toFixed(1)} ${(y + (rnd() - 0.5) * 30).toFixed(1)}`;
    }
    parts.push(
      `<path d="${d} L${w} ${(y + 70).toFixed(1)} L0 ${(y + 70).toFixed(1)} Z" fill="url(#a)" opacity="${(0.5 + rnd() * 0.4).toFixed(2)}"/>`,
    );
  }
}

function meadow(canvas: Canvas, base: number) {
  const { w, h, rnd, time, parts } = canvas;
  hills(canvas, base, 18, shade('#7fa35a', LIGHT[time]));
  const colors = ['#f2c14e', '#f78154', '#e6e6ea', '#b48ead', '#ebcb8b'];
  for (let index = 0; index < 160; index += 1) {
    const y = base + rnd() ** 0.7 * (h - base);
    const r = 0.4 + ((y - base) / (h - base)) * 2.4;
    parts.push(
      `<circle cx="${(rnd() * w).toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${colors[Math.floor(rnd() * colors.length)] ?? '#fff'}" opacity=".9"/>`,
    );
  }
}

function lights(canvas: Canvas) {
  const { w, h, rnd, parts } = canvas;
  parts.push(`<rect width="${w}" height="${h}" fill="#10121c"/>`);
  const colors = ['#ffcf70', '#ff8a65', '#88c0d0', '#b48ead', '#a3be8c'];
  for (let index = 0; index < 40; index += 1) {
    const r = 4 + rnd() * 22;
    parts.push(
      `<circle cx="${(rnd() * w).toFixed(1)}" cy="${(rnd() * h).toFixed(1)}" r="${r.toFixed(1)}" fill="${colors[Math.floor(rnd() * colors.length)] ?? '#fff'}" opacity="${(0.15 + rnd() * 0.45).toFixed(2)}"/>`,
    );
  }
}

function screenshot({ w, h, rnd, parts }: Canvas) {
  const dark = rnd() < 0.6;
  const bg = dark ? '#2e3440' : '#eceff4';
  const panel = dark ? '#3b4252' : '#e5e9f0';
  const line = dark ? '#4c566a' : '#d8dee9';
  const text = dark ? '#d8dee9' : '#4c566a';
  parts.push(
    `<rect width="${w}" height="${h}" fill="${bg}"/>`,
    `<rect width="${w}" height="${h * 0.07}" fill="${panel}"/>`,
    `<circle cx="${w * 0.03}" cy="${h * 0.035}" r="${h * 0.012}" fill="#bf616a"/><circle cx="${w * 0.06}" cy="${h * 0.035}" r="${h * 0.012}" fill="#ebcb8b"/><circle cx="${w * 0.09}" cy="${h * 0.035}" r="${h * 0.012}" fill="#a3be8c"/>`,
    `<rect y="${h * 0.07}" width="${w * 0.22}" height="${h * 0.93}" fill="${panel}"/>`,
  );
  for (let row = 0; row < 12; row += 1) {
    const y = h * (0.12 + row * 0.065);
    parts.push(
      `<rect x="${w * 0.03}" y="${y.toFixed(1)}" width="${(w * (0.08 + rnd() * 0.1)).toFixed(1)}" height="${h * 0.02}" rx="1" fill="${line}"/>`,
      `<rect x="${w * 0.26}" y="${y.toFixed(1)}" width="${(w * (0.2 + rnd() * 0.5)).toFixed(1)}" height="${h * 0.02}" rx="1" fill="${row % 4 === 0 ? '#88c0d0' : text}" opacity=".7"/>`,
    );
  }
}

/** Draws a scene as SVG markup with the given aspect (`width` × `height`). */
export function drawScene(
  seed: number,
  kind: SceneKind,
  time: TimeOfDay,
  width: number,
  height: number,
): string {
  const w = 320;
  const h = Math.round((w * height) / width);
  const canvas: Canvas = { w, h, rnd: random(seed), time, parts: [] };
  const light = LIGHT[time];
  const horizon = h * (0.5 + canvas.rnd() * 0.15);

  switch (kind) {
    case 'screenshot':
      screenshot(canvas);
      break;
    case 'lights':
      lights(canvas);
      break;
    default: {
      sky(canvas, horizon);
      if (kind === 'aurora') aurora(canvas, horizon);
      sunOrMoon(canvas, horizon);
      drawLand(canvas, kind, horizon, light);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">${canvas.parts.join('')}</svg>`;
}

function drawLand(canvas: Canvas, kind: SceneKind, horizon: number, light: number) {
  const { w, h } = canvas;
  switch (kind) {
    case 'mountains':
      ridge(canvas, horizon, h * 0.35, shade('#8a9ab8', light), 7);
      ridge(canvas, horizon + h * 0.08, h * 0.25, shade('#5a6b86', light), 9);
      ridge(canvas, horizon + h * 0.2, h * 0.15, shade('#34425a', light), 12);
      break;
    case 'snow':
      ridge(canvas, horizon, h * 0.3, shade('#e8eef6', light), 6);
      hills(canvas, horizon + h * 0.12, h * 0.1, shade('#f4f7fb', light));
      pines(canvas, horizon + h * 0.2, h * 0.06, shade('#2f3d33', light), 14);
      break;
    case 'sea':
      water(canvas, horizon, '#2b6f8f');
      hills(canvas, h * 0.9, h * 0.08, shade('#e3cf9f', light));
      break;
    case 'lake':
      ridge(canvas, horizon, h * 0.3, shade('#6f7f98', light), 8);
      pines(canvas, horizon, h * 0.05, shade('#2e4a3a', light), 40);
      water(canvas, horizon + 2, '#35607a');
      break;
    case 'forest':
      hills(canvas, horizon, h * 0.12, shade('#4f6b4a', light));
      pines(canvas, horizon + h * 0.12, h * 0.1, shade('#2b4633', light), 28);
      pines(canvas, h * 0.95, h * 0.16, shade('#1d3326', light), 16);
      break;
    case 'city':
      city(canvas, horizon + h * 0.2);
      water(canvas, horizon + h * 0.2, '#28445e');
      break;
    case 'dunes':
      hills(canvas, horizon + h * 0.05, h * 0.18, shade('#d9a86c', light));
      hills(canvas, horizon + h * 0.2, h * 0.16, shade('#c58d52', light));
      hills(canvas, h * 0.92, h * 0.14, shade('#a8703e', light));
      break;
    case 'aurora':
      ridge(canvas, horizon + h * 0.1, h * 0.15, '#0e1528', 10);
      water(canvas, horizon + h * 0.2, '#10302e');
      break;
    case 'meadow':
      meadow(canvas, horizon + h * 0.05);
      break;
    default:
      canvas.parts.push(
        `<rect y="${horizon}" width="${w}" height="${h - horizon}" fill="${shade('#6b7d5a', light)}"/>`,
      );
  }
}

/** The scene as a data URL for `<img src>`. */
export function sceneUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
