import { createContext, useContext } from 'react';

export interface TreeContextValue {
  selected: string | null;
  focusedId: string | null;
  isExpanded: (id: string) => boolean;
  toggle: (id: string) => void;
  select: (id: string) => void;
  focusItem: (id: string) => void;
  action: (id: string) => void;
  indentGuides: 'always' | 'hover' | 'none';
}

export const TreeContext = createContext<TreeContextValue | null>(null);

export function useTreeContext(): TreeContextValue {
  const context = useContext(TreeContext);
  if (!context) throw new Error('TreeItem must be rendered inside <Tree>.');
  return context;
}

/** Nesting depth of the current item's children (1 for top-level items). */
export const TreeLevelContext = createContext(1);
