/** Input for the shell as bytes: text is UTF-8, xterm's binary input is one byte per char. */

const encoder = new TextEncoder();

/** `text` as UTF-8. */
export function utf8Bytes(text: string): Uint8Array {
  return encoder.encode(text);
}

/**
 * xterm's `onBinary` data (legacy mouse reports), where each character is one byte (0–255).
 * Encoding it as UTF-8 would turn every byte above 127 into two and break the report.
 */
export function binaryBytes(data: string): Uint8Array {
  return Uint8Array.from(data, (char) => char.charCodeAt(0) & 0xff);
}

/** `chunks` joined into one array. */
export function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
  if (chunks.length === 1 && chunks[0] !== undefined) return chunks[0];
  const joined = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  return joined;
}
