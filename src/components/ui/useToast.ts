import { createContext, useContext } from 'react';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: 'success' | 'error' | 'info';
  /** Milliseconds before it leaves on its own. */
  duration?: number;
}

export const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

/** const toast = useToast(); toast({ title, description, tone }) */
export const useToast = () => useContext(ToastContext);
