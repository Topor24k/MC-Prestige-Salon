import { useEffect, useMemo, useReducer, useRef } from 'react';
import { SalonContext } from './useSalon';
import { createSeed } from '../data/seed';
import { todayISO } from '../lib/format';
import { findService, quote } from '../lib/services';

const STORAGE_KEY = 'mc-prestige-salon/v2';
const RETIRED_KEYS = ['mc-prestige-salon/v1'];
const COLLECTIONS = ['customers', 'services', 'appointments', 'transactions'];

const pad = (n, width) => String(n).padStart(width, '0');

function nextId(list, prefix, width) {
  const max = list.reduce((m, item) => {
    const n = Number.parseInt(String(item.id).slice(prefix.length), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${pad(max + 1, width)}`;
}

function loadState() {
  try {
    RETIRED_KEYS.forEach((key) => window.localStorage.removeItem(key));
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 2 && COLLECTIONS.every((k) => Array.isArray(parsed[k]))) {
        // Keep only what the app still uses; older saves carried extra collections.
        return { version: 2, seededAt: parsed.seededAt, ...Object.fromEntries(COLLECTIONS.map((k) => [k, parsed[k]])) };
      }
    }
  } catch {
    // Unreadable storage falls through to a fresh dataset.
  }
  return createSeed();
}

const digits = (value) => String(value || '').replace(/\D/g, '');

function reducer(state, action) {
  switch (action.type) {
    case 'reset':
      return action.state;

    case 'appointments/add': {
      let customers = state.customers;
      if (action.newCustomer) {
        customers = [...customers, action.newCustomer];
      } else {
        customers = customers.map((c) =>
          c.id === action.appointment.customerId && !c.services.includes(action.appointment.service)
            ? { ...c, services: [...c.services, action.appointment.service] }
            : c,
        );
      }
      return { ...state, customers, appointments: [...state.appointments, action.appointment] };
    }
    case 'appointments/update':
      return {
        ...state,
        appointments: state.appointments.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a)),
      };
    case 'appointments/delete':
      return { ...state, appointments: state.appointments.filter((a) => a.id !== action.id) };

    case 'transactions/saveDay': {
      const kept = action.replaceDate ? state.transactions.filter((t) => t.date !== action.replaceDate) : state.transactions;
      return { ...state, transactions: [...kept, ...action.items] };
    }
    case 'transactions/deleteDay':
      return { ...state, transactions: state.transactions.filter((t) => t.date !== action.date) };

    case 'customers/add':
      return { ...state, customers: [...state.customers, action.customer] };
    case 'customers/update': {
      const customers = state.customers.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c));
      const updated = customers.find((c) => c.id === action.id);
      // Keep booking rows in step with the customer's contact details.
      const appointments = updated
        ? state.appointments.map((a) =>
            a.customerId === action.id ? { ...a, name: updated.name, phone: updated.phone, facebook: updated.facebook } : a,
          )
        : state.appointments;
      return { ...state, customers, appointments };
    }
    case 'customers/delete':
      return { ...state, customers: state.customers.filter((c) => c.id !== action.id) };

    case 'services/add':
      return { ...state, services: [...state.services, action.service] };
    case 'services/update':
      return { ...state, services: state.services.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)) };
    case 'services/delete':
      return { ...state, services: state.services.filter((s) => s.id !== action.id) };

    default:
      return state;
  }
}

export function SalonProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or unavailable — the session keeps working in memory.
    }
  }, [state]);

  const actions = useMemo(() => {
    const withTransactionIds = (items) => {
      const base = stateRef.current.transactions;
      const first = Number.parseInt(nextId(base, 'TXN', 5).slice(3), 10);
      return items.map((item, i) => ({ notes: '', ...item, id: `TXN${pad(first + i, 5)}` }));
    };

    return {
      /**
       * Creates a booking. The customer is matched to an existing record by phone or
       * name, and registered as a new customer otherwise.
       */
      addAppointment(input) {
        const current = stateRef.current;
        const phone = digits(input.phone);
        const existing = current.customers.find(
          (c) => (phone && digits(c.phone) === phone) || c.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
        );
        const newCustomer = existing
          ? null
          : {
              id: nextId(current.customers, 'CUS', 3),
              name: input.name.trim(),
              phone: input.phone.trim(),
              facebook: (input.facebook || '').trim(),
              services: [input.service],
              walkIn: false,
              notes: '',
              registeredAt: todayISO(),
            };

        const service = findService(current.services, input.service);
        const hairLength = service?.pricing === 'length' ? input.hairLength || 'Short' : null;
        const addOnNames = hairLength ? input.addOns || [] : [];
        const addOns = addOnNames.map((name) => findService(current.services, name)).filter(Boolean);

        const appointment = {
          id: nextId(current.appointments, 'APT', 4),
          customerId: (existing || newCustomer).id,
          name: input.name.trim(),
          phone: input.phone.trim(),
          facebook: (input.facebook || '').trim(),
          service: input.service,
          hairLength,
          addOns: addOns.map((a) => a.name),
          price: quote(service, hairLength, addOns),
          date: input.date,
          time: input.time,
          status: 'Pending',
          createdAt: new Date().toISOString(),
        };
        dispatch({ type: 'appointments/add', appointment, newCustomer });
        return { appointment, isNewCustomer: Boolean(newCustomer) };
      },

      updateAppointment: (id, patch) => dispatch({ type: 'appointments/update', id, patch }),
      deleteAppointment: (id) => dispatch({ type: 'appointments/delete', id }),

      /** Writes one day's credit and debit line items. `replaceDate` overwrites that day (edit). */
      saveDayEntry({ date, credits, debits, replaceDate }) {
        const items = withTransactionIds([
          ...credits.map((c) => ({ type: 'credit', date, category: c.category, amount: c.amount })),
          ...debits.map((d) => ({ type: 'debit', date, category: d.category, amount: d.amount })),
        ]);
        dispatch({ type: 'transactions/saveDay', items, replaceDate });
        return items.length;
      },
      deleteDayEntry: (date) => dispatch({ type: 'transactions/deleteDay', date }),
      importTransactions(rows) {
        dispatch({ type: 'transactions/saveDay', items: withTransactionIds(rows) });
        return rows.length;
      },

      addCustomer(input) {
        const customer = {
          id: nextId(stateRef.current.customers, 'CUS', 3),
          name: input.name.trim(),
          phone: input.phone.trim(),
          facebook: (input.facebook || '').trim(),
          services: input.services || [],
          walkIn: Boolean(input.walkIn),
          notes: (input.notes || '').trim(),
          registeredAt: todayISO(),
        };
        dispatch({ type: 'customers/add', customer });
        return customer;
      },
      updateCustomer: (id, patch) => dispatch({ type: 'customers/update', id, patch }),
      deleteCustomer: (id) => dispatch({ type: 'customers/delete', id }),

      addService(input) {
        const service = { id: nextId(stateRef.current.services, 'SRV', 3), ...input };
        dispatch({ type: 'services/add', service });
        return service;
      },
      updateService: (id, patch) => dispatch({ type: 'services/update', id, patch }),
      deleteService: (id) => dispatch({ type: 'services/delete', id }),

      resetDemoData: () => dispatch({ type: 'reset', state: createSeed() }),
    };
  }, []);

  const value = useMemo(() => ({ ...state, actions }), [state, actions]);
  return <SalonContext.Provider value={value}>{children}</SalonContext.Provider>;
}
