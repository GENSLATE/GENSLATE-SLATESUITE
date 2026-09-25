import { Badge } from '@genslate/design-system';
import { TYPOGRAPHY } from '@genslate/tokens';
import { Specimen } from '../../components/specimen.component';

const SCALE = [
  { key: '2xs', className: 'text-2xs', use: 'Badges, section titles' },
  { key: 'xs', className: 'text-xs', use: 'Status bar, captions' },
  { key: 'sm', className: 'text-sm', use: 'Secondary UI, tables' },
  { key: 'base', className: 'text-base', use: 'Default UI text' },
  { key: 'md', className: 'text-md', use: 'Emphasised UI, card titles' },
  { key: 'lg', className: 'text-lg', use: 'Dialog titles' },
  { key: 'xl', className: 'text-xl', use: 'Section headings' },
  { key: '2xl', className: 'text-2xl', use: 'Page titles' },
  { key: '3xl', className: 'text-3xl', use: 'Hero numbers' },
] as const;

const WEIGHTS = [
  { name: 'Regular', className: 'font-normal', value: 400 },
  { name: 'Medium', className: 'font-medium', value: 500 },
  { name: 'Semibold', className: 'font-semibold', value: 600 },
] as const;

export function TypographySection() {
  return (
    <>
      <Specimen
        title="Type scale"
        description="13px base with optical tracking: tighter as text grows, looser as it shrinks."
        stageClassName="flex-col items-stretch gap-0 p-0"
      >
        {SCALE.map((step) => {
          const token = TYPOGRAPHY.scale[step.key];
          return (
            <div
              key={step.key}
              className="not-first:hairline-t grid grid-cols-[9rem_1fr] items-baseline gap-6 px-6 py-3.5"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-accent-fg text-code">{step.className}</span>
                <span className="text-fg-muted text-xs tabular-nums">
                  {token.size}/{token.lineHeight} · {(token.tracking * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex min-w-0 items-baseline justify-between gap-4">
                <span className={`${step.className} truncate-flex text-fg-strong`}>
                  The quick fox crosses the polar night
                </span>
                <span className="shrink-0 text-fg-muted text-xs">{step.use}</span>
              </div>
            </div>
          );
        })}
      </Specimen>

      <Specimen
        title="Weights"
        description="Inter Variable; SF Pro on macOS."
        stageClassName="grid grid-cols-3 gap-4"
      >
        {WEIGHTS.map((weight) => (
          <div key={weight.name} className="flex flex-col gap-1">
            <span className={`text-2xl text-fg-strong ${weight.className}`}>Aa Nord</span>
            <span className="text-fg-muted text-sm">
              {weight.name} · {weight.value} ·{' '}
              <code className="text-accent-fg">{weight.className}</code>
            </span>
          </div>
        ))}
      </Specimen>

      <Specimen title="Text colours" stageClassName="flex-col items-start gap-1.5">
        <p className="text-fg-strong text-md">fg-strong — titles and emphasis</p>
        <p className="text-fg text-md">fg — body and controls</p>
        <p className="text-fg-secondary text-md">fg-secondary — supporting text</p>
        <p className="text-fg-muted text-md">fg-muted — hints, metadata, placeholders</p>
        <p className="text-fg-disabled text-md">fg-disabled — unavailable</p>
        <p className="text-accent-fg text-md">accent-fg — links and highlights</p>
      </Specimen>

      <Specimen title="Monospace & numbers" stageClassName="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-1.5">
          <Badge size="sm">font-mono · text-code</Badge>
          <code className="text-code text-fg">{'const theme = useTheme(); // 12/18'}</code>
          <code className="text-code text-fg-muted">{'=> !== <= >= ::'}</code>
        </div>
        <div className="flex flex-col gap-1.5">
          <Badge size="sm">tabular-nums</Badge>
          <span className="text-base text-fg tabular-nums">1,111.11 · 8,888.88</span>
          <span className="text-base text-fg-muted">1,111.11 · 8,888.88 (proportional)</span>
        </div>
      </Specimen>
    </>
  );
}
