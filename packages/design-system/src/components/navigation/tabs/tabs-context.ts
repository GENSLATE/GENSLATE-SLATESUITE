import { createContext, useContext } from 'react';
import type { TabsVariant } from './tabs.types';

export const TabsVariantContext = createContext<TabsVariant>('underline');

export const useTabsVariant = () => useContext(TabsVariantContext);
