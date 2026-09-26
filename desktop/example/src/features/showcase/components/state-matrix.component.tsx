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
    <div className="scrollbar-thin inset-ring inset-ring-border-subtle overflow-x-auto rounded-card">
      <table className="w-full border-separate border-spacing-0 text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="w-28 px-4 pt-3 pb-2 font-semibold text-2xs text-fg-muted uppercase tracking-wider"
            >
              <span className="sr-only">Variant</span>
            </th>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="whitespace-nowrap px-3 pt-3 pb-2 font-semibold text-2xs text-fg-muted uppercase tracking-wider"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th
                scope="row"
                className="hairline-t whitespace-nowrap px-4 py-3 font-medium text-fg-secondary text-sm"
              >
                {row.label}
              </th>
              {row.cells.map((cell, index) => (
                <td key={columns[index] ?? index} className="hairline-t px-3 py-3 align-middle">
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
