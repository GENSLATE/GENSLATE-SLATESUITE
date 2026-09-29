import {
  cn,
  EmptyState,
  Icon,
  IconButton,
  SearchField,
  SidebarContent,
  SidebarHeader,
} from '@genslate/design-system';
import { useState } from 'react';

import { useTerminal } from '../../app/terminal.context';
import type { Snippet } from '../../ipc/terminal.types';

const NEW_SNIPPET = { id: null, name: '', command: '', description: '', run: true } as const;

/**
 * The Snippets tab: saved commands, kept in the shared GENSLATE database. Click one to type
 * it at the prompt (snippets marked "run" press Enter too); right-click to edit or delete.
 */
export function SnippetsPanel() {
  const api = useTerminal();
  const [filter, setFilter] = useState('');
  const needle = filter.trim().toLowerCase();
  const shown = api.snippets.filter(
    (snippet) =>
      needle === '' ||
      snippet.name.toLowerCase().includes(needle) ||
      snippet.command.toLowerCase().includes(needle) ||
      snippet.description.toLowerCase().includes(needle),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SidebarHeader
        title="Snippets"
        actions={
          <IconButton
            size="xs"
            icon="codicon:add"
            label="New snippet"
            onClick={() => api.openDialog({ type: 'snippet', snippet: NEW_SNIPPET })}
          />
        }
      />
      <div className="px-3 pb-2">
        <SearchField
          size="sm"
          aria-label="Filter snippets"
          placeholder="Filter snippets"
          value={filter}
          onValueChange={setFilter}
        />
      </div>
      <SidebarContent aria-label="Snippets">
        {api.snippets.length === 0 ? (
          <EmptyState
            size="sm"
            icon="codicon:symbol-snippet"
            title="No snippets yet"
            description="Save commands you type often and run them with a click."
          />
        ) : shown.length === 0 ? (
          <p className="px-4 py-2 text-fg-muted text-sm">No snippet matches “{filter}”.</p>
        ) : (
          <ul className="flex flex-col gap-0.5 px-2 pb-2">
            {shown.map((snippet) => (
              <li key={snippet.id}>
                <SnippetRow snippet={snippet} />
              </li>
            ))}
          </ul>
        )}
      </SidebarContent>
    </div>
  );
}

function SnippetRow({ snippet }: { readonly snippet: Snippet }) {
  const api = useTerminal();
  const use = () => api.sendText(snippet.command, { run: snippet.run });

  return (
    <div
      data-context-zone="snippet"
      data-snippet-id={snippet.id}
      className="group/row relative flex rounded-control transition-colors duration-fast ease-standard hover:bg-fill-hover"
    >
      <button
        type="button"
        onClick={use}
        title={snippet.run ? 'Run it' : 'Type it at the prompt'}
        className="focus-ring-inset flex min-w-0 flex-1 cursor-interactive flex-col gap-0.5 rounded-control px-2 py-1.5 text-left active:bg-fill-pressed"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon
            name={snippet.run ? 'codicon:play' : 'codicon:symbol-snippet'}
            size={14}
            className={cn('shrink-0', snippet.run ? 'text-success-fg' : 'text-accent-fg')}
          />
          <span className="truncate text-fg-strong text-sm">{snippet.name}</span>
        </span>
        <code className="truncate pl-5 font-mono text-2xs text-fg-secondary">
          {snippet.command.split('\n')[0]}
        </code>
        {snippet.description === '' ? null : (
          <span className="truncate pl-5 text-fg-muted text-xs">{snippet.description}</span>
        )}
      </button>
      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 transition-opacity duration-fast group-focus-within/row:opacity-100 group-hover/row:opacity-100">
        <IconButton
          size="xs"
          icon="codicon:insert"
          label="Type without running"
          onClick={() => api.sendText(snippet.command)}
        />
        <IconButton
          size="xs"
          icon="codicon:edit"
          label={`Edit ${snippet.name}`}
          onClick={() => api.openDialog({ type: 'snippet', snippet })}
        />
      </div>
    </div>
  );
}
