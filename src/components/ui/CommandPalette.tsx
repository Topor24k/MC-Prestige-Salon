import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarPlus, LogOut, PanelLeft, ReceiptText, Scissors, Search, UserPlus, UserRound, type LucideIcon } from 'lucide-react';
import { NAV_ITEMS } from '../layout/nav';
import type { PageCommand } from '../../hooks/usePageCommand';
import { cx } from '../../lib/cx';
import { displayCustomerId } from '../../lib/format';
import { CALM, DURATION, EASE } from '../../lib/motion';
import { priceLabel } from '../../lib/services';
import { useAuth } from '../../store/useAuth';
import { useSalon } from '../../store/useSalon';

interface Command {
  id: string;
  group: 'Go to' | 'Create' | 'Customers' | 'Services' | 'General';
  label: string;
  hint?: string;
  icon: LucideIcon;
  /** Keyboard shortcut shown beside the command. */
  keys?: string[];
  run: () => void;
}

const matches = (text: string, query: string) => text.toLowerCase().includes(query);

/**
 * Command palette (Ctrl / Cmd + K): jump to a page, start something new, or find a
 * customer or service by name. Arrow keys move, Enter opens, Escape closes.
 */
export default function CommandPalette({ open, onClose, onToggleSidebar }: { open: boolean; onClose: () => void; onToggleSidebar: () => void }) {
  const navigate = useNavigate();
  const { customers, services } = useSalon();
  const { signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Start fresh each time, and hand focus back to where it was on closing.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    setQuery('');
    setActive(0);
    document.body.classList.add('is-locked');
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      if (!document.querySelector('.modal-root')) document.body.classList.remove('is-locked');
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    };
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (path: string, state?: PageCommand) => () => navigate(path, state ? { state } : undefined);
    const q = query.trim().toLowerCase();

    const fixed: Command[] = [
      ...NAV_ITEMS.map<Command>((item) => ({
        id: `go-${item.to}`,
        group: 'Go to',
        label: item.label,
        icon: item.icon,
        keys: ['G', item.key.toUpperCase()],
        run: go(item.to),
      })),
      { id: 'new-appointment', group: 'Create', label: 'New appointment', hint: 'Book a customer in', icon: CalendarPlus, run: go('/admin/appointments', { command: 'new' }) },
      { id: 'new-entry', group: 'Create', label: 'New financial entry', hint: 'Record a day’s income and expenses', icon: ReceiptText, run: go('/admin/financial-report', { command: 'new' }) },
      { id: 'new-customer', group: 'Create', label: 'New customer', hint: 'Register a customer or a walk-in', icon: UserPlus, run: go('/admin/customers', { command: 'new' }) },
      { id: 'new-service', group: 'Create', label: 'New service', hint: 'Add to the price list', icon: Scissors, run: go('/admin/services', { command: 'new' }) },
      { id: 'sidebar', group: 'General', label: 'Collapse or expand the sidebar', icon: PanelLeft, keys: ['['], run: onToggleSidebar },
      { id: 'sign-out', group: 'General', label: 'Sign out', icon: LogOut, run: signOut },
    ];
    if (!q) return fixed;

    const found: Command[] = [];
    if (q.length >= 2) {
      for (const customer of customers) {
        if (found.length >= 5) break;
        if (matches(customer.name, q) || matches(customer.phone, q) || matches(customer.id, q)) {
          found.push({
            id: `customer-${customer.id}`,
            group: 'Customers',
            label: customer.name,
            hint: [displayCustomerId(customer.id), customer.phone].filter(Boolean).join(' · '),
            icon: UserRound,
            run: go('/admin/customers', { search: customer.name }),
          });
        }
      }
      let count = 0;
      for (const service of services) {
        if (count >= 5) break;
        if (matches(service.name, q)) {
          count += 1;
          found.push({
            id: `service-${service.id}`,
            group: 'Services',
            label: service.name,
            hint: `${service.group} · ${priceLabel(service)}`,
            icon: Scissors,
            run: go('/admin/services', { search: service.name }),
          });
        }
      }
    }
    return [...fixed.filter((command) => matches(`${command.group} ${command.label} ${command.hint ?? ''}`, q)), ...found];
  }, [query, customers, services, navigate, onToggleSidebar, signOut]);

  const current = Math.min(active, Math.max(0, commands.length - 1));

  useEffect(() => {
    listRef.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
  }, [current, commands]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current + step + commands.length) % Math.max(1, commands.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(commands[current]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'Tab') {
      event.preventDefault();
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="palette-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.quick, ease: EASE }}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={CALM}
            onKeyDown={onKeyDown}
          >
            <div className="palette__search">
              <Search size={18} strokeWidth={1.8} aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={commands[current] ? `palette-${commands[current].id}` : undefined}
                aria-label="Search pages, actions, customers and services"
                placeholder="Search pages, actions, customers, services…"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
              />
              <kbd className="kbd">Esc</kbd>
            </div>

            <div className="palette__list" id="palette-list" role="listbox" aria-label="Results" ref={listRef}>
              {commands.length ? (
                commands.map((command, index) => (
                  <div key={command.id}>
                    {(index === 0 || commands[index - 1].group !== command.group) && <p className="palette__group">{command.group}</p>}
                    <button
                      type="button"
                      id={`palette-${command.id}`}
                      role="option"
                      aria-selected={index === current}
                      tabIndex={-1}
                      className={cx('palette__item', index === current && 'is-active')}
                      onPointerMove={() => setActive(index)}
                      onClick={() => run(command)}
                    >
                      <span className="palette__icon">
                        <command.icon size={16} strokeWidth={1.7} />
                      </span>
                      <span className="palette__text">
                        <strong>{command.label}</strong>
                        {command.hint && <small>{command.hint}</small>}
                      </span>
                      {command.keys && (
                        <span className="palette__keys" aria-hidden="true">
                          {command.keys.map((key) => (
                            <kbd key={key} className="kbd">
                              {key}
                            </kbd>
                          ))}
                        </span>
                      )}
                    </button>
                  </div>
                ))
              ) : (
                <p className="palette__empty">Nothing matches “{query.trim()}”. Try a page, a customer’s name or a service.</p>
              )}
            </div>

            <div className="palette__foot" aria-hidden="true">
              <span>
                <kbd className="kbd">↑</kbd>
                <kbd className="kbd">↓</kbd> to move
              </span>
              <span>
                <kbd className="kbd">↵</kbd> to open
              </span>
              <span>
                <kbd className="kbd">N</kbd> new on this page
              </span>
              <span>
                <kbd className="kbd">/</kbd> search this page
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
