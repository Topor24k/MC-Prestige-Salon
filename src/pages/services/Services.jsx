import { useMemo, useState } from 'react';
import { CircleDollarSign, Ellipsis, Hand, Pencil, Plus, Power, Ruler, Scissors, Sparkles, Trash2 } from 'lucide-react';
import ActionMenu from '../../components/ui/ActionMenu';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import StatCard from '../../components/ui/StatCard';
import { Chips, EmptyState, Field, PageHeader, Pagination, SearchInput, Segmented, StatusBadge, Switch } from '../../components/ui/bits';
import { usePageCommand } from '../../hooks/usePageCommand';
import { useToast } from '../../components/ui/useToast';
import { useSalon } from '../../store/useSalon';
import { GROUP_CATEGORY, HAIR_LENGTHS, SALON, SERVICE_GROUPS } from '../../data/catalog';
import { formatDuration, formatPeso, parseAmount } from '../../lib/format';
import { isLengthPriced, priceLabel } from '../../lib/services';
import { useIsMobile, usePagination } from '../../hooks/useMediaQuery';

const CATEGORY_ICONS = { Hair: Scissors, Nails: Hand, Other: Sparkles };
const LENGTH_KEYS = ['short', 'medium', 'long'];
const amountOnly = (value) => value.replace(/[^0-9.]/g, '');

function ServiceForm({ formId, service, onDone }) {
  const { services, actions } = useSalon();
  const toast = useToast();
  const [values, setValues] = useState({
    name: service?.name || '',
    group: service?.group || '',
    pricing: service?.pricing || 'fixed',
    price: service && !isLengthPriced(service) ? String(service.price) : '',
    short: service?.prices ? String(service.prices.short) : '',
    medium: service?.prices ? String(service.prices.medium) : '',
    long: service?.prices ? String(service.prices.long) : '',
    duration: service ? String(service.duration) : '',
    active: service ? service.status === 'Active' : true,
  });
  const [submitted, setSubmitted] = useState(false);
  const set = (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.value }));
  const setAmount = (key) => (event) => setValues((v) => ({ ...v, [key]: amountOnly(event.target.value) }));

  const byLength = values.pricing === 'length';
  const isAddOn = values.group === 'Add-ons';
  const name = values.name.trim();
  const duration = Number.parseInt(values.duration, 10);
  const prices = { short: parseAmount(values.short), medium: parseAmount(values.medium), long: parseAmount(values.long) };

  const errors = {};
  if (!name) errors.name = 'Enter the service name.';
  else if (services.some((s) => s.id !== service?.id && s.name.toLowerCase() === name.toLowerCase())) errors.name = 'A service with this name already exists.';
  if (!values.group) errors.group = 'Choose a menu section.';
  if (byLength) {
    LENGTH_KEYS.forEach((key) => {
      if (!(prices[key] > 0)) errors[key] = 'Enter a price.';
    });
  } else if (!(parseAmount(values.price) > 0)) errors.price = 'Enter a price greater than zero.';
  // Add-ons ride along with another service, so they may take no extra time.
  if (!(duration > 0) && !(isAddOn && duration === 0)) errors.duration = 'Enter the duration in minutes.';
  const show = (key) => (submitted ? errors[key] : undefined);

  const onSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const payload = {
      name,
      group: values.group,
      category: GROUP_CATEGORY[values.group],
      pricing: byLength ? 'length' : 'fixed',
      price: byLength ? prices.short : parseAmount(values.price),
      prices: byLength ? prices : null,
      duration,
      status: values.active ? 'Active' : 'Inactive',
    };
    if (service) actions.updateService(service.id, payload);
    else actions.addService(payload);
    toast({ title: service ? 'Service updated' : 'Service saved', description: `${name} · ${priceLabel(payload)}` });
    onDone();
  };

  return (
    <form id={formId} className="form-grid" onSubmit={onSubmit} noValidate>
      <Field label="Service Name" error={show('name')} className="form-grid__wide">
        {(props) => <input {...props} className="input" value={values.name} onChange={set('name')} placeholder="e.g. Keratin Treatment" autoComplete="off" />}
      </Field>
      <Field label="Category" error={show('group')} hint="The section it appears under on the menu">
        {(props) => (
          <select {...props} className="input input--select" value={values.group} onChange={set('group')}>
            <option value="">Select a section</option>
            {SERVICE_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Duration" error={show('duration')} hint="In minutes">
        {(props) => (
          <input {...props} className="input" inputMode="numeric" value={values.duration} onChange={(e) => setValues((v) => ({ ...v, duration: e.target.value.replace(/\D/g, '') }))} placeholder="60" />
        )}
      </Field>

      <div className="field form-grid__wide">
        <span className="field__label">Price</span>
        <Segmented
          label="Pricing"
          value={values.pricing}
          onChange={(pricing) => setValues((v) => ({ ...v, pricing }))}
          options={[
            { value: 'fixed', label: 'One price', icon: CircleDollarSign },
            { value: 'length', label: 'By hair length', icon: Ruler },
          ]}
        />
      </div>

      {byLength ? (
        <div className="form-grid__wide price-grid">
          {HAIR_LENGTHS.map((length, i) => (
            <Field key={length} label={length} error={show(LENGTH_KEYS[i])}>
              {(props) => (
                <span className="input-affix">
                  <span aria-hidden="true">₱</span>
                  <input {...props} className="input" inputMode="decimal" value={values[LENGTH_KEYS[i]]} onChange={setAmount(LENGTH_KEYS[i])} placeholder="0" />
                </span>
              )}
            </Field>
          ))}
        </div>
      ) : (
        <Field label="Amount" error={show('price')} className="form-grid__wide">
          {(props) => (
            <span className="input-affix">
              <span aria-hidden="true">₱</span>
              <input {...props} className="input" inputMode="decimal" value={values.price} onChange={setAmount('price')} placeholder="0.00" />
            </span>
          )}
        </Field>
      )}

      <div className="toggle-row form-grid__wide">
        <span className="toggle-row__icon">
          <Power size={17} />
        </span>
        <div>
          <p className="toggle-row__title">Available for booking</p>
          <p className="toggle-row__hint">Inactive services stay in the catalog but are hidden from customers and new appointments.</p>
        </div>
        <Switch checked={values.active} onChange={(active) => setValues((v) => ({ ...v, active }))} label="Available for booking" />
      </div>
    </form>
  );
}

function ServiceFormModal({ open, service, onClose }) {
  const formId = 'service-form';
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={service ? 'Edit Service' : 'Add New Service'}
      subtitle="Name, category, price and duration."
      icon={
        <span className="modal__badge">
          <Scissors size={18} />
        </span>
      }
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn btn--primary">
            {service ? 'Save' : 'Save Service'}
          </button>
        </>
      }
    >
      <ServiceForm key={service?.id || 'new'} formId={formId} service={service} onDone={onClose} />
    </Modal>
  );
}

/** Short / Medium / Long prices side by side, or the single flat price. */
function PriceCell({ service }) {
  if (!isLengthPriced(service)) return <span className="strong tabular">{formatPeso(service.price, { whole: true })}</span>;
  return (
    <span className="price-trio">
      {LENGTH_KEYS.map((key, i) => (
        <span key={key}>
          <small>{HAIR_LENGTHS[i][0]}</small>
          {formatPeso(service.prices[key], { whole: true })}
        </span>
      ))}
    </span>
  );
}

export default function Services() {
  const { services, actions } = useSalon();
  const toast = useToast();
  const isMobile = useIsMobile();

  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('All');
  const [form, setForm] = useState({ open: false, service: null });
  const [deleting, setDeleting] = useState(null);

  const counts = useMemo(() => {
    const tally = { All: services.length };
    services.forEach((s) => {
      tally[s.group] = (tally[s.group] || 0) + 1;
    });
    return tally;
  }, [services]);
  const activeCount = services.filter((s) => s.status === 'Active').length;
  const hairCount = services.filter((s) => s.category === 'Hair').length;
  const nailCount = services.filter((s) => s.category === 'Nails').length;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const order = (s) => SERVICE_GROUPS.indexOf(s.group);
    return services
      .map((s, index) => ({ s, index }))
      .filter(({ s }) => group === 'All' || s.group === group)
      .filter(({ s }) => !needle || s.name.toLowerCase().includes(needle) || s.group.toLowerCase().includes(needle))
      .sort((a, b) => order(a.s) - order(b.s) || a.index - b.index)
      .map(({ s }) => s);
  }, [services, group, query]);

  const paging = usePagination(visible, isMobile ? 10 : 12);
  const openAdd = () => setForm({ open: true, service: null });
  usePageCommand({ onNew: openAdd, onSearch: setQuery });
  const openEdit = (service) => setForm({ open: true, service });
  const toggleStatus = (service) => {
    const status = service.status === 'Active' ? 'Inactive' : 'Active';
    actions.updateService(service.id, { status });
    toast({ title: `${service.name} is now ${status.toLowerCase()}`, tone: 'info' });
  };

  const menuFor = (s) => [
    { key: 'edit', label: 'Edit', icon: Pencil, onSelect: () => openEdit(s) },
    { key: 'toggle', label: s.status === 'Active' ? 'Deactivate' : 'Activate', icon: Power, onSelect: () => toggleStatus(s) },
    { key: 'delete', label: 'Delete', icon: Trash2, tone: 'danger', separated: true, onSelect: () => setDeleting(s) },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Customer & Service Management"
        title="Service"
        accent="catalog"
        subtitle={`${activeCount} of ${services.length} services available for booking`}
        primary={{ label: 'New service', icon: Plus, onClick: openAdd }}
      />

      <section className="stats stats--three" aria-label="Catalog summary">
        <StatCard tone="dark" label="Active Services" value={activeCount} caption={`${services.length - activeCount} inactive`} icon={Sparkles} />
        <StatCard label="Hair" value={hairCount} caption="Services, packages and add-ons" icon={Scissors} />
        <StatCard label="Nails" value={nailCount} caption="Services and bundle promos" icon={Hand} />
      </section>

      <section className="card">
        <header className="card__header card__header--toolbar">
          <div>
            <h2 className="card__title">Services</h2>
            <p className="card__subtitle">
              {visible.length} {visible.length === 1 ? 'service' : 'services'}
              {group !== 'All' ? ` · ${group}` : ''}
            </p>
          </div>
          <div className="toolbar">
            <SearchInput value={query} onChange={setQuery} placeholder="Search services…" label="Search services" />
          </div>
        </header>

        <Chips
          label="Filter by menu section"
          value={group}
          onChange={setGroup}
          options={['All', ...SERVICE_GROUPS.filter((g) => counts[g])].map((g) => ({ value: g, label: g, count: counts[g] || 0 }))}
        />

        {!visible.length ? (
          <EmptyState
            icon={Scissors}
            title="No records found"
            description={query || group !== 'All' ? 'No services match your search or filter.' : 'Add your first service to build the catalog.'}
          />
        ) : isMobile ? (
          <ul className="list">
            {paging.pageItems.map((s) => {
              const Icon = CATEGORY_ICONS[s.category] || Sparkles;
              return (
                <li key={s.id} className={`list__item${s.status === 'Inactive' ? ' is-muted' : ''}`}>
                  <span className="list__glyph">
                    <Icon size={18} strokeWidth={1.7} />
                  </span>
                  <div className="list__body">
                    <p className="list__title list__title--wrap">{s.name}</p>
                    <p className="list__meta">
                      {s.group}
                      {s.duration ? ` · ${formatDuration(s.duration)}` : ''}
                      {s.status === 'Inactive' ? ' · Inactive' : ''}
                    </p>
                    <p className="list__price">{priceLabel(s)}</p>
                  </div>
                  <ActionMenu items={menuFor(s)} title={s.name} className="icon-button icon-button--quiet" aria-label={`Actions for ${s.name}`}>
                    <Ellipsis size={18} />
                  </ActionMenu>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Service Name</th>
                  <th scope="col">Category</th>
                  <th scope="col">Price</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="is-action">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paging.pageItems.map((s) => {
                  const Icon = CATEGORY_ICONS[s.category] || Sparkles;
                  return (
                    <tr key={s.id} className={s.status === 'Inactive' ? 'is-muted' : undefined}>
                      <td className="cell-wrap cell-wrap--wide">
                        <span className="cell-person">
                          <span className="glyph">
                            <Icon size={15} strokeWidth={1.8} />
                          </span>
                          <span className="strong">{s.name}</span>
                        </span>
                      </td>
                      <td className="nowrap">{s.group}</td>
                      <td>
                        <PriceCell service={s} />
                      </td>
                      <td className="nowrap">{s.duration ? formatDuration(s.duration) : '—'}</td>
                      <td>
                        <span className="status-cell">
                          <Switch checked={s.status === 'Active'} onChange={() => toggleStatus(s)} label={`${s.name} available for booking`} />
                          <StatusBadge status={s.status} />
                        </span>
                      </td>
                      <td className="is-action">
                        <div className="row-actions">
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(s)}>
                            <Pencil size={14} /> Edit
                          </button>
                          <button type="button" className="btn btn--ghost btn--sm btn--ghost-danger" onClick={() => setDeleting(s)}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="card__note">S / M / L are prices for short, medium and long hair. {SALON.priceNote}</p>
        <Pagination {...paging} onChange={paging.setPage} noun="services" />
      </section>


      <ServiceFormModal open={form.open} service={form.service} onClose={() => setForm((f) => ({ ...f, open: false }))} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete service?"
        message={deleting ? `${deleting.name} will be permanently removed from the service catalog.` : ''}
        detail="This action cannot be undone. To keep it for your records, deactivate it instead."
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          actions.deleteService(deleting.id);
          toast({ title: 'Service deleted', description: deleting.name, tone: 'info' });
          setDeleting(null);
        }}
      />
    </>
  );
}
