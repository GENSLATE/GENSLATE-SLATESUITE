import { isCommandError } from '@genslate/tauri-bridge';

/** A readable message for anything a command rejects with. */
export function errorMessage(error: unknown): string {
  if (isCommandError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}
