import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface PageCommand {
  /** 'new' opens the page's "add" dialog. */
  command?: 'new';
  /** Text to put in the page's search box. */
  search?: string;
}

/**
 * Lets the command palette hand a page something to do on arrival — open its "add"
 * dialog, or start with a search. The request travels in the router's location state
 * and is cleared once handled, so going back does not repeat it.
 */
export function usePageCommand(handlers: { onNew?: () => void; onSearch?: (text: string) => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    const request = location.state as PageCommand | null;
    if (!request || (!request.command && typeof request.search !== 'string')) return;
    if (request.command === 'new') latest.current.onNew?.();
    if (typeof request.search === 'string') latest.current.onSearch?.(request.search);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);
}
