import { Button, ProgressBar, Spinner } from '@genslate/design-system';
import { useEffect, useState } from 'react';
import { Specimen } from '../../components/specimen.component';

export function ProgressSection() {
  const [value, setValue] = useState(35);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setValue((current) => {
        if (current >= 100) {
          setRunning(false);
          return 100;
        }
        return Math.min(100, current + 7);
      });
    }, 240);
    return () => clearInterval(timer);
  }, [running]);

  return (
    <>
      <Specimen
        title="Progress bar"
        description="Thin, determinate or indeterminate (value={null})."
        aside={
          <Button
            size="sm"
            leadingIcon="codicon:play"
            onClick={() => {
              setValue(0);
              setRunning(true);
            }}
          >
            Simulate
          </Button>
        }
        stageClassName="grid grid-cols-2 gap-x-10 gap-y-6"
      >
        <ProgressBar label="Uploading assets" value={value} showValue />
        <ProgressBar label="Indexing workspace" value={null} />
        <ProgressBar aria-label="Small" size="sm" value={62} />
        <ProgressBar aria-label="Small indeterminate" size="sm" value={null} />
        <ProgressBar label="Tests passed" tone="success" value={100} showValue />
        <ProgressBar label="Disk almost full" tone="warning" value={88} showValue />
      </Specimen>

      <Specimen title="Spinner" description="A thin ring in the current colour: 12 · 14 · 16 · 20 · 32.">
        {([12, 14, 16, 20, 32] as const).map((size) => (
          <Spinner key={size} size={size} className="text-fg-secondary" />
        ))}
        <Spinner size={16} className="text-accent-fg" label="Connecting" />
        <span className="flex items-center gap-2 text-sm text-fg-muted">
          <Spinner size={14} decorative /> Loading extensions…
        </span>
      </Specimen>
    </>
  );
}
