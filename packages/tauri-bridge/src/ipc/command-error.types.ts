/** How Rust `AppError`s reach the frontend: `invoke()` rejects with this shape. */
export interface CommandError {
  /** Stable machine-readable kind, e.g. `missing-config`. */
  kind: string;
  /** Human-readable message. */
  message: string;
}

export function isCommandError(value: unknown): value is CommandError {
  if (typeof value !== 'object' || value === null) return false;
  const { kind, message } = value as Partial<Record<keyof CommandError, unknown>>;
  return typeof kind === 'string' && typeof message === 'string';
}
