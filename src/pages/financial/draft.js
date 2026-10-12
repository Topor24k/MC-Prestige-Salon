import { CREDIT_CATEGORIES } from '../../data/catalog';
import { parseAmount, todayISO } from '../../lib/format';

// The Add New Entry session: staged credit and debit rows before they are confirmed.

let rowSeed = 0;
export const newRow = (category, amount = '') => {
  rowSeed += 1;
  return { key: `row-${rowSeed}`, category, amount: amount === '' ? '' : String(amount) };
};

/** A blank session: one empty credit row, no debit rows. */
export const emptyDraft = () => ({
  mode: 'new',
  originalDate: null,
  date: todayISO(),
  credits: [newRow(CREDIT_CATEGORIES[0])],
  debits: [],
});

/** Loads an existing day's line items for editing. */
export const draftFromDay = (day) => ({
  mode: 'edit',
  originalDate: day.date,
  date: day.date,
  credits: day.credits.map((c) => newRow(c.category, c.amount)),
  debits: day.debits.map((d) => newRow(d.category, d.amount)),
});

export const rowInvalid = (row) => !row.category || parseAmount(row.amount) <= 0;
export const draftTotals = (draft) => {
  const gross = draft.credits.reduce((t, r) => t + parseAmount(r.amount), 0);
  const expenses = draft.debits.reduce((t, r) => t + parseAmount(r.amount), 0);
  return { gross, expenses, net: Math.round((gross - expenses) * 100) / 100 };
};
