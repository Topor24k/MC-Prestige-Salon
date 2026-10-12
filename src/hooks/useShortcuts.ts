import { useEffect, useRef } from 'react';
import { NAV_ITEMS } from '../components/layout/nav';

interface ShortcutHandlers {
  /** Ctrl / Cmd + K */
  onPalette: () => void;
  /** G, then the page's letter */
  onGo: (path: string) => void;
  /** N — the current page's primary action */
  onPrimary: () => void;
  /** [ */
  onToggleSidebar: () => void;
}

const GO = new Map(NAV_ITEMS.map((item) => [item.key, item.to]));
const typingIn = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName));

/**
 * Keyboard shortcuts for the whole admin. Single keys are ignored while typing in a
 * field or while a dialog is open, so they never get in the way.
 */
export function useShortcuts(handlers: ShortcutHandlers) {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    let leaderAt = 0;
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === 'k') {
        event.preventDefault();
        latest.current.onPalette();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (typingIn(event.target) || document.querySelector('[role="dialog"]')) return;

      if (leaderAt && Date.now() - leaderAt < 1200) {
        leaderAt = 0;
        const path = GO.get(key);
        if (path) {
          event.preventDefault();
          latest.current.onGo(path);
        }
        return;
      }
      if (key === 'g') {
        leaderAt = Date.now();
      } else if (key === 'n') {
        event.preventDefault();
        latest.current.onPrimary();
      } else if (key === '/') {
        event.preventDefault();
        const search = document.querySelector<HTMLInputElement>('.page .search input');
        if (search) search.focus();
        else latest.current.onPalette();
      } else if (key === '[') {
        latest.current.onToggleSidebar();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
