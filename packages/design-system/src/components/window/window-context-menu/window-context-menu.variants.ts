import { tv } from '../../../utils/cn.util';

export const windowContextMenuVariants = tv({
  slots: {
    /** The trigger wraps the whole window without adding a layout box. */
    trigger: 'contents',
    popup: 'min-w-52 max-w-80',
  },
});
