import { useMemo, useState } from 'react';
import { CalendarClock, UserPlus } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { Field } from '../../components/ui/bits';
import { useToast } from '../../components/ui/useToast';
import { findConflict, useSalon } from '../../store/useSalon';
import { HAIR_LENGTHS, SERVICE_GROUPS } from '../../data/catalog';
import { displayCustomerId, formatDate, formatPeso, formatTime, isValidPhone, todayISO } from '../../lib/format';
import { findService, isAddOn, isBookable, isLengthPriced, priceFor, quote } from '../../lib/services';

const conflictMessage = (clash) =>
  `${formatTime(clash.time)} on ${formatDate(clash.date)} is already booked for ${clash.name}. Choose another time.`;

/* ── Add New Customer (Submit Booking) ───────────────────── */

function AddForm({ formId, onDone }) {
  const { appointments, customers, services, actions } = useSalon();
  const toast = useToast();
  const [values, setValues] = useState({ name: '', phone: '', facebook: '', service: '', hairLength: '', addOns: [], date: todayISO(), time: '' });
  const [submitted, setSubmitted] = useState(false);

  const grouped = useMemo(
    () =>
      SERVICE_GROUPS.map((group) => ({ group, items: services.filter((s) => s.group === group && isBookable(s)) })).filter(
        (section) => section.items.length,
      ),
    [services],
  );
  const addOnOptions = useMemo(() => services.filter((s) => isAddOn(s) && s.status === 'Active'), [services]);

  const set = (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.value }));
  const service = findService(services, values.service);
  const byLength = isLengthPriced(service);
  const chosenAddOns = byLength ? addOnOptions.filter((a) => values.addOns.includes(a.name)) : [];
  const total = service && (!byLength || values.hairLength) ? quote(service, values.hairLength, chosenAddOns) : null;

  // Picking a known customer fills in their contact details.
  const onNameChange = (event) => {
    const name = event.target.value;
    const match = customers.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    setValues((v) => ({
      ...v,
      name,
      phone: match && !v.phone ? match.phone : v.phone,
      facebook: match && !v.facebook ? match.facebook : v.facebook,
    }));
  };
  const toggleAddOn = (name) =>
    setValues((v) => ({ ...v, addOns: v.addOns.includes(name) ? v.addOns.filter((n) => n !== name) : [...v.addOns, name] }));

  const clash = findConflict(appointments, values.date, values.time);
  const errors = {};
  if (!values.name.trim()) errors.name = 'Enter the customer’s name.';
  if (!values.phone.trim()) errors.phone = 'Enter a phone number.';
  else if (!isValidPhone(values.phone)) errors.phone = 'Enter a valid phone number, e.g. 0917 123 4567.';
  if (!values.facebook.trim()) errors.facebook = 'Add the customer’s Facebook profile link.';
  if (!values.service) errors.service = 'Choose a service.';
  if (byLength && !values.hairLength) errors.hairLength = 'Choose the hair length.';
  if (!values.date) errors.date = 'Pick a date.';
  if (!values.time) errors.time = 'Pick a time.';
  const show = (key) => (submitted ? errors[key] : undefined);

  const onSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length || clash) return;
    const { appointment, isNewCustomer } = actions.addAppointment(values);
    toast({
      title: 'Appointment saved',
      description: `${appointment.name} · ${formatDate(appointment.date)}, ${formatTime(appointment.time)} · ${displayCustomerId(appointment.customerId)}${isNewCustomer ? ' (new customer)' : ''}`,
    });
    onDone();
  };

  return (
    <form id={formId} className="form-grid" onSubmit={onSubmit} noValidate>
      <Field label="Name" error={show('name')} className="form-grid__wide">
        {(props) => (
          <>
            <input {...props} className="input" value={values.name} onChange={onNameChange} list={`${formId}-customers`} placeholder="Customer name" autoComplete="off" />
            <datalist id={`${formId}-customers`}>
              {customers.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </>
        )}
      </Field>
      <Field label="Phone" error={show('phone')}>
        {(props) => <input {...props} className="input" type="tel" inputMode="tel" value={values.phone} onChange={set('phone')} placeholder="0917 123 4567" autoComplete="off" />}
      </Field>
      <Field label="Facebook" error={show('facebook')}>
        {(props) => <input {...props} className="input" type="url" inputMode="url" value={values.facebook} onChange={set('facebook')} placeholder="facebook.com/username" autoComplete="off" />}
      </Field>
      <Field label="Service" error={show('service')} className={byLength ? undefined : 'form-grid__wide'}>
        {(props) => (
          <select {...props} className="input input--select" value={values.service} onChange={set('service')}>
            <option value="">Select a service</option>
            {grouped.map((section) => (
              <optgroup key={section.group} label={section.group}>
                {section.items.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
      </Field>
      {byLength && (
        <Field label="Hair length" error={show('hairLength')}>
          {(props) => (
            <select {...props} className="input input--select" value={values.hairLength} onChange={set('hairLength')}>
              <option value="">Select length</option>
              {HAIR_LENGTHS.map((length) => (
                <option key={length} value={length}>
                  {length} — {formatPeso(priceFor(service, length), { whole: true })}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      {byLength && addOnOptions.length > 0 && (
        <div className="field form-grid__wide">
          <span className="field__label" id={`${formId}-addons`}>
            Add-ons <span className="field__optional">Optional</span>
          </span>
          <div className="choice-chips" role="group" aria-labelledby={`${formId}-addons`}>
            {addOnOptions.map((addOn) => (
              <button key={addOn.id} type="button" className="chip chip--choice" aria-pressed={values.addOns.includes(addOn.name)} onClick={() => toggleAddOn(addOn.name)}>
                {addOn.name}
                {values.hairLength && <span className="chip__count">+{formatPeso(priceFor(addOn, values.hairLength), { whole: true })}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      <Field label="Date" error={show('date')}>
        {(props) => <input {...props} className="input" type="date" value={values.date} onChange={set('date')} />}
      </Field>
      <Field label="Time" error={clash ? conflictMessage(clash) : show('time')}>
        {(props) => <input {...props} className="input" type="time" step="900" value={values.time} onChange={set('time')} />}
      </Field>
      {total !== null && (
        <p className="form-total form-grid__wide" role="status">
          <span>Price</span>
          <strong>{formatPeso(total, { whole: true })}</strong>
        </p>
      )}
    </form>
  );
}

export function AddAppointmentModal({ open, onClose }) {
  const formId = 'add-appointment-form';
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Customer"
      subtitle="Book an appointment. New customers are registered automatically."
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
            Save Customer
          </button>
        </>
      }
    >
      <AddForm formId={formId} onDone={onClose} />
    </Modal>
  );
}

/* ── Request Reschedule ──────────────────────────────────── */

function RescheduleForm({ formId, appointment, onDone }) {
  const { appointments, actions } = useSalon();
  const toast = useToast();
  const [date, setDate] = useState(appointment.date);
  const [time, setTime] = useState(appointment.time);
  const [submitted, setSubmitted] = useState(false);

  const unchanged = date === appointment.date && time === appointment.time;
  const clash = unchanged ? null : findConflict(appointments, date, time, appointment.id);

  const onSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (!date || !time || clash || unchanged) return;
    actions.updateAppointment(appointment.id, { date, time });
    toast({ title: 'Appointment rescheduled', description: `${appointment.name} · ${formatDate(date)}, ${formatTime(time)}` });
    onDone();
  };

  return (
    <form id={formId} onSubmit={onSubmit} noValidate>
      <dl className="summary-strip">
        <div>
          <dt>Customer</dt>
          <dd>{appointment.name}</dd>
        </div>
        <div>
          <dt>Service</dt>
          <dd>{appointment.service}</dd>
        </div>
        <div>
          <dt>Current schedule</dt>
          <dd>
            {formatDate(appointment.date)} · {formatTime(appointment.time)}
          </dd>
        </div>
      </dl>
      <div className="form-grid">
        <Field label="New date" error={submitted && !date ? 'Pick a date.' : undefined}>
          {(props) => <input {...props} className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <Field
          label="New time"
          error={clash ? conflictMessage(clash) : submitted && !time ? 'Pick a time.' : submitted && unchanged ? 'Choose a different date or time.' : undefined}
        >
          {(props) => <input {...props} className="input" type="time" step="900" value={time} onChange={(e) => setTime(e.target.value)} />}
        </Field>
      </div>
    </form>
  );
}

export function RescheduleModal({ appointment, onClose }) {
  const formId = 'reschedule-form';
  return (
    <Modal
      open={Boolean(appointment)}
      onClose={onClose}
      size="sm"
      title="Reschedule appointment"
      icon={
        <span className="modal__badge">
          <CalendarClock size={18} />
        </span>
      }
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn btn--primary">
            Confirm
          </button>
        </>
      }
    >
      {appointment && <RescheduleForm formId={formId} appointment={appointment} onDone={onClose} />}
    </Modal>
  );
}
