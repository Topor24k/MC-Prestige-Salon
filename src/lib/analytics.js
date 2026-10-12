import { formatDate, formatPeso, parseISODate, toISODate } from './format';
import { inRange } from './period';
import { bookingValue } from './services';

const round2 = (n) => Math.round(n * 100) / 100;

/** Gross Sales (credits), Total Expenses (debits) and Net Sales for a date range. */
export function financeTotals(transactions, start, end) {
  let gross = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (!inRange(t.date, start, end)) continue;
    if (t.type === 'credit') gross += t.amount;
    else expenses += t.amount;
  }
  return { gross: round2(gross), expenses: round2(expenses), net: round2(gross - expenses) };
}

/** One row per day: its credit and debit line items plus computed totals. Newest first. */
export function groupByDay(transactions) {
  const map = new Map();
  for (const t of transactions) {
    let day = map.get(t.date);
    if (!day) {
      day = { date: t.date, credits: [], debits: [], gross: 0, expenses: 0 };
      map.set(t.date, day);
    }
    if (t.type === 'credit') {
      day.credits.push(t);
      day.gross += t.amount;
    } else {
      day.debits.push(t);
      day.expenses += t.amount;
    }
  }
  return [...map.values()]
    .map((d) => ({ ...d, gross: round2(d.gross), expenses: round2(d.expenses), net: round2(d.gross - d.expenses) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
const rangeLabel = (startISO, endISO) =>
  startISO === endISO ? formatDate(startISO) : `${formatDate(startISO, { month: 'short', day: 'numeric' })} – ${formatDate(endISO)}`;

/**
 * Revenue (credit totals) bucketed for the trend chart. Granularity adapts to the
 * span: months for long ranges, weeks for a quarter, days for a single month.
 */
export function revenueSeries(transactions, range, now = new Date()) {
  const credits = transactions.filter((t) => t.type === 'credit');
  const today = toISODate(now);
  if (!credits.length) return { granularity: 'month', points: [], total: 0 };

  let start = range.start;
  let end = range.end;
  if (!start) start = credits.reduce((min, t) => (t.date < min ? t.date : min), credits[0].date);
  if (!end || end > today) end = today;
  if (start > end) return { granularity: 'month', points: [], total: 0 };

  const startDate = parseISODate(start);
  const endDate = parseISODate(end);
  const spanDays = Math.round((endDate - startDate) / 86400000) + 1;
  const granularity = spanDays > 100 ? 'month' : spanDays > 45 ? 'week' : 'day';

  const buckets = [];
  if (granularity === 'month') {
    for (let d = new Date(startDate.getFullYear(), startDate.getMonth(), 1); d <= endDate; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const from = d < startDate ? startDate : d;
      const to = monthEnd > endDate ? endDate : monthEnd;
      buckets.push({
        from: toISODate(from),
        to: toISODate(to),
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        sublabel: d.getMonth() === 0 || buckets.length === 0 ? String(d.getFullYear()) : '',
        partial: to < monthEnd,
      });
    }
  } else {
    const step = granularity === 'week' ? 7 : 1;
    for (let d = startDate; d <= endDate; d = addDays(d, step)) {
      const last = addDays(d, step - 1);
      const to = last > endDate ? endDate : last;
      buckets.push({
        from: toISODate(d),
        to: toISODate(to),
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sublabel: '',
        partial: false,
      });
    }
  }

  const points = buckets.map((b) => ({ ...b, value: 0, rangeLabel: rangeLabel(b.from, b.to) }));
  for (const t of credits) {
    if (t.date < start || t.date > end) continue;
    const point = points.find((p) => t.date >= p.from && t.date <= p.to);
    if (point) point.value += t.amount;
  }
  points.forEach((p) => {
    p.value = round2(p.value);
  });
  return { granularity, points, total: round2(points.reduce((t, p) => t + p.value, 0)) };
}

/** Services ranked by bookings, then revenue. Revenue counts completed visits at the price booked. */
export function serviceRanking(appointments, services, start, end) {
  const catalog = new Map(services.map((s) => [s.name.toLowerCase(), s]));
  const map = new Map();
  for (const a of appointments) {
    if (!inRange(a.date, start, end)) continue;
    const entry = catalog.get(a.service.toLowerCase());
    let row = map.get(a.service);
    if (!row) {
      row = { name: a.service, category: entry?.category || 'Other', bookings: 0, completed: 0, revenue: 0 };
      map.set(a.service, row);
    }
    row.bookings += 1;
    if (a.status === 'Completed') {
      row.completed += 1;
      row.revenue += bookingValue(a, services);
    }
  }
  return [...map.values()]
    .map((r) => ({ ...r, conversion: r.bookings ? (r.completed / r.bookings) * 100 : 0 }))
    .sort((a, b) => b.bookings - a.bookings || b.revenue - a.revenue);
}

const BOOKING_GROUPS = [
  { label: 'Coloring', line: 'Hair', test: /colou?r|balayage|rooting|highlight|dye|tint|ombre/i },
  { label: 'Cutting', line: 'Hair', test: /cut|trim|shave/i },
  { label: 'Manicures', line: 'Nails', test: /mani|gel|nail|acrylic/i },
  { label: 'Pedicures', line: 'Nails', test: /pedi|foot/i },
];

/** Booking volume for the four comparison groups, plus totals per service line. */
export function bookingComparison(appointments, services, start, end) {
  const catalog = new Map(services.map((s) => [s.name.toLowerCase(), s.category]));
  const groups = BOOKING_GROUPS.map((g) => ({ label: g.label, line: g.line, value: 0 }));
  const lines = { Hair: 0, Nails: 0, Other: 0 };
  for (const a of appointments) {
    if (a.status === 'Cancelled' || !inRange(a.date, start, end)) continue;
    const line = catalog.get(a.service.toLowerCase()) || 'Other';
    lines[line] = (lines[line] || 0) + 1;
    const index = BOOKING_GROUPS.findIndex((g) => g.test.test(a.service));
    if (index !== -1) groups[index].value += 1;
  }
  return { groups, lines, total: groups.reduce((t, g) => t + g.value, 0) };
}

/** Customers ranked by completed visits, then spend. */
export function topClients(appointments, services, start, end, limit = 5) {
  const map = new Map();
  for (const a of appointments) {
    if (a.status !== 'Completed' || !inRange(a.date, start, end)) continue;
    const key = a.customerId || a.name;
    let row = map.get(key);
    if (!row) {
      row = { id: a.customerId, name: a.name, visits: 0, spend: 0 };
      map.set(key, row);
    }
    row.visits += 1;
    row.spend += bookingValue(a, services);
  }
  return [...map.values()].sort((a, b) => b.visits - a.visits || b.spend - a.spend).slice(0, limit);
}

/** A customer's service history with their most frequently availed service. */
export function customerHistory(customer, appointments, services) {
  const records = appointments
    .filter((a) => a.customerId === customer.id)
    .sort((a, b) => (a.date === b.date ? b.time.localeCompare(a.time) : b.date.localeCompare(a.date)));
  const counts = new Map();
  let spend = 0;
  let visits = 0;
  for (const a of records) {
    if (a.status !== 'Completed') continue;
    visits += 1;
    spend += bookingValue(a, services);
    counts.set(a.service, (counts.get(a.service) || 0) + 1);
  }
  const frequent = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return { records, visits, spend, frequent: frequent ? { name: frequent[0], count: frequent[1] } : null };
}

const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

/**
 * Key Performance Recommendations. These are rule-based readings of the selected
 * period's data. Returns an empty list when there is too little data to say anything.
 */
export function buildRecommendations({ appointments, transactions, services, range }) {
  const scoped = appointments.filter((a) => inRange(a.date, range.start, range.end));
  const totals = financeTotals(transactions, range.start, range.end);
  if (scoped.length < 5 || totals.gross <= 0) return [];

  const tips = [];
  const ranking = serviceRanking(appointments, services, range.start, range.end);
  const comparison = bookingComparison(appointments, services, range.start, range.end);

  const top = ranking[0];
  if (top) {
    tips.push({
      tone: 'positive',
      title: `${top.name} is your most booked service`,
      body: `${top.bookings} bookings this period${top.revenue ? ` worth ${formatPeso(top.revenue, { whole: true })}` : ''}. Keep its best time slots open and feature it in your next promo.`,
    });
  }

  const active = comparison.lines.Hair + comparison.lines.Nails;
  if (active > 0) {
    const nailShare = Math.round((comparison.lines.Nails / active) * 100);
    if (nailShare < 35) {
      tips.push({
        tone: 'idea',
        title: 'Nail services have room to grow',
        body: `Nails make up ${nailShare}% of hair-and-nail bookings. Offer a manicure add-on during long hair treatments to raise the average ticket.`,
      });
    } else if (nailShare > 60) {
      tips.push({
        tone: 'idea',
        title: 'Hair bookings are trailing nails',
        body: `Hair is only ${100 - nailShare}% of hair-and-nail bookings. Since hair treatments earn the most per visit, promote them to nail regulars.`,
      });
    }
  }

  const expenseRatio = Math.round((totals.expenses / totals.gross) * 100);
  const byCategory = new Map();
  for (const t of transactions) {
    if (t.type !== 'debit' || !inRange(t.date, range.start, range.end)) continue;
    byCategory.set(t.category, (byCategory.get(t.category) || 0) + t.amount);
  }
  const largest = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  if (expenseRatio >= 80) {
    tips.push({
      tone: 'warning',
      title: `Expenses used ${expenseRatio}% of gross sales`,
      body: largest
        ? `${largest[0]} is the largest cost at ${formatPeso(largest[1], { whole: true })}. Review it before the next payout to protect your margin.`
        : 'Review recurring costs to protect your margin.',
    });
  } else {
    tips.push({
      tone: 'positive',
      title: `Net margin is holding at ${100 - expenseRatio}%`,
      body: largest
        ? `${largest[0]} remains the largest cost at ${formatPeso(largest[1], { whole: true })}. Margins are healthy — a good time to reinvest in tools or training.`
        : 'Margins are healthy for this period.',
    });
  }

  const cancelled = scoped.filter((a) => a.status === 'Cancelled').length;
  const cancelRate = Math.round((cancelled / scoped.length) * 100);
  if (cancelRate >= 8) {
    tips.push({
      tone: 'warning',
      title: `${cancelRate}% of bookings were cancelled`,
      body: `${cancelled} of ${scoped.length} appointments did not push through. A reminder message the day before usually recovers a share of these.`,
    });
  }

  const perWeekday = Array(7).fill(0);
  scoped.forEach((a) => {
    if (a.status !== 'Cancelled') perWeekday[parseISODate(a.date).getDay()] += 1;
  });
  const busiest = perWeekday.indexOf(Math.max(...perWeekday));
  const quietest = perWeekday.indexOf(Math.min(...perWeekday));
  if (perWeekday[busiest] > 0 && busiest !== quietest) {
    tips.push({
      tone: 'idea',
      title: `${WEEKDAYS[busiest]} are your busiest day`,
      body: `${perWeekday[busiest]} bookings fell on ${WEEKDAYS[busiest]}, against ${perWeekday[quietest]} on ${WEEKDAYS[quietest]}. Schedule your full team on peak days and run weekday offers to even out demand.`,
    });
  }

  return tips.slice(0, 4);
}
