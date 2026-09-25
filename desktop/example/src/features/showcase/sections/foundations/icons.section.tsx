import { CODICON_NAMES, Icon, SearchField } from '@genslate/design-system';
import { useDeferredValue, useState } from 'react';
import { Specimen } from '../../components/specimen.component';

export function IconsSection() {
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const names = deferred ? CODICON_NAMES.filter((name) => name.includes(deferred)) : CODICON_NAMES;

  const copy = (name: string) => {
    void navigator.clipboard?.writeText(`codicon:${name}`).catch(() => undefined);
    setCopied(name);
  };

  return (
    <>
      <Specimen
        title="Codicons"
        description={`${names.length} of ${CODICON_NAMES.length} · click to copy the reference.`}
        aside={
          <SearchField
            aria-label="Filter icons"
            placeholder="Filter icons"
            size="sm"
            value={query}
            onValueChange={setQuery}
            className="w-56"
          />
        }
        stageClassName="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-1 p-3"
      >
        {names.map((name) => (
          <button
            key={name}
            type="button"
            title={`codicon:${name}`}
            onClick={() => copy(name)}
            className="group flex h-20 min-w-0 flex-col items-center justify-center gap-2 rounded-control px-1 text-fg focus-ring-inset transition-colors duration-fast hover:bg-fill-hover active:bg-fill-pressed"
          >
            <Icon name={`codicon:${name}`} size={20} className="text-fg-secondary group-hover:text-fg-strong" />
            <span className="w-full truncate text-center text-2xs text-fg-muted">
              {copied === name ? 'Copied' : name}
            </span>
          </button>
        ))}
        {names.length === 0 && <p className="col-span-full py-8 text-center text-fg-muted">No icons match.</p>}
      </Specimen>

      <Specimen title="Sizes" description="16 by default, 14 in dense spots, 12 in badges, 20 for empty states.">
        {([12, 14, 16, 20] as const).map((size) => (
          <div key={size} className="flex w-20 flex-col items-center gap-2">
            <Icon name="codicon:symbol-color" size={size} className="text-fg" />
            <span className="text-xs text-fg-muted tabular-nums">{size}px</span>
          </div>
        ))}
      </Specimen>
    </>
  );
}
