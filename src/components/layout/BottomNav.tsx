import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { NAV_ITEMS } from './nav';
import { cx } from '../../lib/cx';
import { CALM } from '../../lib/motion';

/** Phone tab bar — floats above the content and respects the home-indicator inset. */
export default function BottomNav() {
  return (
    <nav className="tabbar" aria-label="Main menu">
      {NAV_ITEMS.map(({ to, label, short, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => cx('tabbar__item', isActive && 'is-active')}>
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="tabbar-active" className="tabbar__pill" transition={CALM} />}
              <span className="tabbar__icon">
                <Icon size={21} strokeWidth={isActive ? 1.9 : 1.6} />
              </span>
              <span className="tabbar__label">{short}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
