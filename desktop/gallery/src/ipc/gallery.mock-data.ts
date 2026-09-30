/**
 * The sample library the browser mock starts with: a few trips, an everyday camera roll and
 * some screenshots, with plausible dates, cameras, places, tags and albums.
 */
import { random, type SceneKind, type TimeOfDay } from './gallery.mock-scenes';
import type { MediaKind, Place } from './gallery.types';

export const MOCK_ROOT = '/home/genslate/Pictures';

const DAY = 86_400_000;

/** One sample photo or video. */
export interface MockSeed {
  readonly folder: string;
  readonly name: string;
  readonly kind: MediaKind;
  readonly width: number;
  readonly height: number;
  readonly date: number;
  readonly size: number;
  readonly durationMs: number | null;
  readonly camera: string | null;
  readonly lens: string | null;
  readonly fNumber: number | null;
  readonly exposure: string | null;
  readonly iso: number | null;
  readonly focalMm: number | null;
  readonly place: (Place & { readonly latitude: number; readonly longitude: number }) | null;
  readonly screenshot: boolean;
  readonly favorite: boolean;
  readonly rating: number;
  readonly tags: readonly string[];
  readonly albums: readonly string[];
  readonly scene: { readonly kind: SceneKind; readonly time: TimeOfDay; readonly seed: number };
}

interface Trip {
  readonly folder: string;
  readonly daysAgo: number;
  readonly days: number;
  readonly count: number;
  readonly scenes: readonly SceneKind[];
  readonly times: readonly TimeOfDay[];
  readonly places: readonly (Place & { latitude: number; longitude: number })[];
  readonly tags: readonly string[];
  readonly album: string | null;
  readonly camera: 'fuji' | 'sony' | 'phone';
  readonly videos: number;
}

const PLACES = {
  reykjavik: {
    city: 'Reykjavík',
    region: 'Capital Region',
    country: 'IS',
    latitude: 64.1466,
    longitude: -21.9426,
  },
  vik: { city: 'Vík', region: 'South', country: 'IS', latitude: 63.4186, longitude: -19.006 },
  lisbon: {
    city: 'Lisbon',
    region: 'Lisbon',
    country: 'PT',
    latitude: 38.7223,
    longitude: -9.1393,
  },
  porto: { city: 'Porto', region: 'Porto', country: 'PT', latitude: 41.1579, longitude: -8.6291 },
  lagos: { city: 'Lagos', region: 'Faro', country: 'PT', latitude: 37.1028, longitude: -8.6742 },
  kyoto: { city: 'Kyoto', region: 'Kyoto', country: 'JP', latitude: 35.0116, longitude: 135.7681 },
  tokyo: { city: 'Tokyo', region: 'Tokyo', country: 'JP', latitude: 35.6762, longitude: 139.6503 },
  banff: {
    city: 'Banff',
    region: 'Alberta',
    country: 'CA',
    latitude: 51.1784,
    longitude: -115.5708,
  },
  oslo: { city: 'Oslo', region: 'Oslo', country: 'NO', latitude: 59.9139, longitude: 10.7522 },
} as const;

const TRIPS: readonly Trip[] = [
  {
    folder: 'Camera Roll',
    daysAgo: 0,
    days: 48,
    count: 34,
    scenes: ['meadow', 'city', 'forest', 'lights', 'lake', 'sea'],
    times: ['day', 'golden', 'dusk', 'overcast', 'night'],
    places: [PLACES.oslo],
    tags: [],
    album: null,
    camera: 'phone',
    videos: 3,
  },
  {
    folder: 'Trips/Portugal',
    daysAgo: 72,
    days: 11,
    count: 30,
    scenes: ['sea', 'sea', 'city', 'dunes', 'meadow'],
    times: ['day', 'golden', 'dusk', 'day'],
    places: [PLACES.lisbon, PLACES.porto, PLACES.lagos],
    tags: ['beach', 'summer'],
    album: 'Summer in Portugal',
    camera: 'fuji',
    videos: 2,
  },
  {
    folder: 'Trips/Kyoto',
    daysAgo: 190,
    days: 7,
    count: 20,
    scenes: ['city', 'forest', 'lights', 'meadow', 'lake'],
    times: ['dawn', 'day', 'dusk', 'night'],
    places: [PLACES.kyoto, PLACES.tokyo],
    tags: ['japan'],
    album: 'Kyoto & Tokyo',
    camera: 'sony',
    videos: 1,
  },
  {
    folder: 'Trips/Iceland',
    daysAgo: 330,
    days: 9,
    count: 26,
    scenes: ['aurora', 'snow', 'mountains', 'lake', 'sea'],
    times: ['night', 'overcast', 'dawn', 'golden'],
    places: [PLACES.reykjavik, PLACES.vik],
    tags: ['iceland', 'landscape'],
    album: 'Iceland',
    camera: 'fuji',
    videos: 2,
  },
  {
    folder: 'Trips/Banff',
    daysAgo: 480,
    days: 5,
    count: 16,
    scenes: ['mountains', 'lake', 'forest', 'snow'],
    times: ['day', 'dawn', 'golden'],
    places: [PLACES.banff],
    tags: ['hike', 'landscape'],
    album: null,
    camera: 'sony',
    videos: 1,
  },
];

const CAMERAS = {
  fuji: { camera: 'FUJIFILM X-T5', lens: 'XF16-55mmF2.8 R LM WR', prefix: 'DSCF' },
  sony: { camera: 'Sony ILCE-7M4', lens: 'FE 24-70mm F2.8 GM II', prefix: 'DSC0' },
  phone: { camera: 'Google Pixel 9 Pro', lens: 'Pixel 9 Pro back camera', prefix: 'PXL_' },
} as const;

const ASPECTS = [
  [6000, 4000],
  [6000, 4000],
  [4000, 6000],
  [4032, 3024],
  [3024, 4032],
  [3840, 2160],
  [3000, 3000],
] as const;

const EXPOSURES = ['1/4000', '1/1000', '1/250', '1/125', '1/60', '1/15', '2', '15'] as const;

function pick<T>(rnd: () => number, list: readonly T[]): T {
  const value = list[Math.floor(rnd() * list.length)];
  if (value === undefined) throw new Error('empty list');
  return value;
}

function two(value: number): string {
  return String(value).padStart(2, '0');
}

/** The sample library, dated relative to `now`. */
export function mockSeeds(now: number): readonly MockSeed[] {
  const rnd = random(20_260_929);
  const seeds: MockSeed[] = [];
  let counter = 1000;
  for (const trip of TRIPS) {
    const gear = CAMERAS[trip.camera];
    for (let index = 0; index < trip.count; index += 1) {
      counter += 1;
      const date = Math.round(
        now - (trip.daysAgo + trip.days * (1 - index / trip.count)) * DAY + rnd() * DAY * 0.8,
      );
      const video = index % Math.max(1, Math.floor(trip.count / Math.max(1, trip.videos))) === 3;
      const [width, height] = video ? [3840, 2160] : pick(rnd, ASPECTS);
      const kind = pick(rnd, trip.scenes);
      const time = kind === 'aurora' ? 'night' : pick(rnd, trip.times);
      const place = pick(rnd, trip.places);
      const at = new Date(date);
      const stamp = `${at.getFullYear()}${two(at.getMonth() + 1)}${two(at.getDate())}`;
      const name =
        trip.camera === 'phone'
          ? `${gear.prefix}${stamp}_${two(at.getHours())}${two(at.getMinutes())}${two(counter % 60)}.${video ? 'mp4' : 'jpg'}`
          : `${gear.prefix}${counter}.${video ? 'MOV' : 'JPG'}`;
      const tags = [...trip.tags];
      if (time === 'golden' || time === 'dusk') tags.push('sunset');
      if (kind === 'aurora') tags.push('aurora');
      seeds.push({
        folder: `${MOCK_ROOT}/${trip.folder}`,
        name,
        kind: video ? 'video' : 'image',
        width,
        height,
        date,
        size: video ? Math.round(40e6 + rnd() * 180e6) : Math.round(2.5e6 + rnd() * 9e6),
        durationMs: video ? Math.round(6000 + rnd() * 90_000) : null,
        camera: gear.camera,
        lens: gear.lens,
        fNumber: video ? null : pick(rnd, [1.8, 2.8, 4, 5.6, 8, 11]),
        exposure: video
          ? null
          : time === 'night'
            ? pick(rnd, ['2', '8', '15'])
            : pick(rnd, EXPOSURES),
        iso: video
          ? null
          : time === 'night'
            ? pick(rnd, [1600, 3200, 6400])
            : pick(rnd, [100, 160, 200, 400]),
        focalMm: video ? null : pick(rnd, [16, 23, 35, 50, 70]),
        place,
        screenshot: false,
        favorite: rnd() < 0.14,
        rating: rnd() < 0.2 ? 3 + Math.floor(rnd() * 3) : 0,
        tags,
        albums: trip.album === null || rnd() < 0.3 ? [] : [trip.album],
        scene: { kind, time, seed: counter * 7919 },
      });
    }
  }
  for (let index = 0; index < 7; index += 1) {
    counter += 1;
    const date = Math.round(now - (index * 6 + rnd() * 4) * DAY);
    const at = new Date(date);
    seeds.push({
      folder: `${MOCK_ROOT}/Screenshots`,
      name: `Screenshot ${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())} ${two(at.getHours())}${two(at.getMinutes())}.png`,
      kind: 'image',
      width: 2560,
      height: 1600,
      date,
      size: Math.round(300e3 + rnd() * 900e3),
      durationMs: null,
      camera: null,
      lens: null,
      fNumber: null,
      exposure: null,
      iso: null,
      focalMm: null,
      place: null,
      screenshot: true,
      favorite: false,
      rating: 0,
      tags: [],
      albums: [],
      scene: { kind: 'screenshot', time: 'day', seed: counter * 104_729 },
    });
  }
  return seeds;
}
