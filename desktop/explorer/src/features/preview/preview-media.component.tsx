import { Icon, Spinner } from '@genslate/design-system';
import { useEffect, useState } from 'react';
import { errorMessage } from '../../app/error-message.util';
import { useExplorer } from '../../app/explorer.context';
import type { Entry, TextPreview } from '../../ipc/explorer.types';
import { entryIcon } from '../../model/file-icon.util';

const TEXT_KINDS = new Set(['text', 'markdown', 'code', 'data']);

/** The file itself: a picture, a player, the start of a text file, or its icon. */
export function PreviewMedia({ entry }: { readonly entry: Entry }) {
  const { backend } = useExplorer();
  const [failed, setFailed] = useState(false);
  const url = backend.previewUrl(entry.path);

  if (failed) return <Placeholder entry={entry} note="No preview available" />;
  switch (entry.kind) {
    case 'image':
      return (
        <div className="grid min-h-40 place-items-center rounded-card bg-surface-sunken p-2">
          <img
            src={url}
            alt={entry.name}
            draggable={false}
            onError={() => setFailed(true)}
            className="max-h-72 max-w-full rounded-xs object-contain shadow-control"
          />
        </div>
      );
    case 'video':
      return (
        // biome-ignore lint/a11y/useMediaCaption: user files come without caption tracks.
        <video
          src={url}
          controls
          preload="metadata"
          onError={() => setFailed(true)}
          className="max-h-72 w-full rounded-card bg-surface-sunken"
        />
      );
    case 'audio':
      return (
        <div className="flex flex-col items-center gap-3 rounded-card bg-surface-sunken p-4">
          <Icon name="codicon:music" size={20} className="text-accent-fg" />
          {/* biome-ignore lint/a11y/useMediaCaption: user files come without caption tracks. */}
          <audio
            src={url}
            controls
            preload="metadata"
            onError={() => setFailed(true)}
            className="w-full"
          />
        </div>
      );
    default:
      return TEXT_KINDS.has(entry.kind) ? (
        <TextSnippet entry={entry} />
      ) : (
        <Placeholder entry={entry} />
      );
  }
}

type TextState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly preview: TextPreview }
  | { readonly status: 'error'; readonly message: string };

function TextSnippet({ entry }: { readonly entry: Entry }) {
  const { backend } = useExplorer();
  const [state, setState] = useState<TextState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    backend.readText(entry.path).then(
      (preview) => {
        if (active) setState({ status: 'ready', preview });
      },
      (error: unknown) => {
        if (active) setState({ status: 'error', message: errorMessage(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [backend, entry.path]);

  if (state.status === 'loading') {
    return (
      <div className="grid h-40 place-items-center rounded-card bg-surface-sunken">
        <Spinner size={16} label="Loading the preview" />
      </div>
    );
  }
  if (state.status === 'error') return <Placeholder entry={entry} note={state.message} />;
  if (state.preview.binary) return <Placeholder entry={entry} note="Binary file" />;
  return (
    <div className="relative">
      <pre
        className="scrollbar-thin max-h-80 cursor-text select-text overflow-auto whitespace-pre-wrap break-words rounded-card bg-surface-sunken p-3 font-mono text-fg text-xs leading-relaxed"
        data-context-copy={state.preview.text}
      >
        {state.preview.text === '' ? (
          <span className="text-fg-muted italic">Empty file</span>
        ) : (
          state.preview.text
        )}
      </pre>
      {state.preview.truncated ? (
        <p className="mt-1 text-fg-muted text-xs">Showing the beginning of the file.</p>
      ) : null}
    </div>
  );
}

function Placeholder({ entry, note }: { readonly entry: Entry; readonly note?: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-card bg-surface-sunken text-fg-muted">
      <Icon name={entryIcon(entry)} size={20} />
      {note === undefined ? null : <p className="px-4 text-center text-xs">{note}</p>}
    </div>
  );
}
