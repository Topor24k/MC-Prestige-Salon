const escapeCell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  // Neutralise spreadsheet formula injection for text cells.
  if (/^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text))) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** columns: [{ key, label }] */
export function toCSV(rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(','));
  return [header, ...body].join('\r\n');
}

/** Free-form sheet: an array of rows, each an array of cells. */
export const rowsToCSV = (rows) => rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');

/** Parses CSV text into an array of rows (arrays of strings). Handles quoted cells. */
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = String(text).replace(/^﻿/, '');

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export function downloadFile(filename, content, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([`﻿${content}`], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const DATE_PATTERNS = [
  [/^(\d{4})-(\d{1,2})-(\d{1,2})$/, (m) => [m[1], m[2], m[3]]],
  [/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/, (m) => [m[3], m[1], m[2]]],
  [/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/, (m) => [`20${m[3]}`, m[1], m[2]]],
];

/** Accepts YYYY-MM-DD, MM/DD/YYYY, MM-DD-YY. Returns ISO date or null. */
export function normaliseDate(value) {
  const text = String(value ?? '').trim();
  for (const [pattern, pick] of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    const [y, mo, d] = pick(match).map(Number);
    const date = new Date(y, mo - 1, d);
    if (date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d) {
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }
  return null;
}

/**
 * Validates imported financial rows. Required columns (any order, case-insensitive):
 * Date, Type (Credit|Debit), Category, Amount. Optional: Notes.
 * Returns { valid: [{type,date,category,amount,notes}], errors: [{line, reason}] }.
 */
export function parseTransactionsCSV(text) {
  const rows = parseCSV(text);
  if (!rows.length) return { valid: [], errors: [{ line: 1, reason: 'The file is empty.' }] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names) => header.findIndex((h) => names.includes(h));
  const idx = {
    date: col('date', 'transaction date'),
    type: col('type', 'transaction type'),
    category: col('category', 'service', 'expense', 'service category', 'expense category'),
    amount: col('amount', 'amount (₱)', 'amount (php)'),
    notes: col('notes', 'note'),
  };
  const missing = ['date', 'type', 'category', 'amount'].filter((k) => idx[k] === -1);
  if (missing.length) {
    return {
      valid: [],
      errors: [{ line: 1, reason: `Missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.` }],
    };
  }

  const valid = [];
  const errors = [];
  rows.slice(1).forEach((row, i) => {
    const line = i + 2;
    const date = normaliseDate(row[idx.date]);
    const rawType = String(row[idx.type] ?? '').trim().toLowerCase();
    const type = rawType === 'credit' || rawType === 'income' ? 'credit' : rawType === 'debit' || rawType === 'expense' ? 'debit' : null;
    const category = String(row[idx.category] ?? '').trim().replace(/^'/, '');
    const amount = Number.parseFloat(String(row[idx.amount] ?? '').replace(/[^0-9.-]/g, ''));

    if (!date) return errors.push({ line, reason: 'Invalid or missing date' });
    if (!type) return errors.push({ line, reason: 'Type must be Credit or Debit' });
    if (!category) return errors.push({ line, reason: 'Missing category' });
    if (!Number.isFinite(amount) || amount <= 0) return errors.push({ line, reason: 'Amount must be greater than zero' });

    valid.push({
      type,
      date,
      category: category.slice(0, 60),
      amount: Math.round(amount * 100) / 100,
      notes: idx.notes === -1 ? '' : String(row[idx.notes] ?? '').trim().slice(0, 200),
    });
    return null;
  });
  return { valid, errors };
}
