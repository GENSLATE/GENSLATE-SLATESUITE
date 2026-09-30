import { tv } from '../../../utils/cn.util';

export const featureTeaserVariants = tv({
  slots: {
    root: 'flex flex-col gap-2 px-4 pt-3 pb-4',
    header: 'flex items-center gap-2',
    icon: 'grid size-7 shrink-0 place-items-center rounded-md bg-accent-subtle text-accent-fg',
    title: 'truncate font-semibold text-base text-fg-strong',
    badge: 'ml-auto shrink-0',
    description: 'text-fg-secondary text-sm leading-relaxed',
    sample: 'flex flex-col gap-1.5 px-4',
    sampleLabel: 'font-semibold text-2xs text-fg-muted uppercase tracking-wider',
    sampleBody: 'pointer-events-none select-none opacity-60',
  },
});
