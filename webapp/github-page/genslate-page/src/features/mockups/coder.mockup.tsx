import {
  type CodiconRef,
  cn,
  Icon,
  StatusBar,
  StatusBarItem,
  StatusBarSection,
  TitleBarCommandCenter,
  Tree,
  TreeItem,
} from '@genslate/design-system';

import { CodeLines } from './mock-parts.component';
import { MockWindow } from './mock-stage.component';

const ACTIVITY: readonly { icon: CodiconRef; active?: boolean; badge?: number }[] = [
  { icon: 'codicon:files', active: true },
  { icon: 'codicon:search' },
  { icon: 'codicon:source-control', badge: 3 },
  { icon: 'codicon:debug-alt' },
  { icon: 'codicon:extensions' },
];

const TABS = [
  { name: 'use-global-toggle.hook.ts', icon: 'codicon:symbol-method', active: true },
  { name: 'launcher.context.ts', icon: 'codicon:symbol-interface' },
  { name: 'Cargo.toml', icon: 'codicon:settings-gear' },
] as const;

// Minimap: one bar per line, widths from the snippet's rhythm.
const MINIMAP = [58, 40, 0, 46, 62, 54, 0, 30, 60, 50, 8, 0, 48, 44, 28, 6, 0, 52];

/** Coder: activity bar, file tree, tabs, highlighted code, minimap and a terminal panel. */
export function CoderMockup() {
  return (
    <MockWindow
      center={<TitleBarCommandCenter shortcut={null}>genslate</TitleBarCommandCenter>}
      statusBar={
        <StatusBar>
          <StatusBarSection>
            <StatusBarItem accent icon="codicon:remote">
              GENSLATE-USB
            </StatusBarItem>
            <StatusBarItem icon="codicon:source-control">feat/global-toggle*</StatusBarItem>
            <StatusBarItem icon="codicon:error">0</StatusBarItem>
            <StatusBarItem icon="codicon:warning">0</StatusBarItem>
          </StatusBarSection>
          <StatusBarSection align="end">
            <StatusBarItem>Ln 9, Col 14</StatusBarItem>
            <StatusBarItem>Spaces: 2</StatusBarItem>
            <StatusBarItem>TypeScript JSX</StatusBarItem>
            <StatusBarItem icon="codicon:check-all">Biome</StatusBarItem>
          </StatusBarSection>
        </StatusBar>
      }
    >
      <div className="hairline-r flex w-12 shrink-0 flex-col items-center gap-1 bg-surface-sidebar pt-2">
        {ACTIVITY.map((item) => (
          <span
            key={item.icon}
            className={cn(
              'relative grid size-10 place-items-center',
              item.active
                ? 'text-fg-strong shadow-[inset_2px_0_0_var(--gs-color-accent)]'
                : 'text-fg-muted',
            )}
          >
            <Icon name={item.icon} size={20} />
            {item.badge ? (
              <span className="absolute right-1 bottom-1 grid size-4 place-items-center rounded-full bg-accent font-semibold text-[9px] text-on-accent">
                {item.badge}
              </span>
            ) : null}
          </span>
        ))}
      </div>

      <div className="hairline-r flex w-[232px] shrink-0 flex-col bg-surface-sidebar">
        <div className="flex h-9 items-center px-4 font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
          Explorer
        </div>
        <Tree
          aria-label="Files"
          defaultExpanded={['desktop', 'launcher', 'src', 'app']}
          defaultSelected="toggle"
          indentGuides="always"
          className="px-1"
        >
          <TreeItem
            id="desktop"
            label="desktop"
            icon="codicon:folder"
            expandedIcon="codicon:folder-opened"
          >
            <TreeItem
              id="launcher"
              label="launcher"
              icon="codicon:folder"
              expandedIcon="codicon:folder-opened"
            >
              <TreeItem
                id="src"
                label="src"
                icon="codicon:folder"
                expandedIcon="codicon:folder-opened"
              >
                <TreeItem
                  id="app"
                  label="app"
                  icon="codicon:folder"
                  expandedIcon="codicon:folder-opened"
                >
                  <TreeItem id="app-c" label="app.component.tsx" icon="codicon:symbol-class" />
                  <TreeItem id="ctx" label="launcher.context.ts" icon="codicon:symbol-interface" />
                  <TreeItem
                    id="toggle"
                    label="use-global-toggle.hook.ts"
                    icon="codicon:symbol-method"
                    trailing={<span className="text-warning-fg">M</span>}
                  />
                </TreeItem>
                <TreeItem id="features" label="features" icon="codicon:folder" />
                <TreeItem id="ipc" label="ipc" icon="codicon:folder" />
              </TreeItem>
              <TreeItem id="tauri" label="src-tauri" icon="codicon:folder" />
            </TreeItem>
          </TreeItem>
          <TreeItem id="packages" label="packages" icon="codicon:folder" />
          <TreeItem id="crates" label="crates" icon="codicon:folder" />
          <TreeItem id="cargo" label="Cargo.toml" icon="codicon:settings-gear" />
          <TreeItem id="readme" label="README.md" icon="codicon:markdown" />
        </Tree>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hairline-b flex h-9 shrink-0 bg-tab-strip-bg">
          {TABS.map((tab) => (
            <span
              key={tab.name}
              className={cn(
                'relative flex items-center gap-2 px-3.5 text-sm',
                'active' in tab && tab.active
                  ? 'bg-tab-active-bg text-fg-strong'
                  : 'hairline-r text-fg-muted',
              )}
            >
              <Icon name={tab.icon} size={14} className="text-accent-fg" />
              {tab.name}
              {'active' in tab && tab.active ? (
                <>
                  <Icon name="codicon:close" size={12} />
                  <span className="absolute inset-x-0 top-0 h-0.5 bg-tab-indicator" />
                </>
              ) : null}
            </span>
          ))}
        </div>
        <div className="flex h-7 shrink-0 items-center gap-1 px-4 text-fg-muted text-xs">
          desktop <Icon name="codicon:chevron-right" size={12} /> launcher{' '}
          <Icon name="codicon:chevron-right" size={12} />
          src <Icon name="codicon:chevron-right" size={12} /> app{' '}
          <Icon name="codicon:chevron-right" size={12} />
          <span className="text-fg">useGlobalToggle</span>
        </div>
        <div className="relative flex min-h-0 flex-1">
          <CodeLines name="use-global-toggle" lineNumbers activeLine={9} className="flex-1 pt-1" />
          <div className="w-16 shrink-0 space-y-[3px] px-2 pt-2 opacity-70">
            {MINIMAP.map((width, index) => (
              <span
                key={index}
                className={cn(
                  'block h-[2px] rounded-full',
                  index === 8 ? 'bg-accent' : 'bg-fg-disabled',
                )}
                style={{ width: `${width}%` }}
              />
            ))}
            <span className="absolute top-2 right-2 h-16 w-14 rounded-sm bg-fill-hover" />
          </div>
        </div>
        <div className="hairline-t h-[150px] shrink-0 bg-surface-panel">
          <div className="flex h-8 items-center gap-5 px-4 text-2xs uppercase tracking-[0.08em]">
            <span className="text-fg-muted">Problems</span>
            <span className="text-fg-muted">Output</span>
            <span className="relative font-semibold text-fg-strong">
              Terminal
              <span className="absolute inset-x-0 -bottom-2 h-px bg-accent" />
            </span>
          </div>
          <div className="px-4 py-2 font-mono text-[12px] leading-[20px]">
            <div>
              <span className="text-info-fg">~/genslate</span>{' '}
              <span className="text-success-fg">❯</span>{' '}
              <span className="text-fg-strong">bun test launcher</span>
            </div>
            <div className="text-fg-muted">tests/unit/app/use-global-toggle.test.tsx:</div>
            <div>
              <span className="text-success-fg">✓</span>{' '}
              <span className="text-fg">toggles and focuses search</span>{' '}
              <span className="text-fg-muted">[3.12ms]</span>
            </div>
            <div>
              <span className="text-success-fg">✓</span>{' '}
              <span className="text-fg">respects the pinned setting</span>{' '}
              <span className="text-fg-muted">[1.04ms]</span>
            </div>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}
