import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info, TriangleAlert, X } from 'lucide-react';
import { ToastContext, type ToastInput } from './useToast';
import { CALM } from '../../lib/motion';

type Toast = Required<Pick<ToastInput, 'tone' | 'duration'>> & ToastInput & { id: number };

const ICONS = { success: Check, error: TriangleAlert, info: Info };
let counter = 0;

/** Slides in softly from the side and leaves on its own. */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const Icon = ICONS[toast.tone];
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <motion.li
      layout
      className={`toast toast--${toast.tone}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={CALM}
    >
      <span className="toast__icon">
        <Icon size={15} strokeWidth={2.2} />
      </span>
      <div className="toast__text">
        <p className="toast__title">{toast.title}</p>
        {toast.description && <p className="toast__description">{toast.description}</p>}
      </div>
      <button type="button" className="toast__close" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}>
        <X size={15} />
      </button>
    </motion.li>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const push = useCallback((toast: ToastInput) => {
    counter += 1;
    const entry: Toast = { tone: 'success', duration: 4200, ...toast, id: counter };
    setToasts((list) => [...list.slice(-2), entry]);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      {createPortal(
        <ul className="toasts" aria-label="Notifications">
          <AnimatePresence initial={false}>
            {toasts.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
          </AnimatePresence>
        </ul>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
