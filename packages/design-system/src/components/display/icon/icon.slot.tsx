import type { ReactElement, ReactNode } from 'react';
import { Icon } from './icon.component';
import type { CodiconRef, IconSize } from './icon.types';

/** An icon prop: a codicon reference (`"codicon:add"`) or any element (`<Icon icon={Star} />`). */
export type IconSlot = CodiconRef | ReactElement;

/** Renders an `IconSlot` at a size; strings become decorative codicons. */
export function renderIconSlot(slot: IconSlot, size: IconSize = 16): ReactNode {
  if (typeof slot === 'string' && slot.startsWith('codicon:'))
    return <Icon name={slot as CodiconRef} size={size} />;
  return slot;
}
