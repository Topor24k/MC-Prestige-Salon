import { useMemo, useState } from 'react';
import { Banknote, Download, Ellipsis, FileUp, Pencil, Plus, ReceiptText, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { EntryConfirmModal, EntryFormModal } from './EntryModals';
import { draftFromDay, draftTotals, emptyDraft } from './draft';
import ImportModal from './ImportModal';
import ActionMenu from '../../components/ui/ActionMenu';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PeriodFilter from '../../components/ui/PeriodFilter';
import StatCard from '../../components/ui/StatCard';
import { EmptyState, PageHeader, Pagination } from '../../components/ui/bits';
import { usePageCommand } from '../../hooks/usePageCommand';
import { useToast } from '../../components/ui/useToast';
import { useSalon } from '../../store/useSalon';
import { financeTotals, groupByDay } from '../../lib/analytics';
import { downloadFile, toCSV } from '../../lib/csv';
import { formatDate, formatPeso, formatPesoWhole, parseAmount } from '../../lib/format';
import { getPeriodRange, inPeriod, monthsFromDates, percentChange } from '../../lib/period';
import { useIsMobile, usePagination } from '../../hooks/useMediaQuery';

function LineItems({ items, empty }) {
  if (!items.length) return <span className="muted">{empty}</span>;
  return (
    <ul className="line-items">
      {items.map((item) => (
        <li key={item.id}>
          <span>{item.category}</span>
          <span className="tabular">{formatPeso(item.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Financial() {
  const { transactions, actions } = useSalon();
  const toast = useToast();
  const isMobile = useIsMobile();

  const [period, setPeriod] = useState('this-month');
  const [stage, setStage] = useState('closed'); // closed | form | confirm
  const [draft, setDraft] = useState(emptyDraft);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const range = useMemo(() => getPeriodRange(period), [period]);
  const months = useMemo(() => monthsFromDates(transactions.map((t) => t.date)), [transactions]);
  const scoped = useMemo(() => transactions.filter((t) => inPeriod(t.date, range)), [transactions, range]);
  const days = useMemo(() => groupByDay(scoped), [scoped]);
  const totals = useMemo(() => financeTotals(scoped), [scoped]);
  const previous = useMemo(
    () => (range.prevStart ? financeTotals(transactions, range.prevStart, range.prevEnd) : null),
    [transactions, range],
  );
  const paging = usePagination(days, isMobile ? 6 : 8);
  const change = (key) => (previous ? percentChange(totals[key], previous[key]) : null);

  const openNew = () => {
    setDraft(emptyDraft());
    setStage('form');
  };
  usePageCommand({ onNew: openNew });
  const openEdit = (day) => {
    setDraft(draftFromDay(day));
    setStage('form');
  };

  const confirmEntry = () => {
    const toItems = (rows) => rows.map((r) => ({ category: r.category, amount: parseAmount(r.amount) }));
    actions.saveDayEntry({
      date: draft.date,
      credits: toItems(draft.credits),
      debits: toItems(draft.debits),
      replaceDate: draft.mode === 'edit' ? draft.originalDate : undefined,
    });
    const { net } = draftTotals(draft);
    toast({
      title: draft.mode === 'edit' ? 'Entry updated' : 'Entry saved',
      description: `${formatDate(draft.date)} · Net sales ${formatPeso(net)}`,
    });
    setStage('closed');
  };

  const exportCSV = () => {
    if (!scoped.length) {
      toast({ title: 'Nothing to export', description: 'There are no transactions in this period.', tone: 'info' });
      return;
    }
    const rows = [...scoped]
      .sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type))
      .map((t) => ({ ...t, type: t.type === 'credit' ? 'Credit' : 'Debit', amount: t.amount.toFixed(2) }));
    const csv = toCSV(rows, [
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'category', label: 'Category' },
      { key: 'amount', label: 'Amount' },
      { key: 'notes', label: 'Notes' },
    ]);
    downloadFile(`financial-report-${range.caption.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`, csv);
    toast({ title: 'Export ready', description: `${rows.length} transactions · ${range.caption}` });
  };

  const menuFor = (day) => [
    { key: 'edit', label: 'Edit entry', icon: Pencil, onSelect: () => openEdit(day) },
    { key: 'delete', label: 'Delete entry', icon: Trash2, tone: 'danger', separated: true, onSelect: () => setDeleting(day) },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Financial Management"
        title="Financial"
        accent="report"
        subtitle={`Summary · ${range.caption}`}
        primary={{ label: 'New entry', icon: Plus, onClick: openNew }}
        actions={
          <button type="button" className="btn btn--secondary" onClick={() => setImporting(true)}>
            <FileUp size={16} /> Import data
          </button>
        }
        menuItems={[
          { key: 'import', label: 'Import data', description: 'Upload a CSV file', icon: FileUp, onSelect: () => setImporting(true) },
          { key: 'export', label: 'Export CSV', description: range.caption, icon: Download, onSelect: exportCSV },
        ]}
        menuIcon={<Ellipsis size={18} />}
      />

      {isMobile && <PeriodFilter value={period} onChange={setPeriod} months={months} label={range.label} />}

      <section className="stats stats--three" aria-label="Financial summary">
        <StatCard
          tone="dark"
          label="Gross Sales"
          value={totals.gross}
          format={formatPeso}
          delta={change('gross')}
          compareLabel={range.compareLabel}
          caption={range.caption}
          icon={TrendingUp}
        />
        <StatCard
          label="Expenses"
          value={totals.expenses}
          format={isMobile ? formatPesoWhole : formatPeso}
          delta={change('expenses')}
          compareLabel={range.compareLabel}
          caption={range.caption}
          icon={Wallet}
          upIsGood={false}
        />
        <StatCard
          label="Net Sales"
          value={totals.net}
          format={isMobile ? formatPesoWhole : formatPeso}
          delta={change('net')}
          compareLabel={range.compareLabel}
          caption={range.caption}
          icon={Banknote}
        />
      </section>

      <section className="card">
        <header className="card__header card__header--toolbar">
          <div>
            <h2 className="card__title">Recent Transactions</h2>
            <p className="card__subtitle">
              {days.length} {days.length === 1 ? 'day' : 'days'} recorded · {range.caption}
            </p>
          </div>
          {!isMobile && (
            <div className="toolbar">
              <PeriodFilter value={period} onChange={setPeriod} months={months} label={range.label} />
              <button type="button" className="btn btn--secondary btn--sm" onClick={exportCSV}>
                <Download size={15} /> Export
              </button>
            </div>
          )}
        </header>

        {!days.length ? (
          <EmptyState
            icon={ReceiptText}
            title="No records found"
            description={`No transactions were recorded for ${range.caption}.`}
            action={
              <button type="button" className="btn btn--primary btn--sm" onClick={openNew}>
                <Plus size={15} /> Add New Entry
              </button>
            }
          />
        ) : isMobile ? (
          <ul className="ledger">
            {paging.pageItems.map((day) => (
              <li key={day.date} className="ledger__day">
                <div className="ledger__head">
                  <div>
                    <p className="ledger__date">{formatDate(day.date, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    <p className={`ledger__net${day.net < 0 ? ' is-negative' : ''}`}>{formatPeso(day.net)}</p>
                  </div>
                  <ActionMenu items={menuFor(day)} title={formatDate(day.date)} className="icon-button icon-button--quiet" aria-label={`Actions for ${formatDate(day.date)}`}>
                    <Ellipsis size={18} />
                  </ActionMenu>
                </div>
                <div className="ledger__columns">
                  <div>
                    <p className="ledger__label">
                      Credit <span>{formatPeso(day.gross)}</span>
                    </p>
                    <LineItems items={day.credits} empty="No income" />
                  </div>
                  <div>
                    <p className="ledger__label">
                      Debit <span>{formatPeso(day.expenses)}</span>
                    </p>
                    <LineItems items={day.debits} empty="No expenses" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="table-wrap">
            <table className="table table--ledger">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Credit</th>
                  <th scope="col" className="is-numeric">Gross Sales</th>
                  <th scope="col">Debit</th>
                  <th scope="col" className="is-numeric">Total Expense</th>
                  <th scope="col" className="is-numeric">Net Sales</th>
                  <th scope="col" className="is-action">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paging.pageItems.map((day) => (
                  <tr key={day.date}>
                    <td className="strong nowrap">{formatDate(day.date)}</td>
                    <td>
                      <LineItems items={day.credits} empty="—" />
                    </td>
                    <td className="is-numeric">{formatPeso(day.gross)}</td>
                    <td>
                      <LineItems items={day.debits} empty="—" />
                    </td>
                    <td className="is-numeric">{formatPeso(day.expenses)}</td>
                    <td className={`is-numeric strong${day.net < 0 ? ' is-negative' : ''}`}>{formatPeso(day.net)}</td>
                    <td className="is-action">
                      <div className="row-actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(day)}>
                          <Pencil size={14} /> Edit
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm btn--ghost-danger" onClick={() => setDeleting(day)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination {...paging} onChange={paging.setPage} noun="days" />
      </section>


      <EntryFormModal
        open={stage === 'form'}
        draft={draft}
        onChange={setDraft}
        onCancel={() => setStage('closed')}
        onReview={() => setStage('confirm')}
      />
      <EntryConfirmModal
        open={stage === 'confirm'}
        draft={draft}
        onEdit={() => setStage('form')}
        onCancel={() => setStage('closed')}
        onConfirm={confirmEntry}
      />
      <ImportModal open={importing} onClose={() => setImporting(false)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this entry?"
        message={
          deleting
            ? `All ${deleting.credits.length + deleting.debits.length} line items recorded on ${formatDate(deleting.date)} will be permanently removed.`
            : ''
        }
        detail="This action cannot be undone."
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          actions.deleteDayEntry(deleting.date);
          toast({ title: 'Entry deleted', description: formatDate(deleting.date), tone: 'info' });
          setDeleting(null);
        }}
      />
    </>
  );
}
