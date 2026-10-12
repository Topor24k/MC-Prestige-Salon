// Reference data: the salon's published price list and the project paper (Milestones 1–5).

export const SALON = {
  name: 'M&C Prestige',
  fullName: 'M&C Prestige Hair and Nail Salon',
  area: 'Matina Crossing',
  address: 'Door 9, Teonora Arcade, McArthur Highway, Davao City',
  priceNote: 'Prices may vary depending on the hair volume and texture.',
};

export const APPOINTMENT_STATUSES = ['Pending', 'Completed', 'Cancelled'];
export const HAIR_LENGTHS = ['Short', 'Medium', 'Long'];

// Menu sections, in the order they appear on the price list, and the service line each belongs to.
export const SERVICE_GROUPS = ['Hair Services', 'Promo Packages', 'Add-ons', 'Nail Services', 'Bundle Promos', 'Other'];
export const GROUP_CATEGORY = {
  'Hair Services': 'Hair',
  'Promo Packages': 'Hair',
  'Add-ons': 'Hair',
  'Nail Services': 'Nails',
  'Bundle Promos': 'Nails',
  Other: 'Other',
};

// Financial entry categories (Credit = income, Debit = expense).
export const CREDIT_CATEGORIES = ['Hair', 'Nails', 'KOS', 'Salon Share', 'Other'];
export const DEBIT_CATEGORIES = [
  'Salary',
  'Utilities',
  'Consumables',
  'Cash Advance',
  'Assets',
  'Rent',
  'Cleaning Materials',
  'Drinking Water',
  'Others',
];

const byLength = (short, medium, long) => ({ short, medium, long });

/*
 * The salon's price list. `prices` = Short / Medium / Long hair; `price` = one flat price.
 * Durations (minutes) are estimates — the price list does not state them.
 * `weight` only steers how often a service appears in the generated sample bookings.
 */
export const SEED_SERVICES = [
  // ── Hair Services ──
  { name: 'Color', group: 'Hair Services', prices: byLength(799, 999, 1499), duration: 120, weight: 10 },
  { name: 'Rootings', group: 'Hair Services', price: 499, duration: 60, weight: 4 },
  { name: 'Traditional Rebond', group: 'Hair Services', prices: byLength(799, 999, 1999), duration: 180, weight: 7 },
  { name: 'L’Oreal Rebond', group: 'Hair Services', prices: byLength(2499, 2999, 3499), duration: 210, weight: 3 },
  { name: 'Organic Rebond', group: 'Hair Services', prices: byLength(1299, 1699, 1999), duration: 180, weight: 3 },
  { name: 'Balayage', group: 'Hair Services', prices: byLength(1499, 1999, 2499), duration: 180, weight: 4 },
  { name: 'Scalp Detox', group: 'Hair Services', prices: byLength(599, 799, 999), duration: 60, weight: 3 },
  { name: 'Hair Hydration (Regular)', group: 'Hair Services', prices: byLength(499, 699, 999), duration: 60, weight: 4 },
  { name: 'Hair Hydration (Deluxe)', group: 'Hair Services', prices: byLength(799, 999, 1499), duration: 75, weight: 2 },
  { name: 'Hair Brazilian Botox', group: 'Hair Services', prices: byLength(499, 699, 999), duration: 90, weight: 4 },
  { name: 'Hair Reborn Treatment', group: 'Hair Services', prices: byLength(699, 999, 1499), duration: 90, weight: 4 },
  { name: 'Cysteine Treatment', group: 'Hair Services', prices: byLength(1999, 2499, 2999), duration: 150, weight: 3 },
  { name: 'Hair Cut / Hair Iron', group: 'Hair Services', price: 150, duration: 30, weight: 14 },
  { name: 'Shampoo / Blowdry / Hair Cut', group: 'Hair Services', price: 200, duration: 45, weight: 8 },

  // ── Promo Packages ──
  { name: 'Color + Brazilian Botox', group: 'Promo Packages', prices: byLength(999, 1299, 1499), duration: 180, weight: 3 },
  { name: 'Color + Hair Reborn Treatment', group: 'Promo Packages', prices: byLength(1299, 1699, 1999), duration: 180, weight: 2 },
  { name: 'Color + Cysteine', group: 'Promo Packages', prices: byLength(2699, 2999, 3299), duration: 240, weight: 1 },
  { name: 'Color + Hair Hydration', group: 'Promo Packages', prices: byLength(799, 999, 1299), duration: 150, weight: 3 },
  { name: 'Balayage + Hair Reborn Treatment', group: 'Promo Packages', prices: byLength(1999, 2499, 2999), duration: 240, weight: 1 },
  { name: 'Balayage + Cysteine', group: 'Promo Packages', prices: byLength(3499, 3799, 4299), duration: 300, weight: 1 },
  { name: 'Rebond + Haircut + Hair Reborn Treatment', group: 'Promo Packages', prices: byLength(999, 1799, 2499), duration: 240, weight: 3 },
  { name: 'Rebond + Cysteine', group: 'Promo Packages', prices: byLength(2799, 3499, 3999), duration: 300, weight: 1 },
  { name: 'L’Oreal Rebond + Cysteine', group: 'Promo Packages', prices: byLength(4299, 4799, 4999), duration: 330, weight: 1 },
  { name: 'L’Oreal Rebond + Hair Reborn Treatment', group: 'Promo Packages', prices: byLength(2999, 3499, 3999), duration: 270, weight: 1 },
  { name: 'L’Oreal Rebond + Color + Hair Reborn Treatment', group: 'Promo Packages', prices: byLength(2999, 3499, 3999), duration: 330, weight: 1 },
  { name: 'Rebond + Color + Hair Reborn Treatment', group: 'Promo Packages', prices: byLength(2200, 2799, 2999), duration: 300, weight: 2 },
  { name: 'Rebond + Color + Cysteine', group: 'Promo Packages', prices: byLength(3499, 3999, 4299), duration: 360, weight: 1 },
  { name: 'L’Oreal Rebond + Color + Cysteine', group: 'Promo Packages', prices: byLength(4200, 4699, 4999), duration: 390, weight: 1 },
  { name: 'Rebond + Color + Brazilian Botox', group: 'Promo Packages', prices: byLength(1999, 2499, 2799), duration: 300, weight: 2 },
  { name: 'L’Oreal Rebond + Color + Brazilian Botox', group: 'Promo Packages', prices: byLength(3599, 3799, 3999), duration: 330, weight: 1 },

  // ── Add-ons (added to a hair service, never booked alone) ──
  { name: 'Rebond Sensitive Hair', group: 'Add-ons', prices: byLength(200, 300, 500), duration: 0, weight: 0 },
  { name: 'Bleached Sensitive Hair', group: 'Add-ons', prices: byLength(300, 400, 500), duration: 0, weight: 0 },

  // ── Nail Services ──
  { name: 'Manicure', group: 'Nail Services', price: 120, duration: 30, weight: 12 },
  { name: 'Pedicure', group: 'Nail Services', price: 140, duration: 40, weight: 10 },
  { name: 'Manicure + Gel Polish', group: 'Nail Services', price: 320, duration: 60, weight: 6 },
  { name: 'Pedicure + Gel Polish', group: 'Nail Services', price: 350, duration: 60, weight: 4 },
  { name: 'Manicure + Extension + Gel Polish', group: 'Nail Services', price: 520, duration: 90, weight: 2 },
  { name: 'Pedicure + Extension + Gel Polish', group: 'Nail Services', price: 550, duration: 90, weight: 1 },
  { name: 'Foot Spa (Classic)', group: 'Nail Services', price: 200, duration: 45, weight: 4 },
  { name: 'Foot Spa (Premium)', group: 'Nail Services', price: 250, duration: 60, weight: 2 },

  // ── Bundle Promos ──
  { name: 'Manicure + Pedicure + Foot Spa (Classic)', group: 'Bundle Promos', price: 450, duration: 105, weight: 3 },
  { name: 'Manicure + Pedicure + Foot Spa (Premium)', group: 'Bundle Promos', price: 450, duration: 120, weight: 2 },
  { name: 'Manicure + Gel Polish + Pedicure + Gel Polish + Foot Spa (Premium)', group: 'Bundle Promos', price: 800, duration: 180, weight: 2 },
  { name: 'Manicure + Extension + Gel Polish + Pedicure + Extension + Gel Polish + Foot Spa (Premium)', group: 'Bundle Promos', price: 1000, duration: 240, weight: 1 },
];

// Monthly totals recorded in the paper's Financial Overview (July–December 2025).
export const RECORDED_MONTHS = {
  '2025-07': { gross: 17727.0, expenses: 10683.21, firstDay: 22 },
  '2025-08': { gross: 68729.0, expenses: 71082.25 },
  '2025-09': { gross: 45681.0, expenses: 45078.75 },
  '2025-10': { gross: 71706.0, expenses: 64132.0 },
  '2025-11': { gross: 88121.0, expenses: 59773.25 },
  '2025-12': { gross: 119463.0, expenses: 73054.64 },
};
