import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

export function useMediaQuery(query) {
  const subscribe = useCallback(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

/** Phone / small-tablet layout: bottom tab bar, card lists and bottom sheets. */
export const MOBILE_QUERY = '(max-width: 860px)';
export const useIsMobile = () => useMediaQuery(MOBILE_QUERY);
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

/** Tracks an element's content width. */
export function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    setWidth(Math.round(element.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** Client-side paging that snaps back to page 1 when the list changes shape. */
export function usePagination(items, pageSize) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    pageCount,
    setPage,
    pageItems: items.slice(start, start + pageSize),
    from: items.length ? start + 1 : 0,
    to: Math.min(start + pageSize, items.length),
    total: items.length,
  };
}
