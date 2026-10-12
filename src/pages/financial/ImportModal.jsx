import { useRef, useState } from 'react';
import { Check, FileDown, FileUp, TriangleAlert, Upload } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/useToast';
import { useSalon } from '../../store/useSalon';
import { downloadFile, parseTransactionsCSV } from '../../lib/csv';

const TEMPLATE = ['Date,Type,Category,Amount,Notes', '2026-01-09,Credit,Hair,1200,', '2026-01-09,Credit,Nails,390,', '2026-01-09,Debit,Consumables,250.50,Shampoo restock'].join('\r\n');
const MAX_BYTES = 2 * 1024 * 1024;

/** Import Data: parse a CSV, insert the valid rows, report the skipped ones. */
export default function ImportModal({ open, onClose }) {
  const { actions } = useSalon();
  const toast = useToast();
  const inputRef = useRef(null);
  const [result, setResult] = useState(null);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setResult(null);
  }

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setResult({ fileName: file.name, inserted: 0, errors: [{ line: '—', reason: 'The file is larger than 2 MB.' }] });
      return;
    }
    let text;
    try {
      text = await file.text();
    } catch {
      setResult({ fileName: file.name, inserted: 0, errors: [{ line: '—', reason: 'The file could not be read.' }] });
      return;
    }
    const { valid, errors } = parseTransactionsCSV(text);
    if (valid.length) actions.importTransactions(valid);
    setResult({ fileName: file.name, inserted: valid.length, errors });
    toast(
      valid.length
        ? { title: `${valid.length} record${valid.length === 1 ? '' : 's'} imported`, description: errors.length ? `${errors.length} row${errors.length === 1 ? '' : 's'} skipped` : file.name }
        : { title: 'Nothing was imported', description: 'No valid rows were found in the file.', tone: 'error' },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import Data"
      subtitle="Add transactions in bulk from a CSV file."
      icon={
        <span className="modal__badge">
          <FileUp size={18} />
        </span>
      }
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            {result ? 'Done' : 'Cancel'}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => inputRef.current?.click()}>
            <Upload size={16} /> {result ? 'Import another file' : 'Choose CSV file'}
          </button>
        </>
      }
    >
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onFile} />

      <div className="import-guide">
        <p>Your file needs these columns, in any order:</p>
        <dl>
          <div>
            <dt>Date</dt>
            <dd>YYYY-MM-DD or MM/DD/YYYY</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>Credit or Debit</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>e.g. Hair, Nails, Salary, Rent</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>Greater than zero</dd>
          </div>
        </dl>
        <button type="button" className="link link--button" onClick={() => downloadFile('financial-import-template.csv', TEMPLATE)}>
          <FileDown size={15} /> Download a template
        </button>
      </div>

      {result && (
        <div className="import-result" role="status">
          <p className="import-result__file">{result.fileName}</p>
          <p className={`import-result__line${result.inserted ? ' is-good' : ''}`}>
            <Check size={15} strokeWidth={2.6} /> {result.inserted} record{result.inserted === 1 ? '' : 's'} imported
          </p>
          {result.errors.length > 0 && (
            <>
              <p className="import-result__line is-bad">
                <TriangleAlert size={15} /> {result.errors.length} row{result.errors.length === 1 ? '' : 's'} skipped
              </p>
              <ul className="import-result__errors">
                {result.errors.slice(0, 6).map((error, index) => (
                  <li key={index}>
                    <span>Line {error.line}</span> {error.reason}
                  </li>
                ))}
                {result.errors.length > 6 && <li>…and {result.errors.length - 6} more.</li>}
              </ul>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
