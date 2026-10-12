import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useIsMobile, usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { cx } from '../../lib/cx';
import { DURATION, EASE } from '../../lib/motion';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open dialogs, oldest first — only the top one answers Escape and Tab.
const stack: string[] = [];

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Badge shown before the title. */
  icon?: ReactNode;
  /** Extra content at the end of the header, before the close button. */
  aside?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * A dialog on desktop and a draggable bottom sheet on phones.
 * Traps focus, closes on Escape / backdrop press, and restores focus on close.
 */
export default function Modal({ open, onClose, title, subtitle, icon, aside, size = 'md', footer, className = '', children }: ModalProps) {
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const dragControls = useDragControls();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    stack.push(titleId);
    document.body.classList.add('is-locked');

    const frame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      // On phones, focusing a field would summon the keyboard over the sheet,
      // so fields opt in with data-autofocus="desktop".
      const preferred = dialog.querySelector<HTMLElement>(isMobile ? '[data-autofocus]:not([data-autofocus="desktop"])' : '[data-autofocus]');
      const firstField = isMobile ? null : dialog.querySelector<HTMLElement>('.modal__body input, .modal__body select, .modal__body textarea');
      (preferred || firstField || dialog).focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (stack[stack.length - 1] !== titleId || !dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((node) => node.getClientRects().length);
      if (!nodes.length) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || current === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      const index = stack.indexOf(titleId);
      if (index !== -1) stack.splice(index, 1);
      if (!stack.length) document.body.classList.remove('is-locked');
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus({ preventScroll: true });
    };
    // isMobile is read once on open; re-running on resize would steal focus.
  }, [open, titleId]);

  const sheet = isMobile;
  // Dialogs drift up and settle; sheets rise from the bottom edge. Neither springs.
  const motionProps = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }
    : sheet
      ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: { duration: 0.5, ease: EASE } }
      : {
          initial: { opacity: 0, y: 20, scale: 0.98 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: 10, scale: 0.99 },
          transition: { duration: DURATION.calm, ease: EASE },
        };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={cx('modal-root', sheet && 'modal-root--sheet')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.quick }}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onClose?.();
          }}
        >
          <motion.div
            ref={dialogRef}
            className={cx('modal', `modal--${size}`, className)}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            {...motionProps}
            drag={sheet && !reducedMotion ? 'y' : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 620) onClose?.();
            }}
          >
            {sheet && (
              <div className="modal__grabber" onPointerDown={(event) => dragControls.start(event)} aria-hidden="true">
                <span />
              </div>
            )}
            <header className="modal__header">
              {icon && <span className="modal__icon">{icon}</span>}
              <div className="modal__titles">
                <h2 id={titleId} className="modal__title">
                  {title}
                </h2>
                {subtitle && <p className="modal__subtitle">{subtitle}</p>}
              </div>
              {aside}
              <button type="button" className="icon-button icon-button--quiet" aria-label="Close" onClick={onClose}>
                <X size={18} />
              </button>
            </header>
            <div className="modal__body">{children}</div>
            {footer && <footer className="modal__footer">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
