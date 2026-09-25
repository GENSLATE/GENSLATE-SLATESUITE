export interface PropRow {
  name: string;
  type: string;
  default?: string;
  description: string;
}

/** A light props reference. */
export function PropsTable({
  rows,
  caption = 'Props',
}: {
  rows: readonly PropRow[];
  caption?: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-fg-strong text-md">{caption}</h2>
      <div className="scrollbar-thin inset-ring inset-ring-border-subtle overflow-x-auto rounded-card">
        <table className="w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="font-semibold text-2xs text-fg-muted uppercase tracking-wider">
              <th scope="col" className="px-4 py-2">
                Prop
              </th>
              <th scope="col" className="px-4 py-2">
                Type
              </th>
              <th scope="col" className="px-4 py-2">
                Default
              </th>
              <th scope="col" className="px-4 py-2">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="align-top">
                <td className="hairline-t select-text whitespace-nowrap px-4 py-2 font-mono text-accent-fg text-code">
                  {row.name}
                </td>
                <td className="hairline-t select-text px-4 py-2 font-mono text-code text-fg-secondary">
                  {row.type}
                </td>
                <td className="hairline-t whitespace-nowrap px-4 py-2 font-mono text-code text-fg-muted">
                  {row.default ?? '—'}
                </td>
                <td className="hairline-t px-4 py-2 text-fg-secondary">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
