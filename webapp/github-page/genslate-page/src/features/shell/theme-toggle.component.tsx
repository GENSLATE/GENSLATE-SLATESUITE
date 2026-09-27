import { IconButton, useTheme } from '@genslate/design-system';
import { type MouseEvent, useId } from 'react';
import { flushSync } from 'react-dom';

import { runViewTransition } from '../../app/view-transition.util';

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315] as const;

/** A sun that eclipses into a moon; the state comes from `html[data-theme]` (site.motion.css). */
function ThemeGlyph() {
  const mask = useId();
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="theme-glyph">
      <mask id={mask}>
        <rect width="24" height="24" fill="white" />
        <circle className="theme-glyph-cut" cx="19" cy="6" r="6.5" fill="black" />
      </mask>
      <circle
        className="theme-glyph-core"
        cx="12"
        cy="12"
        r="5.5"
        fill="currentColor"
        mask={`url(#${mask})`}
      />
      <g className="theme-glyph-rays" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        {RAYS.map((angle) => (
          <line
            key={angle}
            x1="12"
            y1="2.2"
            x2="12"
            y2="4.2"
            transform={`rotate(${angle} 12 12)`}
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * Switches Polar Night ⇄ Snow Storm; the new theme grows out of the button in a circular view
 * transition.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const next = resolvedTheme === 'polar-night' ? 'snow-storm' : 'polar-night';
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const style = document.documentElement.style;
    style.setProperty('--vt-x', `${x}px`);
    style.setProperty('--vt-y', `${y}px`);
    style.setProperty('--vt-r', `${radius}px`);
    runViewTransition('theme', () => flushSync(() => setTheme(next)));
  };

  return (
    <IconButton
      label="Switch between the dark and light theme"
      tooltip="Polar Night / Snow Storm"
      onClick={toggle}
      icon={<ThemeGlyph />}
    />
  );
}
