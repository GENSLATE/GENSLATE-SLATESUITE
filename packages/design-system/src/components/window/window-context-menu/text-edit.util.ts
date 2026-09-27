import { isTextControl } from './context-target.util';
import type {
  ContentContextTarget,
  EditableElement,
  FieldContextTarget,
  WindowContextClipboard,
} from './window-context-menu.types';

export type TextCommand = 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'delete' | 'selectAll';

/** `navigator.clipboard`, when the webview exposes it. */
export function webClipboard(): WindowContextClipboard | null {
  const clipboard = globalThis.navigator?.clipboard;
  if (clipboard === undefined) return null;
  return {
    readText: typeof clipboard.readText === 'function' ? () => clipboard.readText() : undefined,
    writeText: (text) => clipboard.writeText(text),
  };
}

/**
 * Runs a native editing command on the focused field. `execCommand` is deprecated but it is still
 * the only API that edits through the browser's undo stack and fires the `input` events React
 * listens to; every caller has a fallback for webviews that refuse it.
 */
function exec(document: Document, command: string, value?: string): boolean {
  if (typeof document.execCommand !== 'function') return false;
  try {
    return document.execCommand(command, false, value);
  } catch {
    // Some engines throw instead of returning false for unsupported commands.
    return false;
  }
}

/** Focuses the field again and puts back the selection it had when the menu opened. */
export function restoreField(target: FieldContextTarget): void {
  const { field, selection } = target;
  field.focus({ preventScroll: true });
  if (selection.type === 'offsets') {
    if (isTextControl(field) && field.selectionStart !== null) {
      field.setSelectionRange(selection.start, selection.end, selection.direction);
    }
    return;
  }
  const current = field.ownerDocument.getSelection();
  if (current !== null && selection.range !== null) {
    current.removeAllRanges();
    current.addRange(selection.range);
  }
}

/** Replaces the field's selection with `text` without `execCommand` (keeps React in sync). */
function replaceSelection(field: EditableElement, text: string): void {
  if (isTextControl(field)) {
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? start;
    field.setRangeText(text, start, end, 'end');
  } else {
    const selection = field.ownerDocument.getSelection();
    if (selection === null || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    if (text !== '') range.insertNode(field.ownerDocument.createTextNode(text));
    range.collapse(false);
  }
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

function selectAllIn(field: EditableElement): void {
  if (isTextControl(field)) {
    field.select();
    return;
  }
  const document = field.ownerDocument;
  if (exec(document, 'selectAll')) return;
  const range = document.createRange();
  range.selectNodeContents(field);
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/** Runs an Edit command on the field that was right-clicked. */
export async function runFieldCommand(
  target: FieldContextTarget,
  command: TextCommand,
  clipboard: WindowContextClipboard | null,
): Promise<void> {
  const { field } = target;
  const document = field.ownerDocument;
  restoreField(target);
  switch (command) {
    case 'undo':
    case 'redo':
      exec(document, command);
      return;
    case 'selectAll':
      selectAllIn(field);
      return;
    case 'delete':
      if (!exec(document, 'delete')) replaceSelection(field, '');
      return;
    case 'copy':
      if (!exec(document, 'copy')) await clipboard?.writeText(target.selectedText);
      return;
    case 'cut':
      if (exec(document, 'cut')) return;
      await clipboard?.writeText(target.selectedText);
      restoreField(target);
      replaceSelection(field, '');
      return;
    case 'paste': {
      const text = (await clipboard?.readText?.()) ?? '';
      // Reading the clipboard can show a permission prompt that takes focus away.
      restoreField(target);
      if (text !== '' && !exec(document, 'insertText', text)) replaceSelection(field, text);
      return;
    }
    default:
      command satisfies never;
  }
}

/** Copies plain text (selected content, a link, a status value). */
export async function copyText(
  document: Document,
  text: string,
  clipboard: WindowContextClipboard | null,
): Promise<void> {
  if (clipboard !== null) {
    await clipboard.writeText(text);
    return;
  }
  // No async clipboard: copy through a throwaway selection.
  const scratch = document.createElement('textarea');
  scratch.value = text;
  scratch.setAttribute('readonly', '');
  scratch.style.position = 'fixed';
  scratch.style.opacity = '0';
  document.body.append(scratch);
  scratch.select();
  exec(document, 'copy');
  scratch.remove();
}

/** Selects every character in the right-clicked area. */
export function selectAllContent(target: ContentContextTarget): void {
  const document = target.selectRoot.ownerDocument;
  const range = document.createRange();
  range.selectNodeContents(target.selectRoot);
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
