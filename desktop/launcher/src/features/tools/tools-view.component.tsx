import type { CodiconRef } from '@genslate/design-system';
import { Button, cn, Icon, Kbd } from '@genslate/design-system';

/** What the tools view will hold — shown as quiet, disabled previews. */
const UPCOMING: readonly { icon: CodiconRef; label: string }[] = [
  { icon: 'codicon:settings-gear', label: 'Settings' },
  { icon: 'codicon:extensions', label: 'App manager' },
  { icon: 'codicon:database', label: 'Storage & backup' },
  { icon: 'codicon:pulse', label: 'Diagnostics' },
  { icon: 'codicon:sparkle', label: 'AI tools' },
];

export interface ToolsViewProps {
  readonly onClose: () => void;
}

/**
 * The wide tools view (the frame and well widen to make room). v1: a polished "Feature Coming
 * Soon" state; real tools plug in here later.
 */
export function ToolsView({ onClose }: ToolsViewProps) {
  return (
    <section
      aria-label="Tools"
      data-slot="tools-view"
      className="launcher-fade-up flex h-full flex-col items-center justify-center gap-6 px-10 [animation-delay:120ms]"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="relative grid size-16 place-items-center rounded-2xl bg-accent-subtle text-accent-fg ring-1 ring-accent-border">
          <Icon name="codicon:tools" size={20} className="scale-150" />
          <span className="absolute -inset-1.5 animate-pulse-soft rounded-[1.25rem] ring-1 ring-accent-border" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="font-semibold text-fg-strong text-xl">Feature Coming Soon</h2>
          <p className="max-w-sm text-fg-muted text-sm">
            The GENSLATE toolbox is on its way — this is where your tools will open, with all the
            room they need.
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap justify-center gap-2" aria-label="Coming later">
        {UPCOMING.map(({ icon, label }, index) => (
          <li
            key={label}
            className={cn(
              'launcher-row-in flex h-8 items-center gap-2 rounded-full px-3 text-fg-muted text-xs ring-1 ring-border-subtle',
            )}
            style={{ animationDelay: `${180 + index * 40}ms` }}
          >
            <Icon name={icon} size={12} />
            {label}
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" leadingIcon="codicon:arrow-left" onClick={onClose}>
        Back to apps{' '}
        <Kbd shortcut="escape" variant="inline" size="sm" className="ml-1 text-fg-muted" />
      </Button>
    </section>
  );
}
