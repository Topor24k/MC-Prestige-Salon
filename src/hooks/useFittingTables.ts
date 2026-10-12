import { useEffect, type RefObject } from 'react';

/**
 * Marks each table wrapper inside `container` with `data-fits` when its table fits without
 * sideways scrolling. Those tables can let their header stick under the top bar as the page
 * scrolls; wider ones keep their own horizontal scroll instead (a sticky header cannot
 * escape a scrolling box). Re-checked when the layout or the page's content changes.
 */
export function useFittingTables(container: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = container.current;
    if (!root) return undefined;

    let timer = 0;
    const measure = () => {
      root.querySelectorAll<HTMLElement>('.table-wrap').forEach((wrap) => {
        const fits = wrap.scrollWidth <= wrap.clientWidth + 1;
        if (fits !== wrap.hasAttribute('data-fits')) wrap.toggleAttribute('data-fits', fits);
      });
    };
    // At most one check per 150ms, however often the page changes underneath (figures count up frame by frame).
    const schedule = () => {
      if (timer) return;
      timer = window.setTimeout(() => {
        timer = 0;
        measure();
      }, 150);
    };

    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    const mutation = new MutationObserver(schedule);
    mutation.observe(root, { childList: true, subtree: true });
    schedule();

    return () => {
      window.clearTimeout(timer);
      resize.disconnect();
      mutation.disconnect();
    };
  }, [container]);
}
