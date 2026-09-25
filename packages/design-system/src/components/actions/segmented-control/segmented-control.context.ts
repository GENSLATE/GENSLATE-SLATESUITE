import { createContext } from 'react';
import type { SegmentedControlSize } from './segmented-control.types';

export const SegmentedControlContext = createContext<{ size: SegmentedControlSize }>({
  size: 'md',
});
