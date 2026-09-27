import type { CodiconRef } from '@genslate/design-system';
import { cn, Icon, Tab, Tabs, TabsList, Tooltip } from '@genslate/design-system';

import type { Source, TabInfo } from '../../ipc/launcher.types';

export const SOURCE_ICON: Record<Source, CodiconRef> = {
  genslate: 'codicon:layers',
  portableapps: 'codicon:package',
  portapps: 'codicon:archive',
};

export interface SourceTabsProps {
  readonly tabs: readonly TabInfo[];
  readonly value: Source;
  readonly onChange: (source: Source) => void;
}

/**
 * GENSLATE · PortableApps.com · portapps.io, as a segmented control. The active tab spells out
 * its name; the others show their icon and app count (full names in tooltips), so three
 * sources fit the narrow well. With one source, a quiet heading replaces the control.
 */
export function SourceTabs({ tabs, value, onChange }: SourceTabsProps) {
  const only = tabs.length === 1 ? tabs[0] : undefined;
  if (only !== undefined) {
    return (
      <div className="flex h-10 shrink-0 items-center gap-2 px-3.5 text-fg-secondary">
        <Icon name={SOURCE_ICON[only.source]} size={14} />
        <span className="font-semibold text-2xs uppercase tracking-wider">{only.label} apps</span>
        <span className="ml-auto text-fg-muted text-xs tabular-nums">{only.count}</span>
      </div>
    );
  }
  return (
    <Tabs
      variant="pill"
      value={value}
      onValueChange={(next) => {
        const source = tabs.find((tab) => tab.source === next)?.source;
        if (source !== undefined) onChange(source);
      }}
      className="shrink-0 px-1.5 pt-1.5 pb-0.5"
    >
      <TabsList className="w-full">
        {tabs.map((tab) => {
          const active = tab.source === value;
          return (
            <Tooltip key={tab.source} content={`${tab.label} · ${tab.count} apps`} side="bottom">
              <Tab
                value={tab.source}
                icon={SOURCE_ICON[tab.source]}
                aria-label={tab.label}
                className={cn('min-w-0 gap-1.5', active ? 'flex-auto' : 'flex-none px-2.5')}
              >
                {active ? <span className="truncate">{tab.label}</span> : null}
                <span
                  className={cn(
                    'text-2xs tabular-nums',
                    active ? 'text-fg-muted' : 'text-fg-secondary',
                  )}
                >
                  {tab.count}
                </span>
              </Tab>
            </Tooltip>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
