import { Icon } from '@genslate/design-system';
import { useState } from 'react';

import { useGallery } from '../../app/gallery.context';
import type { MediaDetails } from '../../ipc/gallery.types';

/** The photo's tags as chips: click one to see everything tagged so, × to remove it, type to add. */
export function TagEditor({ details }: { readonly details: MediaDetails }) {
  const api = useGallery();
  const [draft, setDraft] = useState('');
  const readOnly = details.trashed;

  const add = () => {
    const name = draft.trim();
    if (name === '') return;
    api.addTag([details.id], name);
    setDraft('');
  };

  return (
    <section className="flex flex-col gap-2" aria-label="Tags">
      <h4 className="font-semibold text-2xs text-fg-muted uppercase tracking-wider">Tags</h4>
      <div className="flex flex-wrap items-center gap-1.5">
        {details.tags.map((tag) => (
          <span
            key={tag}
            className="flex h-6 items-center rounded-full bg-fill-hover pl-2.5 text-fg text-xs"
          >
            <button
              type="button"
              onClick={() => {
                api.setMode({ type: 'browse' });
                api.setCollection({ type: 'tag', name: tag });
              }}
              className="focus-ring cursor-interactive rounded-full"
            >
              #{tag}
            </button>
            <button
              type="button"
              aria-label={`Remove the tag ${tag}`}
              disabled={readOnly}
              onClick={() => api.removeTag([details.id], tag)}
              className="focus-ring ml-0.5 grid size-6 cursor-interactive place-items-center rounded-full text-fg-muted hover:text-fg disabled:hidden"
            >
              <Icon name="codicon:close" size={12} />
            </button>
          </span>
        ))}
        {readOnly ? null : (
          <input
            value={draft}
            aria-label="Add a tag"
            placeholder={details.tags.length === 0 ? 'Add a tag…' : 'Add…'}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                add();
              } else if (event.key === 'Escape' && draft !== '') {
                event.preventDefault();
                event.stopPropagation();
                setDraft('');
              }
            }}
            onBlur={add}
            className="focus-ring h-6 min-w-20 flex-1 rounded-full bg-transparent px-2 text-fg text-xs placeholder:text-fg-muted focus:bg-field"
          />
        )}
      </div>
    </section>
  );
}
