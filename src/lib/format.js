const pad = (n) => String(n).padStart(2, '0');

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const wholeFormatter = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 });

export function formatPeso(amount, { whole = false } = {}) {
  const value = Number.isFinite(amount) ? amount : 0;
  const body = (whole ? wholeFormatter : pesoFormatter).format(Math.abs(value));
  return `${value < 0 ? '−' : ''}₱${body}`;
}

export const formatPesoWhole = (amount) => formatPeso(amount, { whole: true });

export function formatPesoCompact(amount) {
  const value = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}₱${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}₱${(abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1).replace(/\.0$/, '')}K`;
  return `${sign}₱${wholeFormatter.format(abs)}`;
}

export const formatNumber = (n) => wholeFormatter.format(Number.isFinite(n) ? n : 0);

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseISODate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export const todayISO = () => toISODate(new Date());

export function formatDate(iso, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!iso) return '—';
  return parseISODate(iso).toLocaleDateString('en-US', options);
}

export const formatDateShort = (iso) => formatDate(iso, { month: 'short', day: 'numeric' });

// 'HH:MM' (24h) -> '4:00 PM'
export function formatTime(time) {
  if (!time) return '—';
  const [h, m] = String(time).split(':').map(Number);
  if (!Number.isFinite(h)) return time;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m || 0)} ${suffix}`;
}

export function formatDuration(minutes) {
  const total = Number(minutes) || 0;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
}

export function parseAmount(value) {
  const numeric = Number.parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
}

export const displayCustomerId = (id) => (id ? `#${id}` : '—');

/** Turns a typed profile link into a safe http(s) URL, or null when it is not one. */
export function toExternalUrl(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.') ? url.href : null;
  } catch {
    return null;
  }
}

export const prettyLink = (value) => String(value || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

export const isValidPhone = (value) => {
  const count = String(value || '').replace(/\D/g, '').length;
  return count >= 10 && count <= 13;
};

export function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
