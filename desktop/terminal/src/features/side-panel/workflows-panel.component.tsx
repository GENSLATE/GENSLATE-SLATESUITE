import { Icon, ScrollArea } from '@genslate/design-system';

import { TeaserHero, TeaserSample } from './teaser.component';

const WORKFLOWS = [
  {
    icon: 'codicon:rocket',
    name: 'Start the dev stack',
    steps: ['bun install', 'bun run dev', 'open http://localhost:1420'],
    trigger: 'When I open this project',
  },
  {
    icon: 'codicon:beaker',
    name: 'Test before I push',
    steps: ['cargo test', 'bun run check', 'git push'],
    trigger: 'Stop at the first failure',
  },
  {
    icon: 'codicon:layout',
    name: 'Server + logs layout',
    steps: ['Split right: tail -f app.log', 'Split down: htop'],
    trigger: 'Opens three panes',
  },
] as const;

/**
 * The Workflows tab, a preview: named, multi-step recipes (commands, panes and layouts) the
 * assistant can write from your history and run on a trigger.
 */
export function WorkflowsPanel() {
  return (
    <ScrollArea className="min-h-0 flex-1" aria-label="Workflows">
      <TeaserHero icon="codicon:run-all" title="Workflows">
        Save a routine once and run it with a click: commands in order, panes laid out, a stop on
        the first failure. The assistant will suggest them from what you repeat.
      </TeaserHero>
      <TeaserSample label="Examples">
        <ul className="flex flex-col gap-2 pb-4">
          {WORKFLOWS.map((workflow) => (
            <li
              key={workflow.name}
              className="flex flex-col gap-1.5 rounded-card bg-surface-raised p-2.5 ring-1 ring-border-subtle"
            >
              <span className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-md bg-accent-subtle text-accent-fg">
                  <Icon name={workflow.icon} size={14} />
                </span>
                <span className="font-medium text-fg-strong text-sm">{workflow.name}</span>
                <Icon name="codicon:play" size={14} className="ml-auto text-success-fg" />
              </span>
              <ol className="flex flex-col gap-0.5 pl-8">
                {workflow.steps.map((step, index) => (
                  <li key={step} className="flex items-center gap-1.5 text-xs">
                    <span className="text-fg-muted tabular-nums">{index + 1}</span>
                    <code className="truncate font-mono text-fg-secondary">{step}</code>
                  </li>
                ))}
              </ol>
              <span className="flex items-center gap-1.5 pl-8 text-2xs text-fg-muted">
                <Icon name="codicon:symbol-event" size={12} />
                {workflow.trigger}
              </span>
            </li>
          ))}
        </ul>
      </TeaserSample>
      <TeaserSample label="From your history">
        <div className="mb-4 flex items-center gap-2 rounded-card border border-accent-border border-dashed p-2.5 text-fg-secondary text-xs">
          <Icon name="codicon:sparkle" size={14} className="shrink-0 text-accent-fg" />
          You ran these 4 commands together 12 times this week. Save them as a workflow?
        </div>
      </TeaserSample>
    </ScrollArea>
  );
}
