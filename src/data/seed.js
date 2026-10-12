import { GROUP_CATEGORY, HAIR_LENGTHS, RECORDED_MONTHS, SEED_SERVICES } from './catalog';
import { toISODate } from '../lib/format';
import { priceFor } from '../lib/services';

/*
 * Builds the sample dataset the app starts with. Services and prices come from the
 * salon's price list, and July–December 2025 monthly totals match the project paper.
 * Everything after that, and all customer names / phone numbers / bookings, are
 * generated placeholders.
 */

const FIRST_NAMES = [
  'Maria', 'Angelica', 'Kristine', 'Jasmine', 'Nicole', 'Andrea', 'Camille', 'Bianca', 'Patricia', 'Rhea',
  'Liza', 'Joanna', 'Carmela', 'Erika', 'Hazel', 'Ivy', 'Jocelyn', 'Katrina', 'Lorraine', 'Mylene',
  'Nadine', 'Paula', 'Queenie', 'Rica', 'Sheila', 'Trisha', 'Vanessa', 'Wendy', 'Yvonne', 'Zarah',
  'Althea', 'Bea', 'Clarisse', 'Danica', 'Elaine', 'Faith', 'Gwen', 'Irene', 'Janine', 'Mark',
  'Paolo', 'Miguel', 'Carlo', 'Joshua',
];
const LAST_NAMES = [
  'Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Villanueva', 'Ramos',
  'Aquino', 'Castillo', 'Navarro', 'Domingo', 'Salazar', 'Pascual', 'Mercado', 'Aguilar', 'De Leon', 'Soriano',
  'Valdez', 'Rosales', 'Lim', 'Tan', 'Uy', 'Dela Cruz', 'Fernandez', 'Lopez', 'Gonzales', 'Marquez',
  'Padilla', 'Cabrera', 'Estrada', 'Magno', 'Tolentino', 'Velasco', 'Ocampo', 'Sison', 'Abad',
];
const NOTES = [
  'Prefers afternoon slots.',
  'Sensitive scalp — use mild products.',
  'Usually books with a friend.',
  'Likes a quiet chair near the window.',
  'Allergic to strong fragrance.',
  'Asks for a reminder message the day before.',
];
const SLOTS = Array.from({ length: 20 }, (_, i) => {
  const minutes = 9 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});
const DAY_FACTOR = [1.25, 0.85, 0.85, 0.9, 0.95, 1.15, 1.5]; // Sun..Sat

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (n) => Math.round(n * 100) / 100;
const pad = (n, width) => String(n).padStart(width, '0');

export function createSeed(now = new Date()) {
  const rand = mulberry32(20250722);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const pickWeighted = (list, weightOf) => {
    const total = list.reduce((t, item) => t + weightOf(item), 0);
    let roll = rand() * total;
    for (const item of list) {
      roll -= weightOf(item);
      if (roll <= 0) return item;
    }
    return list[list.length - 1];
  };

  const today = toISODate(now);
  const horizon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 21);
  const horizonISO = toISODate(horizon);
  const nowTime = `${pad(now.getHours(), 2)}:${pad(now.getMinutes(), 2)}`;

  const services = SEED_SERVICES.map((s, i) => ({
    id: `SRV${pad(i + 1, 3)}`,
    name: s.name,
    category: GROUP_CATEGORY[s.group],
    group: s.group,
    pricing: s.prices ? 'length' : 'fixed',
    // For length pricing, `price` holds the starting (Short) price.
    price: s.prices ? s.prices.short : s.price,
    prices: s.prices || null,
    duration: s.duration,
    status: 'Active',
  }));
  const weightOf = new Map(SEED_SERVICES.map((s) => [s.name, s.weight]));
  const bookable = services.filter((s) => weightOf.get(s.name) > 0);

  const transactions = [];
  const draftAppointments = [];
  const customers = [];
  const loyalty = new Map();
  const usedNames = new Set();

  const projectedMonth = (y, m) => {
    const monthsSince = (y - 2026) * 12 + m;
    const seasonal = [0.86, 0.9, 0.97, 1.0, 1.05, 1.02, 0.98, 1.0, 1.04, 1.08, 1.14, 1.3][m];
    const gross = Math.round(104000 * (1 + 0.012 * monthsSince) * seasonal * (0.96 + rand() * 0.08));
    return { gross, expenses: round2(gross * (0.6 + rand() * 0.08)) };
  };

  const newCustomer = (date, canBeWalkIn) => {
    let first;
    let last;
    let name;
    do {
      first = pick(FIRST_NAMES);
      last = pick(LAST_NAMES);
      name = `${first} ${last}`;
    } while (usedNames.has(name));
    usedNames.add(name);
    const walkIn = rand() < 0.18 && canBeWalkIn;
    const customer = {
      id: `CUS${pad(customers.length + 1, 3)}`,
      name,
      phone: `09${pad(Math.floor(rand() * 1e9), 9)}`,
      facebook: `facebook.com/${first}.${last}.${10 + Math.floor(rand() * 89)}`.toLowerCase().replace(/\s+/g, ''),
      services: [],
      walkIn,
      notes: rand() < 0.22 ? pick(NOTES) : '',
      registeredAt: date,
    };
    customers.push(customer);
    loyalty.set(customer.id, rand() < 0.12 ? 5 + rand() * 3 : 0.4 + rand() * 2.2);
    return customer;
  };

  const lastMonthIndex = horizon.getFullYear() * 12 + horizon.getMonth();
  for (let index = 2025 * 12 + 6; index <= lastMonthIndex; index += 1) {
    const y = Math.floor(index / 12);
    const m = index % 12;
    const key = `${y}-${pad(m + 1, 2)}`;
    const target = RECORDED_MONTHS[key] || projectedMonth(y, m);
    const firstDay = target.firstDay || 1;
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const days = [];
    for (let d = firstDay; d <= daysInMonth; d += 1) {
      const date = new Date(y, m, d);
      days.push({ d, iso: toISODate(date), weight: DAY_FACTOR[date.getDay()] * (0.7 + rand() * 0.6) });
    }
    const totalWeight = days.reduce((t, day) => t + day.weight, 0);

    // ── Income: split the month's gross sales across its days ──
    let allocated = 0;
    days.forEach((day, i) => {
      const isLast = i === days.length - 1;
      const dayGross = isLast ? target.gross - allocated : Math.round((target.gross * day.weight) / totalWeight);
      allocated += dayGross;
      if (day.iso > today || dayGross <= 0) return;

      const nails = Math.round(dayGross * (0.18 + rand() * 0.08));
      const kos = rand() < 0.5 ? Math.round(dayGross * (0.05 + rand() * 0.07)) : 0;
      let hair = Math.round(dayGross * (0.56 + rand() * 0.12));
      let share = dayGross - hair - nails - kos;
      if (share < 0 || rand() >= 0.4) {
        hair += share;
        share = 0;
      }
      [['Hair', hair], ['Nails', nails], ['KOS', kos], ['Salon Share', share]].forEach(([category, amount]) => {
        if (amount > 0) transactions.push({ type: 'credit', date: day.iso, category, amount, notes: '' });
      });
    });

    // ── Expenses: fixed costs first, then salary, then small recurring items ──
    const dayISO = (d) => toISODate(new Date(y, m, Math.min(Math.max(d, firstDay), daysInMonth)));
    const expenses = [];
    let remaining = target.expenses;
    if (remaining > 40000) {
      expenses.push({ date: dayISO(5), category: 'Rent', amount: 11000 });
      remaining = round2(remaining - 11000);
    }
    if (remaining > 44000) {
      const utilities = round2(9800 + rand() * 1700);
      expenses.push({ date: dayISO(14 + Math.floor(rand() * 4)), category: 'Utilities', amount: utilities });
      remaining = round2(remaining - utilities);
    }
    const salary = round2(remaining * (0.62 + rand() * 0.08));
    const salaryDays = [9, 24].filter((d) => d >= firstDay);
    const firstPayout = salaryDays.length > 1 ? round2(salary * (0.46 + rand() * 0.08)) : salary;
    expenses.push({ date: dayISO(salaryDays[0] ?? daysInMonth), category: 'Salary', amount: firstPayout });
    if (salaryDays.length > 1) {
      expenses.push({ date: dayISO(salaryDays[1]), category: 'Salary', amount: round2(salary - firstPayout) });
    }
    remaining = round2(remaining - salary);

    const smallCategories = [
      ['Consumables', 5, 3], ['Drinking Water', 3, 0.4], ['Cleaning Materials', 2, 0.8],
      ['Cash Advance', 2, 3.5], ['Others', 2, 1], ['Assets', 0.5, 5],
    ];
    const smallCount = Math.max(3, Math.round(days.length / 3));
    const smalls = Array.from({ length: smallCount }, () => {
      const [category, , size] = pickWeighted(smallCategories, (c) => c[1]);
      return { date: pick(days).iso, category, weight: size * (0.5 + rand()) };
    });
    const smallWeight = smalls.reduce((t, s) => t + s.weight, 0);
    let smallAllocated = 0;
    smalls.forEach((s, i) => {
      const amount = i === smalls.length - 1 ? round2(remaining - smallAllocated) : round2((remaining * s.weight) / smallWeight);
      smallAllocated = round2(smallAllocated + amount);
      if (amount > 0) expenses.push({ date: s.date, category: s.category, amount });
    });
    expenses.forEach((e) => {
      if (e.date <= today) transactions.push({ type: 'debit', ...e, notes: '' });
    });

    // ── Bookings: volume follows the month's sales ──
    const bookingCount = Math.max(8, Math.round(target.gross / 2400));
    const perDay = new Map();
    for (let i = 0; i < bookingCount; i += 1) {
      const day = pickWeighted(days, (d) => d.weight);
      if (day.iso > horizonISO) continue;
      const taken = perDay.get(day.iso) || [];
      if (taken.length >= 8) continue;
      const free = SLOTS.filter((slot) => !taken.includes(slot));
      const time = pick(free);
      taken.push(time);
      perDay.set(day.iso, taken);
      draftAppointments.push({ date: day.iso, time });
    }
  }

  // Make sure "today" always has a schedule to show.
  const todaysSlots = draftAppointments.filter((a) => a.date === today).map((a) => a.time);
  for (const slot of ['09:30', '11:00', '13:30', '15:00', '16:30', '18:00']) {
    if (todaysSlots.length >= 6) break;
    if (!todaysSlots.includes(slot)) {
      todaysSlots.push(slot);
      draftAppointments.push({ date: today, time: slot });
    }
  }

  draftAppointments.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));

  const serviceCounts = new Map();
  const appointments = draftAppointments.map((draft, i) => {
    const isNew = customers.length < 6 || rand() < 0.3;
    const upcoming = draft.date > today;
    const customer = isNew ? newCustomer(upcoming ? today : draft.date, !upcoming) : pickWeighted(customers, (c) => loyalty.get(c.id));
    const chosen = pickWeighted(bookable, (s) => weightOf.get(s.name));
    const service = chosen.name;
    const hairLength = chosen.pricing === 'length' ? pickWeighted(HAIR_LENGTHS, (l) => ({ Short: 35, Medium: 40, Long: 25 })[l]) : null;

    const counts = serviceCounts.get(customer.id) || {};
    counts[service] = (counts[service] || 0) + 1;
    serviceCounts.set(customer.id, counts);

    let status = 'Pending';
    if (draft.date < today) status = rand() < 0.9 ? 'Completed' : 'Cancelled';
    else if (draft.date === today) status = draft.time < nowTime && rand() < 0.85 ? 'Completed' : 'Pending';
    else if (rand() < 0.05) status = 'Cancelled';

    const created = new Date(`${draft.date}T08:00:00`);
    created.setDate(created.getDate() - Math.floor(rand() * 5));
    return {
      id: `APT${pad(i + 1, 4)}`,
      customerId: customer.id,
      name: customer.name,
      phone: customer.phone,
      facebook: customer.facebook,
      service,
      hairLength,
      addOns: [],
      price: priceFor(chosen, hairLength),
      date: draft.date,
      time: draft.time,
      status,
      createdAt: (created > now ? now : created).toISOString(),
    };
  });

  customers.forEach((customer) => {
    const counts = serviceCounts.get(customer.id) || {};
    customer.services = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
  });

  transactions.sort((a, b) => a.date.localeCompare(b.date));
  transactions.forEach((t, i) => {
    t.id = `TXN${pad(i + 1, 5)}`;
  });

  return { version: 2, seededAt: now.toISOString(), customers, services, appointments, transactions };
}
