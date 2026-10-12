import { useMemo, useState } from 'react';
import { BadgeCheck, Download, Ellipsis, Eye, Footprints, History, Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { CustomerFormModal, CustomerProfileModal } from './CustomerModals';
import { FacebookLink } from '../appointments/Appointments';
import ActionMenu from '../../components/ui/ActionMenu';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatCard from '../../components/ui/StatCard';
import { Avatar, Chips, EmptyState, PageHeader, Pagination, SearchInput, Segmented } from '../../components/ui/bits';
import { usePageCommand } from '../../hooks/usePageCommand';
import { useToast } from '../../components/ui/useToast';
import { useSalon } from '../../store/useSalon';
import { downloadFile, toCSV } from '../../lib/csv';
import { displayCustomerId, formatDate, formatDateShort, formatPeso, formatTime, todayISO } from '../../lib/format';
import { bookingLabel, bookingValue } from '../../lib/services';
import { useIsMobile, usePagination } from '../../hooks/useMediaQuery';

function ServiceTags({ services }) {
  if (!services.length) return <span className="muted">—</span>;
  return (
    <span className="tags">
      {services.slice(0, 2).map((name) => (
        <span key={name} className="tag">
          {name}
        </span>
      ))}
      {services.length > 2 && <span className="tag tag--more">+{services.length - 2}</span>}
    </span>
  );
}

const TypeBadge = ({ walkIn }) => (
  <span className={`badge badge--${walkIn ? 'pending' : 'neutral'}`}>
    {walkIn ? <Footprints size={11} strokeWidth={2.4} /> : <BadgeCheck size={11} strokeWidth={2.4} />}
    {walkIn ? 'Walk-in' : 'Registered'}
  </span>
);

/** Service History: every completed visit linked to its customer, with frequency analysis. */
function ServiceHistory({ query }) {
  const { appointments, services } = useSalon();
  const toast = useToast();
  const isMobile = useIsMobile();

  const { records, frequentByCustomer, topService } = useMemo(() => {
    const catalog = new Map(services.map((s) => [s.name.toLowerCase(), s]));
    const done = appointments
      .filter((a) => a.status === 'Completed')
      .map((a) => {
        const entry = catalog.get(a.service.toLowerCase());
        return { ...a, label: bookingLabel(a), category: entry?.category || 'Other', amount: bookingValue(a, services) };
      })
      .sort((a, b) => (a.date === b.date ? b.time.localeCompare(a.time) : b.date.localeCompare(a.date)));

    const perCustomer = new Map();
    const perService = new Map();
    done.forEach((a) => {
      const counts = perCustomer.get(a.customerId) || new Map();
      counts.set(a.service, (counts.get(a.service) || 0) + 1);
      perCustomer.set(a.customerId, counts);
      perService.set(a.service, (perService.get(a.service) || 0) + 1);
    });
    const frequent = new Map();
    perCustomer.forEach((counts, id) => frequent.set(id, [...counts.entries()].sort((x, y) => y[1] - x[1])[0][0]));
    const top = [...perService.entries()].sort((x, y) => y[1] - x[1])[0];
    return { records: done, frequentByCustomer: frequent, topService: top ? { name: top[0], count: top[1] } : null };
  }, [appointments, services]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return records;
    return records.filter((a) => [a.name, a.label, a.customerId, a.category].some((f) => String(f).toLowerCase().includes(needle)));
  }, [records, query]);

  const paging = usePagination(visible, isMobile ? 8 : 10);

  const exportReport = () => {
    if (!visible.length) {
      toast({ title: 'Nothing to export', description: 'There are no service records to include.', tone: 'info' });
      return;
    }
    const csv = toCSV(
      visible.map((a) => ({
        ...a,
        customerId: displayCustomerId(a.customerId),
        time: formatTime(a.time),
        frequent: frequentByCustomer.get(a.customerId) || '',
      })),
      [
        { key: 'date', label: 'Date' },
        { key: 'time', label: 'Time' },
        { key: 'customerId', label: 'Customer ID' },
        { key: 'name', label: 'Customer Name' },
        { key: 'label', label: 'Service' },
        { key: 'category', label: 'Category' },
        { key: 'amount', label: 'Amount' },
        { key: 'frequent', label: 'Customer’s Most Availed Service' },
      ],
    );
    downloadFile(`service-history-report-${todayISO()}.csv`, csv);
    toast({ title: 'Report ready', description: `${visible.length} service records` });
  };

  return (
    <>
      <div className="card__strip">
        <p>
          <strong>{records.length}</strong> completed visits
          {topService && (
            <>
              {' '}
              · most availed: <strong>{topService.name}</strong> ({topService.count})
            </>
          )}
        </p>
        <button type="button" className="btn btn--secondary btn--sm" onClick={exportReport}>
          <Download size={15} /> Service report
        </button>
      </div>

      {!visible.length ? (
        <EmptyState
          icon={History}
          title={records.length ? 'No records found' : 'No service history yet'}
          description={records.length ? 'No service records match your search.' : 'Completed appointments will appear here, linked to their customer.'}
        />
      ) : isMobile ? (
        <ul className="list">
          {paging.pageItems.map((a) => (
            <li key={a.id} className="list__item">
              <Avatar name={a.name} />
              <div className="list__body">
                <p className="list__title">{a.name}</p>
                <p className="list__meta">
                  {a.label}
                </p>
              </div>
              <div className="list__trail">
                <strong>{formatPeso(a.amount, { whole: true })}</strong>
                <span>{formatDateShort(a.date)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Customer ID</th>
                <th scope="col">Customer Name</th>
                <th scope="col">Service</th>
                <th scope="col">Category</th>
                <th scope="col">Most Availed</th>
                <th scope="col" className="is-numeric">Amount</th>
              </tr>
            </thead>
            <tbody>
              {paging.pageItems.map((a) => (
                <tr key={a.id}>
                  <td className="nowrap">{formatDate(a.date)}</td>
                  <td className="mono">{displayCustomerId(a.customerId)}</td>
                  <td className="strong">{a.name}</td>
                  <td>{a.label}</td>
                  <td>{a.category}</td>
                  <td>{frequentByCustomer.get(a.customerId) || '—'}</td>
                  <td className="is-numeric">{formatPeso(a.amount, { whole: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination {...paging} onChange={paging.setPage} noun="service records" />
    </>
  );
}

export default function Customers() {
  const { customers, actions } = useSalon();
  const toast = useToast();
  const isMobile = useIsMobile();

  const [view, setView] = useState('customers');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [form, setForm] = useState({ open: false, customer: null });
  const [viewingId, setViewingId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const viewing = useMemo(() => customers.find((c) => c.id === viewingId) || null, [customers, viewingId]);
  const month = todayISO().slice(0, 7);
  const walkIns = customers.filter((c) => c.walkIn).length;
  const newThisMonth = customers.filter((c) => c.registeredAt.startsWith(month)).length;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customers
      .filter((c) => type === 'All' || (type === 'Walk-in' ? c.walkIn : !c.walkIn))
      .filter(
        (c) =>
          !needle ||
          [c.name, c.phone, c.id, c.facebook, ...c.services].some((field) => String(field).toLowerCase().includes(needle)),
      )
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [customers, type, query]);

  const paging = usePagination(visible, isMobile ? 8 : 10);
  const openAdd = () => setForm({ open: true, customer: null });
  usePageCommand({ onNew: openAdd, onSearch: setQuery });
  const openEdit = (customer) => {
    setViewingId(null);
    setForm({ open: true, customer });
  };

  const promote = (customer) => {
    actions.updateCustomer(customer.id, { walkIn: false });
    toast({ title: 'Registered as a full customer', description: `${customer.name} · ${displayCustomerId(customer.id)}` });
  };

  const menuFor = (c) => [
    { key: 'view', label: 'View profile & history', icon: Eye, onSelect: () => setViewingId(c.id) },
    { key: 'edit', label: 'Edit', icon: Pencil, onSelect: () => openEdit(c) },
    ...(c.walkIn ? [{ key: 'promote', label: 'Register as customer', icon: BadgeCheck, onSelect: () => promote(c) }] : []),
    { key: 'delete', label: 'Delete', icon: Trash2, tone: 'danger', separated: true, onSelect: () => setDeleting(c) },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Customer & Service Management"
        title="Customers"
        accent="& history"
        subtitle={`${customers.length} profiles on record`}
        primary={{ label: 'New customer', icon: Plus, onClick: openAdd }}
      />

      <section className="stats stats--three" aria-label="Customer summary">
        <StatCard tone="dark" label="Total Customers" value={customers.length} caption="Registered and walk-in" icon={Users} />
        <StatCard label="New This Month" value={newThisMonth} caption={formatDate(`${month}-01`, { month: 'long', year: 'numeric' })} icon={UserPlus} />
        <StatCard label="Walk-ins" value={walkIns} caption="Not yet fully registered" icon={Footprints} />
      </section>

      <section className="card">
        <header className="card__header card__header--toolbar">
          <Segmented
            label="Customer records view"
            value={view}
            onChange={setView}
            options={[
              { value: 'customers', label: 'Customers', icon: Users },
              { value: 'history', label: 'Service History', icon: History },
            ]}
          />
          <div className="toolbar">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={view === 'customers' ? 'Search name or phone…' : 'Search customer or service…'}
              label={view === 'customers' ? 'Search customers' : 'Search service history'}
            />
          </div>
        </header>

        {view === 'history' ? (
          <ServiceHistory query={query} />
        ) : (
          <>
            <Chips
              label="Filter by customer type"
              value={type}
              onChange={setType}
              options={[
                { value: 'All', label: 'All', count: customers.length },
                { value: 'Registered', label: 'Registered', count: customers.length - walkIns },
                { value: 'Walk-in', label: 'Walk-in', count: walkIns },
              ]}
            />

            {!visible.length ? (
              <EmptyState
                icon={Users}
                title="No records found"
                description={query || type !== 'All' ? 'No customers match your search or filter.' : 'Add your first customer to get started.'}
              />
            ) : isMobile ? (
              <ul className="list">
                {paging.pageItems.map((c) => (
                  <li key={c.id} className="list__item">
                    <button type="button" className="list__tap" onClick={() => setViewingId(c.id)} aria-label={`View ${c.name}`}>
                      <Avatar name={c.name} />
                      <span className="list__body">
                        <span className="list__title">{c.name}</span>
                        <span className="list__meta">
                          {displayCustomerId(c.id)} · {c.phone}
                        </span>
                        <TypeBadge walkIn={c.walkIn} />
                      </span>
                    </button>
                    <ActionMenu items={menuFor(c)} title={c.name} className="icon-button icon-button--quiet" aria-label={`Actions for ${c.name}`}>
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
                      <th scope="col">Services</th>
                      <th scope="col">Type</th>
                      <th scope="col">Registered</th>
                      <th scope="col" className="is-action">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paging.pageItems.map((c) => (
                      <tr key={c.id}>
                        <td className="mono">{displayCustomerId(c.id)}</td>
                        <td>
                          <button type="button" className="cell-person cell-person--button" onClick={() => setViewingId(c.id)}>
                            <Avatar name={c.name} size="sm" />
                            <span className="strong">{c.name}</span>
                          </button>
                        </td>
                        <td className="tabular">{c.phone}</td>
                        <td className="cell-link">
                          <FacebookLink value={c.facebook} />
                        </td>
                        <td>
                          <ServiceTags services={c.services} />
                        </td>
                        <td>
                          <TypeBadge walkIn={c.walkIn} />
                        </td>
                        <td className="nowrap">{formatDate(c.registeredAt)}</td>
                        <td className="is-action">
                          <ActionMenu items={menuFor(c)} title={c.name} className="btn btn--ghost btn--sm" aria-label={`Actions for ${c.name}`}>
                            Actions <Ellipsis size={15} />
                          </ActionMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination {...paging} onChange={paging.setPage} noun="customers" />
          </>
        )}
      </section>


      <CustomerFormModal open={form.open} customer={form.customer} onClose={() => setForm((f) => ({ ...f, open: false }))} />
      <CustomerProfileModal customer={viewing} onClose={() => setViewingId(null)} onEdit={openEdit} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete customer?"
        message={deleting ? `${deleting.name} (${displayCustomerId(deleting.id)}) will be permanently removed from your customer records.` : ''}
        detail="This action cannot be undone. Past appointments stay in the appointments list."
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          actions.deleteCustomer(deleting.id);
          toast({ title: 'Customer deleted', description: deleting.name, tone: 'info' });
          setDeleting(null);
        }}
      />
    </>
  );
}
