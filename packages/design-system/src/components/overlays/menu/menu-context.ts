import { createContext, useContext } from 'react';

/** True inside a `MenuSubmenuRoot`: nested popups line their first row up with the trigger row. */
export const MenuSubmenuContext = createContext(false);

export const useIsSubmenu = () => useContext(MenuSubmenuContext);
