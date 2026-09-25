/**
 * Motion: short, calm durations with macOS-like curves and a critically-damped spring for
 * toggles and thumbs. Everything collapses to `instant` under `prefers-reduced-motion`.
 */

import { round } from '../lib/color.math';
import type { MotionTokens } from '../token.types';

/**
 * Samples an under-damped spring (mass 1) into CSS `linear()` stops so the easing is exact
 * in every WebView without JavaScript.
 */
export function springStops(stiffness = 260, damping = 22, samples = 24): number[] {
  const omega = Math.sqrt(stiffness);
  const zeta = damping / (2 * omega);
  const omegaD = omega * Math.sqrt(Math.max(1e-6, 1 - zeta * zeta));
  // Settle time: envelope below 0.1%.
  const duration = -Math.log(0.001) / (zeta * omega);
  const stops: number[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = (i / samples) * duration;
    const envelope = Math.exp(-zeta * omega * t);
    const value = 1 - envelope * (Math.cos(omegaD * t) + ((zeta * omega) / omegaD) * Math.sin(omegaD * t));
    stops.push(round(value, 4));
  }
  stops[stops.length - 1] = 1;
  return stops;
}

export const MOTION: MotionTokens = {
  duration: { instant: 0, fast: 120, base: 180, moderate: 240, slow: 360 },
  easing: {
    standard: { kind: 'cubic-bezier', points: [0.2, 0, 0, 1] },
    enter: { kind: 'cubic-bezier', points: [0.16, 1, 0.3, 1] },
    exit: { kind: 'cubic-bezier', points: [0.4, 0, 1, 1] },
    spring: { kind: 'linear', stops: springStops(), fallback: [0.34, 1.36, 0.64, 1] },
  },
  distance: 4,
  scaleFrom: 0.96,
};
