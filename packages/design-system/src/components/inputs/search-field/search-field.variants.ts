import { tv } from '../../../utils/cn.util';

/** The `⌘F`-style hint at the trailing edge of an empty search field. */
export const searchFieldHintVariants = tv({
  base: [
    'pointer-events-none rounded-xs border border-border-subtle px-1 font-sans text-fg-muted text-xs tabular-nums',
    'transition-opacity duration-fast ease-standard group-focus-within/field:opacity-0',
  ],
});
