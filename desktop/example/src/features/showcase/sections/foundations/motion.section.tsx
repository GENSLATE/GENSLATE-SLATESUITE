import { Button, useReducedMotion } from '@genslate/design-system';
import { MOTION } from '@genslate/tokens';
import { useState } from 'react';
import { Specimen } from '../../components/specimen.component';

const EASINGS = [
  { name: 'standard', className: 'ease-standard', use: 'Colour, hover, small moves' },
  { name: 'enter', className: 'ease-enter', use: 'Popups appearing' },
  { name: 'exit', className: 'ease-exit', use: 'Popups leaving' },
  { name: 'spring', className: 'ease-spring', use: 'Toggles, thumbs, selection' },
] as const;

const DURATIONS = [
  { name: 'fast', className: 'duration-fast' },
  { name: 'base', className: 'duration-base' },
  { name: 'moderate', className: 'duration-moderate' },
  { name: 'slow', className: 'duration-slow' },
] as const;

function Track({
  label,
  meta,
  moved,
  className,
}: {
  label: string;
  meta: string;
  moved: boolean;
  className: string;
}) {
  return (
    <div className="grid grid-cols-[10rem_1fr_13rem] items-center gap-4">
      <span className="whitespace-nowrap font-mono text-accent-fg text-code">{label}</span>
      <div className="@container relative h-6 rounded-full bg-fill-hover">
        <span
          className={`absolute top-1 left-1 size-4 rounded-full bg-accent shadow-control transition-transform ${className}`}
          style={{ transform: moved ? 'translateX(calc(100cqw - 1.5rem))' : 'translateX(0)' }}
        />
      </div>
      <span className="truncate text-fg-muted text-sm">{meta}</span>
    </div>
  );
}

export function MotionSection() {
  const [moved, setMoved] = useState(false);
  const reduced = useReducedMotion();
  const play = (
    <Button size="sm" leadingIcon="codicon:play" onClick={() => setMoved(!moved)}>
      Play
    </Button>
  );

  return (
    <>
      <Specimen
        title="Easing"
        description={`Transform and opacity only.${reduced ? ' Reduced motion is on: animations are instant.' : ''}`}
        aside={play}
        stageClassName="flex-col items-stretch gap-3"
      >
        {EASINGS.map((easing) => (
          <Track
            key={easing.name}
            label={easing.className}
            meta={easing.use}
            moved={moved}
            className={`duration-slow ${easing.className}`}
          />
        ))}
      </Specimen>

      <Specimen title="Duration" aside={play} stageClassName="flex-col items-stretch gap-3">
        {DURATIONS.map((duration) => (
          <Track
            key={duration.name}
            label={duration.className}
            meta={`${MOTION.duration[duration.name]}ms`}
            moved={moved}
            className={`ease-standard ${duration.className}`}
          />
        ))}
      </Specimen>

      <Specimen
        title="Popup choreography"
        stageClassName="flex-col items-start gap-1 text-base text-fg-secondary"
      >
        <p>
          Enter: opacity 0 → 1, scale {MOTION.scaleFrom} → 1, {MOTION.distance}px rise ·
          duration-base · ease-enter
        </p>
        <p>Exit: reverse · duration-fast · ease-exit</p>
        <p>Theme switches repaint instantly (transitions are suspended for one frame).</p>
      </Specimen>
    </>
  );
}
