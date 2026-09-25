import type { ReactNode } from 'react';

export interface StateMatrixRow {
  label: string;
  cells: readonly ReactNode[];
}

interface StateMatrixProps {
  /** Column headings (states). */
  columns: readonly string[];
  rows: readonly StateMatrixRow[];
  /** Caption for assistive tech. */
  caption: string;
}

/**
 * Variants × states. Hover / pressed / focus columns are rendered with forced classes so every state is
 * visible at once for visual review.
 */
export function StateMatrix({ columns, rows, caption }: StateMatrixProps) {
  return (
    <div className="overflow-x-auto scrollbar-thin rounded-card inset-ring inset-ring-border-subtle">
      <table className="w-full border-separate border-spacing-0 text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-28 px-4 pt-3 pb-2 text-2xs font-semibold tracking-wider text-fg-muted uppercase">
              <span className="sr-only">Variant</span>
            </th>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-3 pt-3 pb-2 text-2xs font-semibold tracking-wider whitespace-nowrap text-fg-muted uppercase"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="px-4 py-3 text-sm font-medium whitespace-nowrap text-fg-secondary hairline-t">
                {row.label}
              </th>
              {row.cells.map((cell, index) => (
                <td key={columns[index] ?? index} className="px-3 py-3 align-middle hairline-t">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
