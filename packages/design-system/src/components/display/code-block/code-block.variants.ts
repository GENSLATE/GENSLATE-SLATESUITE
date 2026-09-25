import { tv } from '../../../utils/cn.util';

export const codeBlockVariants = tv({
  slots: {
    root: 'group/code relative inset-ring inset-ring-border-subtle m-0 flex min-w-0 flex-col overflow-hidden rounded-card bg-surface-sunken',
    header: 'hairline-b flex h-8 shrink-0 items-center gap-2 pr-1 pl-3',
    title: 'truncate-flex flex-1 text-fg-secondary text-sm',
    language: 'font-mono text-2xs text-fg-muted uppercase tracking-wide',
    pre: 'scrollbar-thin m-0 select-text overflow-auto py-2.5 font-mono text-code text-fg',
    line: 'flex px-3',
    gutter: 'mr-4 inline-block w-6 shrink-0 select-none text-right text-fg-disabled tabular-nums',
    floating: [
      'absolute top-1.5 right-1.5 opacity-0 transition-opacity duration-fast ease-standard',
      'focus-within:opacity-100 group-hover/code:opacity-100',
    ],
  },
  variants: {
    wrap: {
      true: { pre: 'whitespace-pre-wrap break-words' },
      false: { pre: 'whitespace-pre' },
    },
  },
  defaultVariants: { wrap: false },
});
