import { tv } from '../../../utils/cn.util';

export const contextMenuVariants = tv({
  slots: {
    trigger: 'outline-none',
    positioner: 'z-popover outline-none',
    popup: 'scrollbar-none max-h-(--available-height) overflow-y-auto overscroll-contain',
  },
});
