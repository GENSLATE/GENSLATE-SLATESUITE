import { cn, Icon } from '@genslate/design-system';

import { BrandMark } from '../../components/brand-mark.component';
import { Artwork } from './mock-parts.component';
import { MockWindow } from './mock-stage.component';

const TABS = [
  { title: 'Portable apps, done right', icon: 'mark', active: true },
  { title: 'Nord — an arctic palette', icon: 'globe' },
  { title: 'Tauri 2.0 guides', icon: 'book' },
] as const;

/** Browser: tabs in the titlebar, a privacy-first address bar and reader view. */
export function BrowserMockup() {
  return (
    <MockWindow
      leading={
        <div className="ml-3 flex h-full items-end gap-1 self-stretch pt-1.5">
          {TABS.map((tab) => (
            <span
              key={tab.title}
              className={cn(
                'flex h-8 w-52 items-center gap-2 rounded-t-lg px-3 text-sm',
                'active' in tab && tab.active
                  ? 'bg-canvas text-fg-strong shadow-[0_-1px_0_0_var(--gs-color-border-subtle)]'
                  : 'text-fg-muted',
              )}
            >
              {tab.icon === 'mark' ? (
                <BrandMark className="size-3.5" />
              ) : (
                <Icon name={tab.icon === 'globe' ? 'codicon:globe' : 'codicon:book'} size={14} />
              )}
              <span className="flex-1 truncate">{tab.title}</span>
              <Icon name="codicon:close" size={12} className="text-fg-muted" />
            </span>
          ))}
          <span className="mb-1.5 grid size-6 place-items-center text-fg-muted">
            <Icon name="codicon:add" size={14} />
          </span>
        </div>
      }
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hairline-b flex h-11 shrink-0 items-center gap-3 px-3">
          <span className="flex gap-2.5 text-fg-muted">
            <Icon name="codicon:arrow-left" size={16} />
            <Icon name="codicon:arrow-right" size={16} className="opacity-40" />
            <Icon name="codicon:refresh" size={16} />
          </span>
          <span className="flex h-8 flex-1 items-center gap-2 rounded-full bg-surface-sunken px-3.5 text-md">
            <Icon name="codicon:lock" size={14} className="text-success-fg" />
            <span className="text-fg-muted">https://</span>
            <span className="text-fg-strong">genslate.github.io</span>
            <span className="text-fg-muted">/GENSLATE/docs/portable-mode/</span>
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-success-subtle px-2 py-0.5 text-success-fg text-xs">
              <Icon name="codicon:shield" size={12} />
              23 trackers blocked
            </span>
          </span>
          <span className="flex gap-2.5 text-fg-muted">
            <Icon name="codicon:book" size={16} className="text-accent-fg" />
            <Icon name="codicon:star-empty" size={16} />
            <Icon name="codicon:account" size={16} />
          </span>
        </div>
        <div className="hairline-b flex h-8 shrink-0 items-center gap-4 px-4 text-fg-muted text-sm">
          {['Nord docs', 'Tauri', 'Rust book', 'Base UI', 'moonrepo', 'Bun'].map((mark) => (
            <span key={mark} className="flex items-center gap-1.5">
              <Icon name="codicon:bookmark" size={12} />
              {mark}
            </span>
          ))}
        </div>

        <div className="flex-1 overflow-hidden bg-surface-sunken">
          <article className="mx-auto mt-8 max-w-[620px]">
            <p className="font-semibold text-accent-fg text-xs uppercase tracking-[0.14em]">
              Reader view · 6 min
            </p>
            <h3 className="mt-2 font-semibold text-[34px] text-fg-strong leading-[1.1] tracking-[-0.03em]">
              Portable apps, done right
            </h3>
            <p className="mt-3 text-fg-secondary text-lg">
              Carry your tools on a USB stick and leave nothing behind on the computers you borrow.
            </p>
            <Artwork seed={1} className="mt-6 aspect-[21/9] w-full rounded-xl shadow-card" />
            <p className="mt-6 text-[15px] text-fg leading-[1.75]">
              Every GENSLATE app keeps its configuration, caches and logs in folders you can see.
              Move the folder, and the apps move with it. Settings are plain TOML files that reload
              the moment you save them.
            </p>
          </article>
        </div>
      </div>
    </MockWindow>
  );
}
