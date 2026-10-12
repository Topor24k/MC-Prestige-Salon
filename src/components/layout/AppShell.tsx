import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Ambient from './Ambient';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { ShellContext } from './shell';
import CommandPalette from '../ui/CommandPalette';
import PageSkeleton from '../ui/Skeleton';
import { useFittingTables } from '../../hooks/useFittingTables';
import { useIsMobile, useMediaQuery, usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { useShortcuts } from '../../hooks/useShortcuts';
import { cx } from '../../lib/cx';
import { DURATION, EASE } from '../../lib/motion';

const SIDEBAR_KEY = 'mc-prestige-salon/sidebar';

/** The sidebar follows the screen width until the user picks a state; their choice is then remembered. */
function useSidebarCollapsed(): [boolean, () => void] {
  const narrow = useMediaQuery('(max-width: 1180px)');
  const [choice, setChoice] = useState<'collapsed' | 'expanded' | null>(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_KEY);
      return saved === 'collapsed' || saved === 'expanded' ? saved : null;
    } catch {
      return null;
    }
  });
  const collapsed = choice ? choice === 'collapsed' : narrow;
  const toggle = () => {
    const next = collapsed ? 'expanded' : 'collapsed';
    setChoice(next);
    try {
      window.localStorage.setItem(SIDEBAR_KEY, next);
    } catch {
      // The choice still applies for this visit.
    }
  };
  return [collapsed, toggle];
}

/**
 * Frame for the admin: sidebar (or phone tab bar), top bar, the routed page, and the
 * things that are always within reach — the command palette and keyboard shortcuts.
 */
export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const [collapsed, toggleSidebar] = useSidebarCollapsed();
  const [primarySlot, setPrimarySlot] = useState<HTMLElement | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  useFittingTables(mainRef);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const shell = useMemo(() => ({ primarySlot, openPalette: () => setPaletteOpen(true) }), [primarySlot]);

  useShortcuts({
    onPalette: () => setPaletteOpen((open) => !open),
    onGo: (path) => navigate(path),
    // The page's primary action: the top-bar button on desktop, the floating button on phones.
    onPrimary: () => (primarySlot?.querySelector('button') ?? document.querySelector<HTMLButtonElement>('.fab'))?.click(),
    onToggleSidebar: toggleSidebar,
  });

  return (
    <ShellContext.Provider value={shell}>
      <div className={cx('app', collapsed && 'is-sidebar-collapsed')}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {!isMobile && <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />}

        <div className="app__main">
          <Ambient />
          <TopBar primarySlotRef={setPrimarySlot} />
          <main id="main" className="app__content" tabIndex={-1} ref={mainRef}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                className="page"
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: DURATION.quick, ease: EASE }}
              >
                <Suspense fallback={<PageSkeleton />}>
                  <Outlet />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {isMobile && <BottomNav />}
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onToggleSidebar={toggleSidebar} />
      </div>
    </ShellContext.Provider>
  );
}
