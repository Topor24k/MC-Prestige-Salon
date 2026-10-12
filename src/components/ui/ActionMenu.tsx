import { useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, type LucideIcon } from 'lucide-react';
import Modal from './Modal';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { cx } from '../../lib/cx';

export interface MenuItem {
  key?: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  tone?: 'danger';
  /** Present on radio-style items. */
  checked?: boolean;
  disabled?: boolean;
  /** Draws a divider above the item. */
  separated?: boolean;
  onSelect?: () => void;
}

interface ActionMenuProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  items: MenuItem[];
  title?: string;
  /** Extra content under the items; receives a function that closes the menu. */
  footer?: (close: () => void) => ReactNode;
  align?: 'start' | 'end';
  className?: string;
  children?: ReactNode;
}

const inside = (element: HTMLElement | null, target: EventTarget | null) => Boolean(element && target instanceof Node && element.contains(target));

/** A popover menu on desktop; an action sheet on phones. */
export default function ActionMenu({ items, title = 'Actions', footer, align = 'end', className = 'icon-button', children, ...buttonProps }: ActionMenuProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);
  const select = (item: MenuItem) => {
    close();
    item.onSelect?.();
  };

  useLayoutEffect(() => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!open || isMobile || !button || !menu) {
      setPosition(null);
      return;
    }
    const trigger = button.getBoundingClientRect();
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    let top = trigger.bottom + 8;
    if (top + height > window.innerHeight - 12) top = Math.max(12, trigger.top - height - 8);
    let left = align === 'end' ? trigger.right - width : trigger.left;
    left = Math.min(Math.max(12, left), window.innerWidth - width - 12);
    setPosition({ top, left });
    menu.querySelector<HTMLElement>('[role^="menuitem"]:not(:disabled)')?.focus({ preventScroll: true });
  }, [open, isMobile, align]);

  useEffect(() => {
    if (!open || isMobile) return undefined;
    const isOurs = (target: EventTarget | null) => inside(menuRef.current, target) || inside(buttonRef.current, target);
    const onPointerDown = (event: PointerEvent) => {
      if (!isOurs(event.target)) setOpen(false);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!isOurs(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      // Leave arrow keys alone inside footer controls such as a <select>.
      if (document.activeElement?.closest('.menu-footer')) return;
      const nodes = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled)') ?? [])];
      if (!nodes.length) return;
      event.preventDefault();
      const index = nodes.indexOf(document.activeElement as HTMLElement);
      const next = event.key === 'ArrowDown' ? (index + 1) % nodes.length : (index - 1 + nodes.length) % nodes.length;
      nodes[next].focus();
    };
    const onScroll = (event: Event) => {
      if (!inside(menuRef.current, event.target)) setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, isMobile]);

  const renderItems = (itemClass: 'menu-item' | 'sheet-item') =>
    items.map((item) => {
      const Icon = item.icon;
      return (
        <button
          key={item.key || item.label}
          type="button"
          role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
          aria-checked={item.checked === undefined ? undefined : item.checked}
          className={cx(itemClass, item.tone && `${itemClass}--${item.tone}`, item.separated && `${itemClass}--separated`)}
          disabled={item.disabled}
          onClick={() => select(item)}
        >
          {Icon && (
            <span className={`${itemClass}-icon`}>
              <Icon size={16} strokeWidth={1.7} />
            </span>
          )}
          <span className={`${itemClass}-text`}>
            <span>{item.label}</span>
            {item.description && <small>{item.description}</small>}
          </span>
          {item.checked && <Check size={16} strokeWidth={2.4} className={`${itemClass}-check`} />}
        </button>
      );
    });

  return (
    <>
      <button ref={buttonRef} type="button" className={className} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} {...buttonProps}>
        {children}
      </button>

      {isMobile ? (
        <Modal open={open} onClose={close} title={title} size="sm" className="modal--actions">
          <div className="sheet-list" role="menu" aria-label={title}>
            {renderItems('sheet-item')}
          </div>
          {footer && <div className="sheet-footer">{footer(close)}</div>}
        </Modal>
      ) : (
        open &&
        createPortal(
          <div
            ref={menuRef}
            className="menu"
            role="menu"
            aria-label={title}
            style={{ top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? 'visible' : 'hidden' }}
          >
            {renderItems('menu-item')}
            {footer && <div className="menu-footer">{footer(close)}</div>}
          </div>,
          document.body,
        )
      )}
    </>
  );
}
