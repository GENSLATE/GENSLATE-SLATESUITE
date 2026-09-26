import { twMergeConfig } from '@genslate/tokens/tw-merge';
import { type ClassValue, cnMerge, createTV } from 'tailwind-variants';

/**
 * Merges class names, resolving Tailwind conflicts with the token-aware config
 * (`text-sm` vs `text-fg-muted`, `h-control-md` vs `h-8`, `z-popover` vs `z-10`, …).
 */
export function cn(...classes: ClassValue[]): string {
  return cnMerge(...classes)({ twMergeConfig }) ?? '';
}

/** tailwind-variants configured with the token-aware tailwind-merge. */
export const tv = createTV({ twMergeConfig });

export type { ClassValue, VariantProps } from 'tailwind-variants';
