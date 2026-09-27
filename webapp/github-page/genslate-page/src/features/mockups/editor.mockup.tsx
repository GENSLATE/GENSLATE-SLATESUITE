import { cn, Icon, StatusBar, StatusBarItem, StatusBarSection } from '@genslate/design-system';

import { CodeLines } from './mock-parts.component';
import { MockWindow } from './mock-stage.component';

const NOTES = [
  {
    title: 'Norway, February 2026',
    excerpt: 'Three nights above the Arctic Circle…',
    when: '09:41',
    active: true,
  },
  { title: 'Launcher ideas', excerpt: 'Slash commands for folders, themes…', when: 'Yesterday' },
  { title: 'Reading list', excerpt: 'The Design of Everyday Things, Refactoring UI…', when: 'Mon' },
  { title: 'Weekly review', excerpt: 'Shipped the portable webview profile…', when: 'Sun' },
  { title: 'Recipes', excerpt: 'Cardamom buns, the Swedish way…', when: '12 Feb' },
] as const;

/** Editor: notes library, Markdown source and a live preview. */
export function EditorMockup() {
  return (
    <MockWindow
      title="Norway, February 2026.md"
      statusBar={
        <StatusBar>
          <StatusBarSection>
            <StatusBarItem icon="codicon:markdown">Markdown</StatusBarItem>
            <StatusBarItem icon="codicon:cloud">Saved to GENSLATE-USB</StatusBarItem>
          </StatusBarSection>
          <StatusBarSection align="end">
            <StatusBarItem>184 words</StatusBarItem>
            <StatusBarItem>Ln 3, Col 22</StatusBarItem>
            <StatusBarItem icon="codicon:eye">Focus</StatusBarItem>
          </StatusBarSection>
        </StatusBar>
      }
    >
      <div className="hairline-r flex w-[240px] shrink-0 flex-col bg-surface-sidebar">
        <div className="flex h-10 items-center justify-between px-3">
          <span className="font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
            Notes
          </span>
          <span className="flex gap-2 text-fg-muted">
            <Icon name="codicon:search" size={14} />
            <Icon name="codicon:new-file" size={14} />
          </span>
        </div>
        <div className="grid gap-0.5 px-2">
          {NOTES.map((note) => (
            <div
              key={note.title}
              className={cn(
                'rounded-lg px-2.5 py-2',
                'active' in note && note.active ? 'bg-selection' : '',
              )}
            >
              <div className="flex items-baseline gap-2">
                <span className="flex-1 truncate font-medium text-fg-strong text-md">
                  {note.title}
                </span>
                <span className="text-2xs text-fg-muted">{note.when}</span>
              </div>
              <p className="truncate text-fg-muted text-sm">{note.excerpt}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-hidden bg-surface-sunken py-5">
        <CodeLines name="trip-notes" lineNumbers activeLine={3} />
      </div>

      <article className="hairline-l w-[430px] shrink-0 overflow-hidden px-8 py-6">
        <h3 className="font-semibold text-2xl text-fg-strong">Norway, February 2026</h3>
        <p className="mt-3 text-fg text-md leading-relaxed">
          Three nights above the Arctic Circle, chasing the{' '}
          <strong className="text-fg-strong">aurora</strong> from Tromsø to the Lofoten.
        </p>
        <h4 className="mt-5 font-semibold text-fg-strong text-lg">Packing list</h4>
        <ul className="mt-2 grid gap-1.5 text-fg text-md">
          {[
            ['Tripod and spare batteries', true],
            ['Wool layers, lots of them', true],
            ['Offline maps on the USB drive', false],
          ].map(([item, done]) => (
            <li key={String(item)} className="flex items-center gap-2">
              <span
                className={cn(
                  'grid size-4 place-items-center rounded border',
                  done ? 'border-accent bg-accent text-on-accent' : 'border-border-strong',
                )}
              >
                {done ? <Icon name="codicon:check" size={12} /> : null}
              </span>
              <span className={done ? 'text-fg-muted line-through' : ''}>{item}</span>
            </li>
          ))}
        </ul>
        <h4 className="mt-5 font-semibold text-fg-strong text-lg">Shot notes</h4>
        <blockquote className="mt-2 border-accent border-l-2 pl-3 text-fg-secondary text-md italic">
          Wide open at f/2, 4 seconds, ISO 3200. The green band moved faster than expected.
        </blockquote>
        <table className="mt-4 w-full overflow-hidden rounded-md text-sm">
          <thead>
            <tr className="bg-surface-sunken text-left text-fg-muted">
              <th className="px-2 py-1 font-medium">Night</th>
              <th className="px-2 py-1 font-medium">Kp</th>
              <th className="px-2 py-1 font-medium">Clouds</th>
            </tr>
          </thead>
          <tbody className="text-fg">
            <tr className="hairline-b">
              <td className="px-2 py-1">Fri</td>
              <td className="px-2 py-1 tabular-nums">5</td>
              <td className="px-2 py-1">clear</td>
            </tr>
            <tr>
              <td className="px-2 py-1">Sat</td>
              <td className="px-2 py-1 tabular-nums">3</td>
              <td className="px-2 py-1">broken</td>
            </tr>
          </tbody>
        </table>
      </article>
    </MockWindow>
  );
}
