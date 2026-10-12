import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CalendarCheck, ChevronDown, LogOut, RotateCcw, Search } from 'lucide-react';
import { Brand } from './Sidebar';
import { useShell } from './shell';
import ActionMenu from '../ui/ActionMenu';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';
import { Avatar } from '../ui/bits';
import { useToast } from '../ui/useToast';
import { useAuth } from '../../store/useAuth';
import { useSalon } from '../../store/useSalon';
import { formatTime, greeting, todayISO } from '../../lib/format';
import { bookingLabel } from '../../lib/services';
import type { Appointment } from '../../types';

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

/** Today's bookings that still need attention. */
function UpcomingPanel({ open, onClose, upcoming }: { open: boolean; onClose: () => void; upcoming: Appointment[] }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Today's schedule"
      subtitle={upcoming.length ? `${upcoming.length} pending appointment${upcoming.length === 1 ? '' : 's'}` : 'Nothing pending'}
      icon={
        <span className="modal__badge">
          <CalendarCheck size={18} />
        </span>
      }
      footer={
        <Link to="/admin/appointments" className="btn btn--primary btn--block" onClick={onClose}>
          Open appointments
        </Link>
      }
    >
      {upcoming.length ? (
        <ul className="agenda">
          {upcoming.map((a) => (
            <li key={a.id} className="agenda__item">
              <span className="agenda__time">{formatTime(a.time)}</span>
              <span className="agenda__body">
                <strong>{a.name}</strong>
                <span>{bookingLabel(a)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="confirm__message">Every appointment for today has been completed or cancelled.</p>
      )}
    </Modal>
  );
}

/**
 * Minimal top bar: a time-of-day greeting, search (which opens the command palette),
 * the current page's one primary action, today's schedule and the profile menu.
 * `primarySlotRef` receives the element pages render their primary action into.
 */
export default function TopBar({ primarySlotRef }: { primarySlotRef: (element: HTMLElement | null) => void }) {
  const { appointments, actions } = useSalon();
  const { user, signOut } = useAuth();
  const { openPalette } = useShell();
  const toast = useToast();
  const [panelOpen, setPanelOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const upcoming = useMemo(() => {
    const today = todayISO();
    return appointments.filter((a) => a.date === today && a.status === 'Pending').sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments]);

  if (!user) return null;
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <Brand compact />
      </div>
      <div className="topbar__hello">
        <p className="topbar__greeting">
          {greeting()}, {user.name.split(' ')[0]}
        </p>
        <p className="topbar__date">{dateLabel}</p>
      </div>

      <div className="topbar__actions">
        <button type="button" className="topbar__search" onClick={openPalette} aria-label="Search or jump to a page" aria-keyshortcuts="Control+K Meta+K">
          <Search size={16} strokeWidth={1.8} aria-hidden="true" />
          <span>Search or jump to…</span>
          <kbd className="kbd">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>

        <div className="topbar__primary" ref={primarySlotRef} />

        <button
          type="button"
          className="icon-button icon-button--surface"
          aria-label={`Today's schedule, ${upcoming.length} pending`}
          onClick={() => setPanelOpen(true)}
        >
          <Bell size={18} strokeWidth={1.7} />
          {upcoming.length > 0 && <span className="icon-button__dot" />}
        </button>

        <ActionMenu
          className="user-chip"
          title={user.name}
          aria-label={`Account menu for ${user.name}`}
          items={[
            {
              key: 'reset',
              label: 'Reset sample data',
              description: 'Restore the starter dataset',
              icon: RotateCcw,
              onSelect: () => setConfirmReset(true),
            },
            { key: 'sign-out', label: 'Sign out', icon: LogOut, onSelect: signOut },
          ]}
        >
          <Avatar name={user.name} />
          <span className="user-chip__text">
            <strong>{user.name}</strong>
            <span>Administrator</span>
          </span>
          <ChevronDown size={15} className="user-chip__chevron" />
        </ActionMenu>
      </div>

      <UpcomingPanel open={panelOpen} onClose={() => setPanelOpen(false)} upcoming={upcoming} />
      <ConfirmDialog
        open={confirmReset}
        title="Reset sample data?"
        message="Everything you have added or changed will be replaced with the starter dataset. This cannot be undone."
        confirmLabel="Reset data"
        icon={<RotateCcw size={18} />}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          actions.resetDemoData();
          setConfirmReset(false);
          toast({ title: 'Sample data restored', tone: 'info' });
        }}
      />
    </header>
  );
}
