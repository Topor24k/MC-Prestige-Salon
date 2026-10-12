import { useState } from 'react';
import { CreditCard, Plus, ReceiptText, SquarePlus, Wallet, X } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { Field, Segmented } from '../../components/ui/bits';
import { draftTotals, newRow, rowInvalid } from './draft';
import { CREDIT_CATEGORIES, DEBIT_CATEGORIES } from '../../data/catalog';
import { formatDate, formatPeso, parseAmount } from '../../lib/format';

const MODES = {
  credit: { listKey: 'credits', panel: 'Add Service', label: 'Service', placeholder: 'Service amount', categories: CREDIT_CATEGORIES, total: 'Gross sales' },
  debit: { listKey: 'debits', panel: 'Add Expense', label: 'Expense', placeholder: 'Expense amount', categories: DEBIT_CATEGORIES, total: 'Total expenses' },
};

/* ── Step 1–3: Add New Entry (Credit and Debit tabs) ─────── */

export function EntryFormModal({ open, draft, onChange, onCancel, onReview }) {
  const [tab, setTab] = useState('credit');
  const [checked, setChecked] = useState({ credit: false, debit: false });
  const [notice, setNotice] = useState('');
  const [wasOpen, setWasOpen] = useState(open);

  // Each time the dialog opens it starts on the Credit tab with a clean slate.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTab('credit');
      setChecked({ credit: false, debit: false });
      setNotice('');
    }
  }

  const mode = MODES[tab];
  const rows = draft[mode.listKey];
  const totals = draftTotals(draft);

  const setRows = (next) => {
    setNotice('');
    onChange({ ...draft, [mode.listKey]: next });
  };
  const updateRow = (key, patch) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => setRows([...rows, newRow(mode.categories[0])]);
  const removeRow = (key) => setRows(rows.filter((r) => r.key !== key));

  const onSubmit = (event) => {
    event.preventDefault();
    if (tab === 'credit') {
      setChecked((c) => ({ ...c, credit: true }));
      if (!draft.date || draft.credits.some(rowInvalid)) return;
      setTab('debit');
      return;
    }
    setChecked({ credit: true, debit: true });
    if (!draft.date) return;
    if (draft.credits.some(rowInvalid)) {
      setTab('credit');
      return;
    }
    if (draft.debits.some(rowInvalid)) return;
    if (!draft.credits.length && !draft.debits.length) {
      setNotice('Add at least one credit or debit line before saving.');
      return;
    }
    onReview();
  };

  const formId = 'entry-form';
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={draft.mode === 'edit' ? 'Edit Entry' : 'Add New Entry'}
      subtitle="Record the day’s income and expenses, then review before saving."
      icon={
        <span className="modal__badge">
          <SquarePlus size={18} />
        </span>
      }
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn btn--primary">
            {tab === 'credit' ? 'Save & Continue' : 'Save Entry'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate>
        <Segmented
          label="Entry type"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'credit', label: 'Credit', icon: CreditCard, count: draft.credits.length },
            { value: 'debit', label: 'Debit', icon: Wallet, count: draft.debits.length },
          ]}
        />

        <Field label="Date" className="field--date" error={(checked.credit || checked.debit) && !draft.date ? 'Pick the transaction date.' : undefined}>
          {(props) => (
            <input {...props} className="input" type="date" value={draft.date} onChange={(e) => onChange({ ...draft, date: e.target.value })} />
          )}
        </Field>

        <div className="entry-panel">
          <div className="entry-panel__head">
            <span>{tab === 'credit' ? 'Income line items' : 'Expense line items'}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={addRow}>
              <Plus size={15} /> {mode.panel}
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="entry-panel__empty">
              {tab === 'credit' ? 'No income recorded for this day.' : 'No expenses recorded for this day.'} Use “{mode.panel}” to add a line.
            </p>
          ) : (
            <ul className="entry-rows">
              {rows.map((row, index) => {
                const invalid = checked[tab] && rowInvalid(row);
                const options = mode.categories.includes(row.category) ? mode.categories : [row.category, ...mode.categories];
                return (
                  <li key={row.key} className={`entry-row${invalid ? ' is-invalid' : ''}`}>
                    <label className="entry-row__field">
                      <span className={index === 0 ? 'entry-row__label' : 'sr-only'}>{mode.label}</span>
                      <select className="input input--select" value={row.category} onChange={(e) => updateRow(row.key, { category: e.target.value })}>
                        {options.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="entry-row__field">
                      <span className={index === 0 ? 'entry-row__label' : 'sr-only'}>Amount</span>
                      <span className="input-affix">
                        <span aria-hidden="true">₱</span>
                        <input
                          className="input"
                          inputMode="decimal"
                          value={row.amount}
                          placeholder={mode.placeholder}
                          aria-invalid={invalid || undefined}
                          data-autofocus={index === 0 ? 'desktop' : undefined}
                          onChange={(e) => updateRow(row.key, { amount: e.target.value.replace(/[^0-9.]/g, '') })}
                        />
                      </span>
                    </label>
                    <button type="button" className="icon-button icon-button--quiet icon-button--sm" aria-label={`Remove ${mode.label.toLowerCase()} line ${index + 1}`} onClick={() => removeRow(row.key)}>
                      <X size={15} />
                    </button>
                    {invalid && (
                      <p className="entry-row__error" role="alert">
                        Enter an amount greater than zero.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="entry-panel__total">
            <span>{mode.total}</span>
            <strong>{formatPeso(tab === 'credit' ? totals.gross : totals.expenses)}</strong>
          </div>
        </div>

        {notice && (
          <p className="form-notice" role="alert">
            {notice}
          </p>
        )}
      </form>
    </Modal>
  );
}

/* ── Step 4–5: Entry Confirmation ────────────────────────── */

export function EntryConfirmModal({ open, draft, onEdit, onConfirm, onCancel }) {
  const totals = draftTotals(draft);
  const lines = [
    ...draft.credits.map((r) => ({ ...r, type: 'Credit' })),
    ...draft.debits.map((r) => ({ ...r, type: 'Debit' })),
  ];

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      className="modal--receipt"
      title="Entry Confirmation"
      subtitle={formatDate(draft.date, { month: 'long', day: 'numeric', year: 'numeric' })}
      icon={
        <span className="modal__badge">
          <ReceiptText size={18} />
        </span>
      }
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="btn btn--primary" onClick={onConfirm} data-autofocus>
            Confirm
          </button>
        </>
      }
    >
      <div className="receipt">
        <div className="receipt__head">
          <span>Service</span>
          <span>Transaction</span>
          <span>Amount</span>
        </div>
        <ul className="receipt__lines">
          {lines.map((line) => (
            <li key={line.key}>
              <span>{line.category}</span>
              <span>{line.type}</span>
              <span className={line.type === 'Credit' ? 'amount amount--in' : 'amount amount--out'}>
                {line.type === 'Credit' ? '+' : '−'} {formatPeso(parseAmount(line.amount))}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <dl className="receipt receipt--summary">
        <div>
          <dt>Total Expense</dt>
          <dd>{formatPeso(totals.expenses)}</dd>
        </div>
        <div>
          <dt>Gross Sale</dt>
          <dd>{formatPeso(totals.gross)}</dd>
        </div>
        <div className="receipt__net">
          <dt>Net Sales</dt>
          <dd>{formatPeso(totals.net)}</dd>
        </div>
      </dl>
    </Modal>
  );
}
