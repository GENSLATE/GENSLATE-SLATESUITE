import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import type { DialogProps, DialogTriggerProps } from './dialog.types';

/** A modal window (Base UI `Dialog.Root`). Compose `DialogTrigger` + `DialogPopup`. */
export function Dialog(props: DialogProps) {
  return <BaseDialog.Root {...props} />;
}

/** Opens the dialog. Use `render` to supply your own button. */
export function DialogTrigger({ className, ...props }: DialogTriggerProps) {
  return <BaseDialog.Trigger data-slot="dialog-trigger" className={className} {...props} />;
}
