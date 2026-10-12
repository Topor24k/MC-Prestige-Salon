import { useMemo, useState } from 'react';
import {
  Ban,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarX,
  Check,
  CircleCheck,
  Download,
  Ellipsis,
  Hourglass,
  Plus,
  Trash2,
} from 'lucide-react';
import { AddAppointmentModal, RescheduleModal } from './AppointmentForms';
import ActionMenu from '../../components/ui/ActionMenu';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import PeriodFilter from '../../components/ui/PeriodFilter';
import StatCard from '../../components/ui/StatCard';
import { Avatar, Chips, EmptyState, PageHeader, Pagination, SearchInput, StatusBadge } from '../../components/ui/bits';
import { useToast } from '../../components/ui/useToast';
import { useSalon } from '../../store/useSalon';
import { APPOINTMENT_STATUSES } from '../../data/catalog';
import { downloadFile, toCSV } from '../../lib/csv';
import { displayCustomerId, formatDate, formatDateShort, formatPeso, formatTime, prettyLink, toExternalUrl, todayISO } from '../../lib/format';
import { bookingLabel } from '../../lib/services';
import { getPeriodRange, inPeriod, inPeriodToDate, inPreviousPeriod, monthsFromDates, percentChange } from '../../lib/period';
import { useIsMobile, usePagination } from '../../hooks/useMediaQuery';
import { usePageCommand } from '../../hooks/usePageCommand';

const STATUS_ICONS = { Pending: Hourglass, Completed: Check, Cancelled: Ban };

export function FacebookLink({ value }) {
  const href = toExternalUrl(value);
  if (!value) return <span className="muted">—</span>;
  if (!href) return <span className="truncate">{value}</span>;
  return (
    <a className="link truncate" href={href} target="_blank" rel="noopener noreferrer" title={value}>
      {prettyLink(value)}
    </a>
  );
}

/** Pop-up list behind the "Today's Appointments" and "Completed" KPI cards. */
function AppointmentListModal({ open, onClose, title, subtitle, rows, showDate, emptyText }) {
  const isMobile = useIsMobile();
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={title}
      subtitle={subtitle}
      icon={
        <span className="modal__badge">
          <CalendarCheck size={18} />
        </span>
      }
      aside={
        <div className="modal__count">
          <strong>{rows.length}</strong>
          <span>Total</span>
        </div>
      }
      footer={
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      {!rows.length ? (
        <EmptyState icon={CalendarX} title="No records found" description={emptyText} />
      ) : isMobile ? (
        <ul className="list">
          {rows.map((a) => (
            <li key={a.id} className="list__item">
              <Avatar name={a.name} />
              <div className="list__body">
                <p className="list__title">{a.name}</p>
                <p className="list__meta">
                  {bookingLabel(a)} · {a.phone}
                </p>
              </div>
              <div className="list__trail">
                <strong>{formatTime(a.time)}</strong>
                <span>{showDate ? formatDateShort(a.date) : displayCustomerId(a.customerId)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="table-wrap table-wrap--inset">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Customer ID</th>
                <th scope="col">Customer Name</th>
                <th scope="col">Phone</th>
                <th scope="col">Facebook</th>
                <th scope="col">Service</th>
                {showDate && <th scope="col">Date</th>}
                <th scope="col">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{displayCustomerId(a.customerId)}</td>
                  <td className="strong">{a.name}</td>
                  <td className="tabular">{a.phone}</td>
                  <td className="cell-link">
                    <FacebookLink value={a.facebook} />
                  </td>
                  <td className="cell-wrap">{bookingLabel(a)}</td>
                  {showDate && <td className="nowrap">{formatDate(a.date)}</td>}
                  <td className="tabular">{formatTime(a.time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

export default function Appointments() {
  const { appointments, actions } = useSalon();
  const toast = useToast();
  const isMobile = useIsMobile();

  const [period, setPeriod] = useState('this-month');
  const [query, setQuery] = useState('');
  usePageCommand({ onNew: () => setAdding(true), onSearch: setQuery });
  const [status, setStatus] = useState('All');
  const [adding, setAdding] = useState(false);
  const [panel, setPanel] = useState(null);
  const [rescheduling, setRescheduling] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const today = todayISO();
  const range = useMemo(() => getPeriodRange(period), [period]);
  const months = useMemo(() => monthsFromDates(appointments.map((a) => a.date)), [appointments]);

  const scoped = useMemo(() => appointments.filter((a) => inPeriod(a.date, range)), [appointments, range]);
  // Pace against the previous period, counted up to the matching day.
  const paceChange = useMemo(() => {
    const current = appointments.filter((a) => inPeriodToDate(a.date, range)).length;
    const previous = appointments.filter((a) => inPreviousPeriod(a.date, range)).length;
    return percentChange(current, previous);
  }, [appointments, range]);
  const todays = useMemo(
    () => appointments.filter((a) => a.date === today).sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, today],
  );
  const completed = useMemo(
    () =>
      scoped
        .filter((a) => a.status === 'Completed')
        .sort((a, b) => (a.date === b.date ? b.time.localeCompare(a.time) : b.date.localeCompare(a.date))),
    [scoped],
  );

  const counts = useMemo(() => {
    const tally = { All: scoped.length, Pending: 0, Completed: 0, Cancelled: 0 };
    scoped.forEach((a) => {
      tally[a.status] += 1;
    });
    return tally;
  }, [scoped]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return scoped
      .filter((a) => status === 'All' || a.status === status)
      .filter(
        (a) =>
          !needle ||
          [a.name, bookingLabel(a), a.phone, a.customerId, a.status, a.facebook].some((field) =>
            String(field).toLowerCase().includes(needle),
          ),
      )
      .sort((a, b) => (a.date === b.date ? b.time.localeCompare(a.time) : b.date.localeCompare(a.date)));
  }, [scoped, status, query]);

  const paging = usePagination(visible, isMobile ? 8 : 10);
  const todaysPending = todays.filter((a) => a.status === 'Pending').length;
  const completionRate = scoped.length ? Math.round((completed.length / scoped.length) * 100) : 0;

  const setAppointmentStatus = (appointment, next) => {
    if (appointment.status === next) return;
    actions.updateAppointment(appointment.id, { status: next });
    toast({ title: `Marked as ${next}`, description: `${appointment.name} · ${bookingLabel(appointment)}` });
  };

  const exportCSV = () => {
    if (!scoped.length) {
      toast({ title: 'Nothing to export', description: 'There are no appointments in this period.', tone: 'info' });
      return;
    }
    const rows = [...scoped]
      .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)))
      .map((a) => ({
        ...a,
        customerId: displayCustomerId(a.customerId),
        time: formatTime(a.time),
        hairLength: a.hairLength || '',
        addOns: (a.addOns || []).join('; '),
        price: Number.isFinite(a.price) ? a.price : '',
      }));
    const csv = toCSV(rows, [
      { key: 'customerId', label: 'Customer ID' },
      { key: 'name', label: 'Customer Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'facebook', label: 'Facebook' },
      { key: 'service', label: 'Service' },
      { key: 'hairLength', label: 'Hair Length' },
      { key: 'addOns', label: 'Add-ons' },
      { key: 'price', label: 'Price' },
      { key: 'date', label: 'Date' },
      { key: 'time', label: 'Time' },
      { key: 'status', label: 'Status' },
    ]);
    downloadFile(`appointments-${range.caption.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`, csv);
    toast({ title: 'Export ready', description: `${rows.length} appointments · ${range.caption}` });
  };

  const menuFor = (a) => [
    ...APPOINTMENT_STATUSES.map((s) => ({
      key: s,
      label: `Mark as ${s}`,
      icon: STATUS_ICONS[s],
      checked: a.status === s,
      onSelect: () => setAppointmentStatus(a, s),
    })),
    { key: 'reschedule', label: 'Reschedule', icon: CalendarClock, separated: true, onSelect: () => setRescheduling(a) },
    { key: 'delete', label: 'Delete', icon: Trash2, tone: 'danger', onSelect: () => setDeleting(a) },
  ];

  const emptyState = (
    <EmptyState
      icon={CalendarX}
      title="No records found"
      description={
        query || status !== 'All'
          ? 'No appointments match your search or filter.'
          : `There are no appointments for ${range.caption}.`
      }
      action={
        query || status !== 'All' ? (
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => {
              setQuery('');
              setStatus('All');
            }}
          >
            Clear filters
          </button>
        ) : null
      }
    />
  );

  return (
    <>
      <PageHeader
        eyebrow="Appointment & Booking"
        title="Appointments"
        accent="overview"
        subtitle={range.caption}
        primary={{ label: 'New appointment', icon: Plus, onClick: () => setAdding(true) }}
        menuItems={[{ key: 'export', label: 'Export appointments', description: range.caption, icon: Download, onSelect: exportCSV }]}
        menuIcon={<Ellipsis size={18} />}
      />

      {isMobile && <PeriodFilter value={period} onChange={setPeriod} months={months} label={range.label} />}

      <section className="stats stats--three" aria-label="Appointment summary">
        <StatCard
          tone="dark"
          label="Total Appointments"
          value={scoped.length}
          delta={paceChange}
          compareLabel={range.compareLabel}
          caption={range.caption}
          icon={CalendarDays}
        />
        <StatCard
          label="Today’s Appointments"
          value={todays.length}
          caption={todaysPending ? `${todaysPending} still pending` : 'All caught up'}
          icon={CalendarCheck}
          onClick={() => setPanel('today')}
        />
        <StatCard
          label="Completed"
          value={completed.length}
          caption={`${completionRate}% of bookings`}
          icon={CircleCheck}
          onClick={() => setPanel('completed')}
        />
      </section>

      <section className="card">
        <header className="card__header card__header--toolbar">
          <div>
            <h2 className="card__title">Recent Appointments</h2>
            <p className="card__subtitle">
              {visible.length} {visible.length === 1 ? 'record' : 'records'} · {range.caption}
            </p>
          </div>
          <div className="toolbar">
            <SearchInput value={query} onChange={setQuery} placeholder="Search name, service, phone…" label="Search appointments" />
            {!isMobile && (
              <>
                <PeriodFilter value={period} onChange={setPeriod} months={months} label={range.label} />
                <button type="button" className="btn btn--secondary btn--sm" onClick={exportCSV}>
                  <Download size={15} /> Export
                </button>
              </>
            )}
          </div>
        </header>

        <Chips
          label="Filter by status"
          value={status}
          onChange={setStatus}
          options={['All', ...APPOINTMENT_STATUSES].map((s) => ({ value: s, label: s, count: counts[s] }))}
        />

        {!visible.length ? (
          emptyState
        ) : isMobile ? (
          <ul className="list">
            {paging.pageItems.map((a) => (
              <li key={a.id} className="list__item">
                <Avatar name={a.name} />
                <div className="list__body">
                  <p className="list__title">{a.name}</p>
                  <p className="list__meta">
                    {bookingLabel(a)} · {formatDateShort(a.date)}, {formatTime(a.time)}
                  </p>
                  <StatusBadge status={a.status} />
                </div>
                <ActionMenu items={menuFor(a)} title={a.name} className="icon-button icon-button--quiet" aria-label={`Actions for ${a.name}`}>
                  <Ellipsis size={18} />
                </ActionMenu>
              </li>
            ))}
          </ul>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Customer ID</th>
                  <th scope="col">Customer Name</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Facebook</th>
                  <th scope="col">Service</th>
                  <th scope="col">Date</th>
                  <th scope="col">Time</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="is-action">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paging.pageItems.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">{displayCustomerId(a.customerId)}</td>
                    <td>
                      <span className="cell-person">
                        <Avatar name={a.name} size="sm" />
                        <span>
                          <span className="strong">{a.name}</span>
                        </span>
                      </span>
                    </td>
                    <td className="tabular">{a.phone}</td>
                    <td className="cell-link">
                      <FacebookLink value={a.facebook} />
                    </td>
                    <td className="cell-wrap">
                      {bookingLabel(a)}
                      {Number.isFinite(a.price) && <span className="cell-sub">{formatPeso(a.price, { whole: true })}</span>}
                    </td>
                    <td className="nowrap">{formatDate(a.date)}</td>
                    <td className="tabular">{formatTime(a.time)}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="is-action">
                      <ActionMenu items={menuFor(a)} title={a.name} className="btn btn--ghost btn--sm" aria-label={`Actions for ${a.name}`}>
                        Actions <Ellipsis size={15} />
                      </ActionMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination {...paging} onChange={paging.setPage} noun="appointments" />
      </section>


      <AddAppointmentModal open={adding} onClose={() => setAdding(false)} />
      <RescheduleModal appointment={rescheduling} onClose={() => setRescheduling(null)} />

      <AppointmentListModal
        open={panel === 'today'}
        onClose={() => setPanel(null)}
        title="Today’s Appointments"
        subtitle={formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}
        rows={todays}
        emptyText="No appointments are scheduled for today."
      />
      <AppointmentListModal
        open={panel === 'completed'}
        onClose={() => setPanel(null)}
        title="Completed Appointments"
        subtitle={range.caption}
        rows={completed}
        showDate
        emptyText={`No appointments were completed in ${range.caption}.`}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete appointment?"
        message={
          deleting
            ? `${deleting.name}’s ${deleting.service} appointment on ${formatDate(deleting.date)} will be permanently removed.`
            : ''
        }
        detail="This action cannot be undone."
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          actions.deleteAppointment(deleting.id);
          toast({ title: 'Appointment deleted', description: `${deleting.name} · ${deleting.service}`, tone: 'info' });
          setDeleting(null);
        }}
      />
    </>
  );
}
