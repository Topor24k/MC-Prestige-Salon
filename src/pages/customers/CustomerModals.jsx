import { useMemo, useState } from 'react';
import { Download, Footprints, Pencil, Phone, StickyNote, UserPlus, UserRound } from 'lucide-react';
import { FacebookLink } from '../appointments/Appointments';
import Modal from '../../components/ui/Modal';
import { Avatar, EmptyState, Field, StatusBadge, Switch } from '../../components/ui/bits';
import { useToast } from '../../components/ui/useToast';
import { useSalon } from '../../store/useSalon';
import { customerHistory } from '../../lib/analytics';
import { downloadFile, toCSV } from '../../lib/csv';
import { displayCustomerId, formatDate, formatPeso, formatTime, isValidPhone } from '../../lib/format';
import { bookingLabel, bookingValue, isBookable } from '../../lib/services';

/* ── Add / edit customer ─────────────────────────────────── */

function CustomerForm({ formId, customer, onDone }) {
  const { services, actions } = useSalon();
  const toast = useToast();
  const [values, setValues] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    facebook: customer?.facebook || '',
    services: customer?.services || [],
    walkIn: customer?.walkIn || false,
    notes: customer?.notes || '',
  });
  const [submitted, setSubmitted] = useState(false);

  // Active catalog entries, plus anything already assigned that has since been retired.
  const options = useMemo(() => {
    const active = services.filter(isBookable).map((s) => s.name);
    return [...new Set([...active, ...values.services])];
  }, [services, values.services]);

  const set = (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.value }));
  const toggleService = (name) =>
    setValues((v) => ({
      ...v,
      services: v.services.includes(name) ? v.services.filter((s) => s !== name) : [...v.services, name],
    }));

  const errors = {};
  if (!values.name.trim()) errors.name = 'Enter the customer’s name.';
  if (!values.phone.trim()) errors.phone = 'Enter a phone number.';
  else if (!isValidPhone(values.phone)) errors.phone = 'Enter a valid phone number, e.g. 0917 123 4567.';
  if (!values.walkIn && !values.facebook.trim()) errors.facebook = 'Add the customer’s Facebook profile link.';
  if (!values.services.length) errors.services = 'Assign at least one service.';
  const show = (key) => (submitted ? errors[key] : undefined);

  const onSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const payload = { ...values, name: values.name.trim(), phone: values.phone.trim(), facebook: values.facebook.trim(), notes: values.notes.trim() };
    if (customer) {
      actions.updateCustomer(customer.id, payload);
      toast({ title: 'Customer updated', description: `${payload.name} · ${displayCustomerId(customer.id)}` });
    } else {
      const created = actions.addCustomer(payload);
      toast({ title: values.walkIn ? 'Walk-in saved' : 'Customer saved', description: `${created.name} · ${displayCustomerId(created.id)}` });
    }
    onDone();
  };

  return (
    <form id={formId} className="form-grid" onSubmit={onSubmit} noValidate>
      <div className="toggle-row form-grid__wide">
        <span className="toggle-row__icon">
          <Footprints size={17} />
        </span>
        <div>
          <p className="toggle-row__title">Walk-in customer</p>
          <p className="toggle-row__hint">Arrived without an appointment. You can register them fully later.</p>
        </div>
        <Switch checked={values.walkIn} onChange={(walkIn) => setValues((v) => ({ ...v, walkIn }))} label="Walk-in customer" />
      </div>

      <Field label="Name" error={show('name')} className="form-grid__wide">
        {(props) => <input {...props} className="input" value={values.name} onChange={set('name')} placeholder="Customer name" autoComplete="off" />}
      </Field>
      <Field label="Phone" error={show('phone')}>
        {(props) => <input {...props} className="input" type="tel" inputMode="tel" value={values.phone} onChange={set('phone')} placeholder="0917 123 4567" autoComplete="off" />}
      </Field>
      <Field label="Facebook" error={show('facebook')} optional={values.walkIn}>
        {(props) => <input {...props} className="input" type="url" inputMode="url" value={values.facebook} onChange={set('facebook')} placeholder="facebook.com/username" autoComplete="off" />}
      </Field>

      <div className={`field form-grid__wide${show('services') ? ' field--error' : ''}`}>
        <span className="field__label" id={`${formId}-services`}>
          Service
        </span>
        <div className="choice-chips" role="group" aria-labelledby={`${formId}-services`}>
          {options.map((name) => (
            <button key={name} type="button" className="chip chip--choice" aria-pressed={values.services.includes(name)} onClick={() => toggleService(name)}>
              {name}
            </button>
          ))}
        </div>
        {show('services') && (
          <p className="field__error" role="alert">
            {errors.services}
          </p>
        )}
      </div>

      <Field label="Notes" optional className="form-grid__wide">
        {(props) => <textarea {...props} className="input input--area" rows={3} value={values.notes} onChange={set('notes')} placeholder="Preferences, allergies, reminders…" />}
      </Field>
    </form>
  );
}

export function CustomerFormModal({ open, customer, onClose }) {
  const formId = 'customer-form';
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'Add New Customer'}
      subtitle={customer ? displayCustomerId(customer.id) : 'A Customer ID is generated when you save.'}
      icon={
        <span className="modal__badge">
          <UserPlus size={18} />
        </span>
      }
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn btn--primary">
            {customer ? 'Save' : 'Save Customer'}
          </button>
        </>
      }
    >
      <CustomerForm key={customer?.id || 'new'} formId={formId} customer={customer} onDone={onClose} />
    </Modal>
  );
}

/* ── Profile + service history ───────────────────────────── */

function Profile({ customer }) {
  const { appointments, services } = useSalon();
  const history = useMemo(() => customerHistory(customer, appointments, services), [customer, appointments, services]);

  return (
    <>
      <div className="profile">
        <Avatar name={customer.name} size="lg" />
        <div>
          <p className="profile__name">{customer.name}</p>
          <p className="profile__meta">
            {displayCustomerId(customer.id)} · {customer.walkIn ? 'Walk-in' : 'Registered'} since {formatDate(customer.registeredAt)}
          </p>
        </div>
      </div>

      <dl className="profile__facts">
        <div>
          <dt>
            <Phone size={14} /> Phone
          </dt>
          <dd className="tabular">{customer.phone}</dd>
        </div>
        <div>
          <dt>
            <UserRound size={14} /> Facebook
          </dt>
          <dd>
            <FacebookLink value={customer.facebook} />
          </dd>
        </div>
        {customer.notes && (
          <div className="profile__note">
            <dt>
              <StickyNote size={14} /> Notes
            </dt>
            <dd>{customer.notes}</dd>
          </div>
        )}
      </dl>

      <div className="mini-stats">
        <div>
          <span>Completed visits</span>
          <strong>{history.visits}</strong>
        </div>
        <div>
          <span>Total spend</span>
          <strong>{formatPeso(history.spend, { whole: true })}</strong>
        </div>
        <div>
          <span>Most availed</span>
          <strong>{history.frequent ? history.frequent.name : '—'}</strong>
        </div>
      </div>

      <h3 className="section-label">Service history</h3>
      {history.records.length ? (
        <ul className="list list--plain">
          {history.records.map((a) => (
            <li key={a.id} className="list__item">
              <div className="list__body">
                <p className="list__title">{bookingLabel(a)}</p>
                <p className="list__meta">
                  {formatDate(a.date)} · {formatTime(a.time)}
                </p>
              </div>
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No service history yet" description="Completed appointments for this customer will appear here." />
      )}
    </>
  );
}

export function CustomerProfileModal({ customer, onClose, onEdit }) {
  const { appointments, services } = useSalon();
  const toast = useToast();

  const exportHistory = () => {
    const { records } = customerHistory(customer, appointments, services);
    if (!records.length) {
      toast({ title: 'Nothing to export', description: 'This customer has no service history yet.', tone: 'info' });
      return;
    }
    const csv = toCSV(
      records.map((a) => ({
        ...a,
        service: bookingLabel(a),
        time: formatTime(a.time),
        price: a.status === 'Completed' ? bookingValue(a, services) : '',
      })),
      [
        { key: 'date', label: 'Date' },
        { key: 'time', label: 'Time' },
        { key: 'service', label: 'Service' },
        { key: 'status', label: 'Status' },
        { key: 'price', label: 'Amount' },
      ],
    );
    downloadFile(`service-history-${customer.id.toLowerCase()}.csv`, csv);
    toast({ title: 'Report ready', description: `${records.length} records · ${customer.name}` });
  };

  return (
    <Modal
      open={Boolean(customer)}
      onClose={onClose}
      title="Customer profile"
      footer={
        customer && (
          <>
            <button type="button" className="btn btn--secondary" onClick={exportHistory}>
              <Download size={15} /> Export history
            </button>
            <button type="button" className="btn btn--primary" onClick={() => onEdit(customer)}>
              <Pencil size={15} /> Edit
            </button>
          </>
        )
      }
    >
      {customer && <Profile customer={customer} />}
    </Modal>
  );
}
