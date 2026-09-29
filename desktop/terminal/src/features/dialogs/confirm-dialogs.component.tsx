import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogPopup,
  AlertDialogTitle,
  Badge,
} from '@genslate/design-system';

import { useTerminal } from '../../app/terminal.context';
import { plural } from '../../model/format.util';
import type { PasteReview, PasteRisk } from '../../model/paste.util';

const RISKS: Readonly<Record<PasteRisk, string>> = {
  multiline: 'Several lines: each may run as soon as it arrives',
  elevated: 'Runs as administrator (sudo, runas)',
  destructive: 'Deletes or overwrites (rm -rf, format, del /s)',
};

const PREVIEW_LINES = 8;

/** A paste that could do harm: show it before it reaches the shell. */
export function PasteDialog({
  paneId,
  text,
  review,
}: {
  readonly paneId: string;
  readonly text: string;
  readonly review: PasteReview;
}) {
  const api = useTerminal();
  const lines = text.split(/\r?\n/);
  const shown = lines.slice(0, PREVIEW_LINES).join('\n');

  return (
    <AlertDialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <AlertDialogPopup tone="danger" size="md">
        <AlertDialogTitle>Paste {plural(review.lines, 'line')} into the shell?</AlertDialogTitle>
        <AlertDialogDescription render={<div />} className="flex flex-col gap-2">
          <ul className="flex flex-col gap-1">
            {review.risks.map((risk) => (
              <li key={risk} className="flex items-center gap-2 text-sm">
                <Badge tone={risk === 'multiline' ? 'warning' : 'danger'} size="sm" dot>
                  {risk === 'multiline' ? 'Lines' : risk === 'elevated' ? 'Admin' : 'Destructive'}
                </Badge>
                <span className="text-fg-secondary">{RISKS[risk]}</span>
              </li>
            ))}
          </ul>
          <pre className="scrollbar-thin max-h-48 overflow-auto rounded-control bg-terminal-bg p-2.5 font-mono text-terminal-fg text-xs">
            {shown}
            {lines.length > PREVIEW_LINES
              ? `\n… ${plural(lines.length - PREVIEW_LINES, 'more line')}`
              : ''}
          </pre>
        </AlertDialogDescription>
        <AlertDialogFooter>
          {review.lines > 1 ? (
            <AlertDialogClose
              className="mr-auto"
              onClick={() => api.paste(text.replace(/\r?\n/g, ' '), paneId, true)}
            >
              Paste as one line
            </AlertDialogClose>
          ) : null}
          <AlertDialogClose>Cancel</AlertDialogClose>
          <AlertDialogClose tone="danger" onClick={() => api.paste(text, paneId, true)}>
            Paste
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

/** Closing a tab or pane that still runs a program. */
export function CloseDialog({
  target,
  running,
}: {
  readonly target: { readonly kind: 'pane' | 'tab'; readonly id: string };
  readonly running: readonly string[];
}) {
  const api = useTerminal();
  const what = running.length === 1 ? `“${running[0] ?? ''}” is` : `${running.length} programs are`;

  return (
    <AlertDialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <AlertDialogPopup tone="danger">
        <AlertDialogTitle>Close this {target.kind}?</AlertDialogTitle>
        <AlertDialogDescription>
          {what} still running in it. Closing ends {running.length === 1 ? 'it' : 'them'}.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogClose>Cancel</AlertDialogClose>
          <AlertDialogClose
            tone="danger"
            onClick={() =>
              target.kind === 'pane'
                ? api.closePane(target.id, true)
                : api.closeTab(target.id, true)
            }
          >
            Close {target.kind}
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

/** Forgetting every command in the history. */
export function ClearHistoryDialog() {
  const api = useTerminal();
  return (
    <AlertDialog open onOpenChange={(open) => (open ? undefined : api.closeDialog())}>
      <AlertDialogPopup tone="danger">
        <AlertDialogTitle>Clear the command history?</AlertDialogTitle>
        <AlertDialogDescription>
          Every command the Terminal remembers is removed from the database. Your shells’ own
          history files are not touched.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogClose>Cancel</AlertDialogClose>
          <AlertDialogClose tone="danger" onClick={() => api.clearHistory()}>
            Clear history
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
