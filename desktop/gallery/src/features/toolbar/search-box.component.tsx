import { IconButton, SearchField } from '@genslate/design-system';
import { useEffect, useRef } from 'react';

import { useGallery } from '../../app/gallery.context';

/**
 * The search box. Words search names, folders, cameras, places, tags, albums and months
 * (`#tag` or `tag:name` for tags). The sparkle switches to "Describe a photo", a preview of
 * searching by what is in the picture.
 */
export function SearchBox() {
  const api = useGallery();
  const input = useRef<HTMLInputElement>(null);
  const describe = api.searchMode === 'describe';

  useEffect(() => {
    const focus = () => {
      input.current?.focus();
      input.current?.select();
    };
    window.addEventListener('gallery:focus-search', focus);
    return () => window.removeEventListener('gallery:focus-search', focus);
  }, []);

  return (
    <SearchField
      ref={input}
      size="sm"
      className="w-64 shrink"
      aria-label={describe ? 'Describe a photo (coming soon)' : 'Search photos'}
      placeholder={describe ? 'Describe a photo…' : 'Search places, tags, cameras…'}
      shortcut="mod+f"
      value={api.search}
      onValueChange={api.setSearch}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          document
            .querySelector<HTMLElement>('[role="listbox"][data-context-zone="view"]')
            ?.focus();
        }
      }}
      trailing={
        <IconButton
          size="xs"
          icon="codicon:sparkle"
          label={describe ? 'Search words' : 'Describe a photo instead (coming soon)'}
          toggled={describe}
          onClick={() => api.setSearchMode(describe ? 'words' : 'describe')}
        />
      }
    />
  );
}
