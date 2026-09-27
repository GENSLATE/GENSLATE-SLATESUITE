import type {
  EditableElement,
  FieldSelection,
  WindowContextTarget,
  WindowContextZone,
} from './window-context-menu.types';

/** Input types whose text can be selected and edited like a text box. */
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email', 'password']);

/** Put this on an element to give it no menu at all (the webview's menu stays hidden too). */
export const NO_MENU_SELECTOR = '[data-context-menu="none"]';

/** The text box under `element`, if it is one (disabled fields have no menu). */
export function editableOf(element: Element): EditableElement | null {
  const field = element.closest('input, textarea, [contenteditable]');
  if (field instanceof HTMLTextAreaElement) return field.disabled ? null : field;
  if (field instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(field.type) && !field.disabled ? field : null;
  }
  if (field instanceof HTMLElement && field.isContentEditable) return field;
  return null;
}

export const isTextControl = (
  field: EditableElement,
): field is HTMLInputElement | HTMLTextAreaElement =>
  field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement;

function fieldSelection(field: EditableElement): FieldSelection {
  if (isTextControl(field)) {
    // `email` inputs don't expose offsets; treat the whole value as the working range.
    const start = field.selectionStart ?? 0;
    const end = field.selectionEnd ?? field.value.length;
    return { type: 'offsets', start, end, direction: field.selectionDirection ?? 'none' };
  }
  const selection = field.ownerDocument.getSelection();
  const range = selection !== null && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  return {
    type: 'range',
    range:
      range !== null && field.contains(range.commonAncestorContainer) ? range.cloneRange() : null,
  };
}

function selectedTextOf(field: EditableElement, selection: FieldSelection): string {
  if (isTextControl(field) && selection.type === 'offsets') {
    return field.value.slice(selection.start, selection.end);
  }
  return selection.type === 'range' && selection.range !== null ? selection.range.toString() : '';
}

function isSelectable(element: Element): boolean {
  const view = element.ownerDocument.defaultView;
  if (view === null) return true;
  const style = view.getComputedStyle(element);
  // WKWebView only reports the prefixed property.
  const value = style.userSelect || style.webkitUserSelect;
  return value !== 'none';
}

function zoneOf(element: Element): WindowContextZone | null {
  return element.closest('[data-context-zone]')?.getAttribute('data-context-zone') ?? null;
}

function copyTextOf(element: Element): string | null {
  const explicit = element.closest('[data-context-copy]')?.getAttribute('data-context-copy');
  if (explicit != null && explicit !== '') return explicit;
  // Icon-only items have nothing worth copying.
  const text = element.closest('[data-slot="statusbar-item"]')?.textContent?.trim() ?? '';
  return text === '' ? null : text;
}

function linkOf(element: Element): string | null {
  const anchor = element.closest('a[href]');
  // `.href` is absolute; the attribute may be relative.
  return anchor instanceof HTMLAnchorElement && anchor.href !== '' ? anchor.href : null;
}

/**
 * Reads what a right-click landed on: an editable field, the titlebar, the status bar or
 * content (with its link and selected text). `null` inside `data-context-menu="none"`.
 */
export function resolveContextTarget(element: Element): WindowContextTarget | null {
  if (element.closest(NO_MENU_SELECTOR) !== null) return null;
  const zone = zoneOf(element);

  const field = editableOf(element);
  if (field !== null) {
    const selection = fieldSelection(field);
    const readOnly = isTextControl(field) ? field.readOnly : false;
    const value = isTextControl(field) ? field.value : (field.textContent ?? '');
    return {
      kind: 'field',
      zone: zone ?? 'content',
      element,
      field,
      selection,
      selectedText: selectedTextOf(field, selection),
      readOnly,
      secret: field instanceof HTMLInputElement && field.type === 'password',
      empty: value === '',
    };
  }

  if (zone === 'titlebar') return { kind: 'titlebar', zone, element };
  if (zone === 'statusbar')
    return { kind: 'statusbar', zone, element, copyText: copyTextOf(element) };

  const document = element.ownerDocument;
  const explicitCopy = element.closest('[data-context-copy]')?.getAttribute('data-context-copy');
  return {
    kind: 'content',
    zone: zone ?? 'content',
    element,
    selectedText: document.getSelection()?.toString() ?? '',
    link: linkOf(element),
    copyText: explicitCopy == null || explicitCopy === '' ? null : explicitCopy,
    selectable: isSelectable(element),
    selectRoot: element.closest('[data-context-zone]') ?? element.closest('main') ?? document.body,
  };
}
