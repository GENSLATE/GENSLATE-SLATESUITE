import { cn, FeatureTeaser, FeatureTeaserSample, Icon, ScrollArea } from '@genslate/design-system';

const CHANGES = [
  { name: 'explorer.md', folder: 'docs', status: 'M' },
  { name: 'tabs.reducer.ts', folder: 'src/model', status: 'M' },
  { name: 'preview.png', folder: 'assets', status: 'A' },
  { name: 'notes.txt', folder: '', status: 'U' },
] as const;

const COMMITS = [
  { message: 'Add the preview pane', when: '2 h' },
  { message: 'Sort folders first', when: 'Yesterday' },
  { message: 'Initial commit', when: 'Mon' },
] as const;

const STATUS_TONE = { M: 'text-warning-fg', A: 'text-success-fg', U: 'text-info-fg' } as const;

/** The Git tab, a preview: branches, changes and history of the repository you are browsing. */
export function GitPanel() {
  return (
    <ScrollArea className="min-h-0 flex-1" aria-label="Git">
      <FeatureTeaser icon="codicon:source-control" title="Git">
        Open a folder that is a Git repository to see its branch, changed files and history, with
        status badges right in the file list.
      </FeatureTeaser>
      <FeatureTeaserSample label="Example">
        <div className="flex flex-col gap-3 pb-4">
          <div className="flex items-center gap-1.5 text-fg text-sm">
            <Icon name="codicon:git-branch-compact" size={14} className="text-fg-muted" />
            <span className="font-medium">main</span>
            <span className="text-fg-muted">↑1 ↓0</span>
          </div>
          <div className="flex flex-col">
            <p className="pb-1 text-2xs text-fg-muted uppercase tracking-wider">Changes · 4</p>
            {CHANGES.map((change) => (
              <div key={change.name} className="flex h-row-sm items-center gap-1.5 text-sm">
                <Icon name="codicon:file-code" size={14} className="text-fg-muted" />
                <span className="truncate text-fg">{change.name}</span>
                <span className="truncate text-fg-muted text-xs">{change.folder}</span>
                <span
                  className={cn(
                    'ml-auto font-mono font-semibold text-xs',
                    STATUS_TONE[change.status],
                  )}
                >
                  {change.status}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col">
            <p className="pb-1 text-2xs text-fg-muted uppercase tracking-wider">History</p>
            {COMMITS.map((commit, index) => (
              <div key={commit.message} className="flex h-row-md items-center gap-2 text-sm">
                <span className="relative flex h-full w-3 items-center justify-center">
                  <span
                    className={cn(
                      'absolute w-px bg-border',
                      index === 0
                        ? 'top-1/2 bottom-0'
                        : index === COMMITS.length - 1
                          ? 'top-0 bottom-1/2'
                          : 'inset-y-0',
                    )}
                  />
                  <span className="relative size-2.5 rounded-full border-2 border-accent bg-canvas" />
                </span>
                <span className="truncate text-fg">{commit.message}</span>
                <span className="ml-auto shrink-0 text-fg-muted text-xs">{commit.when}</span>
              </div>
            ))}
          </div>
        </div>
      </FeatureTeaserSample>
    </ScrollArea>
  );
}
