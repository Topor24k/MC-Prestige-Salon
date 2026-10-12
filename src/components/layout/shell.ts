import { createContext, useContext } from 'react';

export interface ShellValue {
  /** The spot in the top bar where the current page's primary action is shown. */
  primarySlot: HTMLElement | null;
  openPalette: () => void;
}

export const ShellContext = createContext<ShellValue>({ primarySlot: null, openPalette: () => {} });

export const useShell = () => useContext(ShellContext);
