import { cn, Icon } from '@genslate/design-system';
import { useState } from 'react';

/** The sixteen official Nord colours (arcticicestudio/nord). */
const NORD = [
  {
    group: 'Polar Night',
    note: 'Dark surfaces',
    colors: ['#2e3440', '#3b4252', '#434c5e', '#4c566a'],
  },
  {
    group: 'Snow Storm',
    note: 'Light surfaces, dark text',
    colors: ['#d8dee9', '#e5e9f0', '#eceff4'],
  },
  {
    group: 'Frost',
    note: 'Accent, focus, links',
    colors: ['#8fbcbb', '#88c0d0', '#81a1c1', '#5e81ac'],
  },
  {
    group: 'Aurora',
    note: 'Status only',
    colors: ['#bf616a', '#d08770', '#ebcb8b', '#a3be8c', '#b48ead'],
  },
] as const;

const OFFSETS = { 'Polar Night': 0, 'Snow Storm': 4, Frost: 7, Aurora: 11 } as const;

/** Swatches that copy their hex value on click. */
export function NordPalette() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (hex: string) => {
    navigator.clipboard.writeText(hex).then(
      () => {
        setCopied(hex);
        window.setTimeout(() => setCopied((current) => (current === hex ? null : current)), 1400);
      },
      // Clipboard can be blocked; the hex stays visible on the swatch.
      () => undefined,
    );
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {NORD.map((group) => (
        <div key={group.group}>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-semibold text-fg-strong text-lg">{group.group}</h3>
            <span className="text-fg-muted text-sm">{group.note}</span>
          </div>
          <ul className="grid grid-cols-5 gap-2">
            {group.colors.map((hex, index) => {
              const name = `nord${OFFSETS[group.group] + index}`;
              return (
                <li key={hex}>
                  <button
                    type="button"
                    onClick={() => copy(hex)}
                    aria-label={`Copy ${name} ${hex}`}
                    className="group focus-ring w-full rounded-xl text-left"
                  >
                    <span
                      className="relative block aspect-square rounded-xl border border-border-subtle shadow-card transition-transform duration-moderate ease-spring group-hover:-translate-y-1"
                      style={{ background: `var(--gs-nord-${OFFSETS[group.group] + index})` }}
                    >
                      <span
                        className={cn(
                          'absolute inset-0 grid place-items-center rounded-xl bg-scrim text-white opacity-0 transition-opacity duration-fast',
                          copied === hex && 'opacity-100',
                        )}
                      >
                        <Icon name="codicon:check" size={20} />
                      </span>
                    </span>
                    <span className="mt-2 block font-medium text-fg-strong text-sm">{name}</span>
                    <span className="block font-mono text-fg-muted text-xs uppercase">{hex}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
