export interface PropRow {
  name: string;
  type: string;
  default?: string;
  description: string;
}

/** A light props reference. */
export function PropsTable({ rows, caption = 'Props' }: { rows: readonly PropRow[]; caption?: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-md font-semibold text-fg-strong">{caption}</h2>
      <div className="overflow-x-auto scrollbar-thin rounded-card inset-ring inset-ring-border-subtle">
        <table className="w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-2xs font-semibold tracking-wider text-fg-muted uppercase">
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
                <td className="px-4 py-2 font-mono text-code whitespace-nowrap text-accent-fg hairline-t select-text">
                  {row.name}
                </td>
                <td className="px-4 py-2 font-mono text-code text-fg-secondary hairline-t select-text">{row.type}</td>
                <td className="px-4 py-2 font-mono text-code whitespace-nowrap text-fg-muted hairline-t">
                  {row.default ?? '—'}
                </td>
                <td className="px-4 py-2 text-fg-secondary hairline-t">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
