import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Ban, Check, ChevronLeft, ChevronRight, Hourglass, Search, X, type LucideIcon } from 'lucide-react';
import ActionMenu, { type MenuItem } from './ActionMenu';
import { useShell } from '../layout/shell';
import { initials } from '../../lib/format';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { cx } from '../../lib/cx';
import { CALM } from '../../lib/motion';

/* ── Page header ─────────────────────────────────────────── */

export interface PrimaryAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  /** Second half of the title, set in italic. */
  accent?: string;
  /** One short line of context under the title. */
  subtitle?: string;
  /** The page's main action. It is shown in the top bar on desktop and as the floating button on phones. */
  primary?: PrimaryAction;
  /** Secondary controls beside the title (filters, export) — desktop only. */
  actions?: ReactNode;
  /** The same secondary actions as a menu, for phones. */
  menuItems?: MenuItem[];
  menuIcon?: ReactNode;
}

/**
 * Every page opens the same way: a small label, the title, one line of context.
 * The primary action always lands in the same place, so it is never hunted for.
 */
export function PageHeader({ eyebrow, title, accent, subtitle, primary, actions, menuItems, menuIcon }: PageHeaderProps) {
  const isMobile = useIsMobile();
  const { primarySlot } = useShell();
  return (
    <header className="page-header">
      <div className="page-header__text">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">
          {title}
          {accent && (
            <>
              {' '}
              <em>{accent}</em>
            </>
          )}
        </h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {!isMobile && actions && <div className="page-header__actions">{actions}</div>}
      {isMobile && menuItems && menuItems.length > 0 && (
        <ActionMenu items={menuItems} title="More actions" className="icon-button icon-button--outline" aria-label="More actions">
          {menuIcon}
        </ActionMenu>
      )}
      {primary &&
        !isMobile &&
        primarySlot &&
        createPortal(
          <button type="button" className="btn btn--primary" onClick={primary.onClick} aria-keyshortcuts="N">
            <primary.icon size={17} strokeWidth={1.9} /> {primary.label}
          </button>,
          primarySlot,
        )}
      {primary && <Fab icon={primary.icon} label={primary.label} onClick={primary.onClick} />}
    </header>
  );
}

/* ── Status ──────────────────────────────────────────────── */

const STATUS: Record<string, { tone: string; icon: LucideIcon }> = {
  Pending: { tone: 'pending', icon: Hourglass },
  Completed: { tone: 'completed', icon: Check },
  Cancelled: { tone: 'cancelled', icon: Ban },
  Active: { tone: 'completed', icon: Check },
  Inactive: { tone: 'cancelled', icon: Ban },
};

export function StatusBadge({ status }: { status: string }) {
  const { tone, icon: Icon } = STATUS[status] || STATUS.Pending;
  return (
    <span className={`badge badge--${tone}`}>
      <Icon size={11} strokeWidth={2.4} aria-hidden="true" />
      {status}
    </span>
  );
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`avatar avatar--${size}`} aria-hidden="true">
      {initials(name) || '·'}
    </span>
  );
}

/* ── Inputs ──────────────────────────────────────────────── */

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  label = 'Search',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <div className="search">
      <Search size={16} strokeWidth={1.8} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        aria-keyshortcuts="/"
        autoComplete="off"
        spellCheck={false}
      />
      {value && (
        <button type="button" className="search__clear" aria-label="Clear search" onClick={() => onChange('')}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

interface ControlProps {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

/** Label + control + inline error. Pass the control as a render function to receive ids. */
export function Field({
  label,
  error,
  hint,
  optional,
  children,
  className = '',
}: {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: (props: ControlProps) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cx('field', error && 'field--error', className)}>
      <label className="field__label" htmlFor={id}>
        {label}
        {optional && <span className="field__optional">Optional</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p className="field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p className="field__hint" id={`${id}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={cx('switch', checked && 'is-on')} onClick={() => onChange(!checked)}>
      <span className="switch__thumb" />
    </button>
  );
}

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

/** Segmented control with a sliding thumb. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  id,
}: {
  options: Array<Option<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  id?: string;
}) {
  const groupId = useId();
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((option) => {
        const Icon = option.icon;
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            id={id ? `${id}-${option.value}` : undefined}
            aria-selected={selected}
            className={cx('segmented__item', selected && 'is-selected')}
            onClick={() => onChange(option.value)}
          >
            {selected && <motion.span layoutId={`segmented-${groupId}`} className="segmented__thumb" transition={CALM} />}
            <span className="segmented__content">
              {Icon && <Icon size={15} />}
              {option.label}
              {option.count !== undefined && <span className="segmented__count">{option.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Filter chips. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<Option<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="chip-scroller" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" className="chip" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
          {option.count !== undefined && <span className="chip__count">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ── Lists ───────────────────────────────────────────────── */

/** Line drawing for empty states: two quiet hills, a leaf, and a path winding between them. */
function PathArt() {
  return (
    <svg className="empty__art" viewBox="0 0 168 96" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path className="art__hill" pathLength={1} d="M4 70 C 28 46, 52 44, 76 60 S 124 80, 164 52" />
      <path className="art__hill" pathLength={1} d="M4 88 C 40 70, 70 76, 98 84 S 140 90, 164 78" />
      <path className="art__path" d="M14 92 C 40 82, 58 88, 80 74 S 112 40, 154 34" />
      <path className="art__leaf" d="M26 46 c 0 -10 6 -16 14 -18 c 0 10 -6 16 -14 18 Z M26 46 l 9 -11" />
      <path className="art__leaf" d="M134 28 c 2 -8 8 -12 15 -12 c -1 8 -7 12 -15 12 Z M134 28 l 10 -8" />
    </svg>
  );
}

/** A calm drawing, a short friendly message and — when there is something to do — one action. */
export function EmptyState({ icon: Icon, title, description, action }: { icon?: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <PathArt />
        {Icon && (
          <span className="empty__mark">
            <Icon size={18} strokeWidth={1.6} />
          </span>
        )}
      </span>
      <p className="empty__title">{title}</p>
      {description && <p className="empty__description">{description}</p>}
      {action}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  from,
  to,
  total,
  onChange,
  noun = 'records',
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  onChange: (page: number) => void;
  noun?: string;
}) {
  if (!total) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination__summary">
        Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong> {noun}
      </p>
      <div className="pagination__controls">
        <button type="button" className="icon-button icon-button--outline icon-button--sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={16} />
        </button>
        <span className="pagination__page">
          {page} <span>/ {pageCount}</span>
        </span>
        <button
          type="button"
          className="icon-button icon-button--outline icon-button--sm"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}

/** The page's main action as a floating button — phones only. */
function Fab({ icon: Icon, label, onClick }: PrimaryAction) {
  const isMobile = useIsMobile();
  if (!isMobile) return null;
  return createPortal(
    <motion.button
      type="button"
      className="fab"
      aria-label={label}
      onClick={onClick}
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ ...CALM, delay: 0.15 }}
    >
      <Icon size={24} strokeWidth={1.9} />
    </motion.button>,
    document.body,
  );
}
