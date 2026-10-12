import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronsLeft, ChevronsRight, MapPin, Sprout } from 'lucide-react';
import { NAV_ITEMS } from './nav';
import { SALON } from '../../data/catalog';
import { cx } from '../../lib/cx';
import { CALM } from '../../lib/motion';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cx('brand', compact && 'brand--compact')}>
      <span className="brand__mark" aria-hidden="true">
        <Sprout size={compact ? 18 : 20} strokeWidth={1.7} />
      </span>
      <span className="brand__name" aria-hidden="true">
        <span className="brand__word">{SALON.name}</span>
        {!compact && <span className="brand__tag">Hair &amp; Nail Salon</span>}
      </span>
      <span className="sr-only">{SALON.fullName}</span>
    </div>
  );
}

/** Desktop navigation. Collapses to an icon rail; labels stay available to screen readers and as tooltips. */
export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const ToggleIcon = collapsed ? ChevronsRight : ChevronsLeft;
  return (
    <aside className={cx('sidebar', collapsed && 'is-collapsed')}>
      <Brand />

      <nav className="sidebar__nav" aria-label="Main menu">
        <p className="sidebar__label">Main menu</p>
        <ul>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} title={collapsed ? label : undefined} className={({ isActive }) => cx('sidebar__link', isActive && 'is-active')}>
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="sidebar-active" className="sidebar__active" transition={CALM} />}
                    <span className="sidebar__icon">
                      <Icon size={18} strokeWidth={1.6} />
                    </span>
                    <span className="sidebar__text">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <button
        type="button"
        className="sidebar__link sidebar__toggle"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : undefined}
      >
        <span className="sidebar__icon">
          <ToggleIcon size={18} strokeWidth={1.6} />
        </span>
        <span className="sidebar__text" aria-hidden="true">
          Collapse
        </span>
      </button>

      <div className="sidebar__foot">
        <span className="sidebar__pin">
          <MapPin size={15} strokeWidth={1.8} />
        </span>
        <p>
          <strong>{SALON.area}</strong>
          {SALON.address}
        </p>
      </div>
    </aside>
  );
}
