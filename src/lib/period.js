import { toISODate } from './format';

export const PERIODS = [
  { key: 'this-month', label: 'This Month' },
  { key: 'last-month', label: 'Last Month' },
  { key: 'last-quarter', label: 'Last Quarter' },
  { key: 'this-year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
];

const monthStart = (y, m) => new Date(y, m, 1);
const monthEnd = (y, m) => new Date(y, m + 1, 0);
const monthName = (d, opts = { month: 'long', year: 'numeric' }) => d.toLocaleDateString('en-US', opts);

/** The same calendar day `months` earlier, clamped to that month's length. */
function shiftMonths(date, months) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = monthEnd(target.getFullYear(), target.getMonth()).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

/**
 * Resolves a period key into an inclusive ISO date range plus the range it is
 * compared against. Keys: one of PERIODS, or `month:YYYY-MM` for a specific month.
 *
 * When the period is still running, the comparison range stops at the matching
 * day (`toDate`), so twelve days of October are compared with twelve days of
 * September rather than with the whole month. `cutoff` is the last day of the
 * current range that should count towards that comparison.
 */
export function getPeriodRange(key, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = toISODate(now);

  const build = ({ start, end, prevStart, prevEnd, label, caption, compare, shift }) => {
    const startISO = start ? toISODate(start) : null;
    const endISO = end ? toISODate(end) : null;
    const running = Boolean(startISO && endISO && today >= startISO && today < endISO);
    const prevEndDate = running && shift ? shiftMonths(now, -shift) : prevEnd;
    return {
      key,
      start: startISO,
      end: endISO,
      prevStart: prevStart ? toISODate(prevStart) : null,
      prevEnd: prevEndDate ? toISODate(prevEndDate) : null,
      cutoff: running ? today : endISO,
      toDate: running,
      label,
      caption,
      compareLabel: compare ? `${compare}${running ? ' to date' : ''}` : '',
    };
  };

  if (key.startsWith('month:')) {
    const [yy, mm] = key.slice(6).split('-').map(Number);
    const start = monthStart(yy, mm - 1);
    return build({
      start,
      end: monthEnd(yy, mm - 1),
      prevStart: monthStart(yy, mm - 2),
      prevEnd: monthEnd(yy, mm - 2),
      label: monthName(start, { month: 'short', year: 'numeric' }),
      caption: monthName(start),
      compare: 'vs previous month',
      shift: 1,
    });
  }

  switch (key) {
    case 'last-month':
      return build({
        start: monthStart(y, m - 1),
        end: monthEnd(y, m - 1),
        prevStart: monthStart(y, m - 2),
        prevEnd: monthEnd(y, m - 2),
        label: 'Last Month',
        caption: monthName(monthStart(y, m - 1)),
        compare: 'vs previous month',
      });
    case 'last-quarter': {
      const start = monthStart(y, m - 2);
      return build({
        start,
        end: monthEnd(y, m),
        prevStart: monthStart(y, m - 5),
        prevEnd: monthEnd(y, m - 3),
        label: 'Last Quarter',
        caption: `${monthName(start, { month: 'short' })} – ${monthName(monthStart(y, m), { month: 'short', year: 'numeric' })}`,
        compare: 'vs prior 3 months',
        shift: 3,
      });
    }
    case 'this-year':
      return build({
        start: new Date(y, 0, 1),
        end: new Date(y, 11, 31),
        prevStart: new Date(y - 1, 0, 1),
        prevEnd: new Date(y - 1, 11, 31),
        label: 'This Year',
        caption: String(y),
        compare: 'vs last year',
        shift: 12,
      });
    case 'all':
      return build({ label: 'All Time', caption: 'All records' });
    case 'this-month':
    default:
      return build({
        start: monthStart(y, m),
        end: monthEnd(y, m),
        prevStart: monthStart(y, m - 1),
        prevEnd: monthEnd(y, m - 1),
        label: 'This Month',
        caption: monthName(monthStart(y, m)),
        compare: 'vs last month',
        shift: 1,
      });
  }
}

/** Distinct YYYY-MM keys present in a list of ISO dates, newest first. */
export function monthsFromDates(dates) {
  return [...new Set(dates.map((d) => d.slice(0, 7)))].sort().reverse();
}

export const inRange = (iso, start, end) => (!start || iso >= start) && (!end || iso <= end);
export const inPeriod = (iso, range) => inRange(iso, range.start, range.end);
/** Inside the period, up to today when the period is still running. */
export const inPeriodToDate = (iso, range) => inRange(iso, range.start, range.cutoff);
export const inPreviousPeriod = (iso, range) =>
  Boolean(range.prevStart) && inRange(iso, range.prevStart, range.prevEnd);

/** Percentage change, or null when there is no baseline to compare against. */
export function percentChange(current, previous) {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
