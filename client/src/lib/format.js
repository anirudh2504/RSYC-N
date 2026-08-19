/**
 * Money arrives from the API as an integer number of paise and is formatted
 * here, at the very last moment, using Indian digit grouping.
 */

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function rupees(paise) {
  const value = (Number(paise) || 0) / 100;
  return Number.isInteger(value) ? inr.format(value) : inr2.format(value);
}

/** With the symbol. `signed` adds + or - for ledger rows. */
export function money(paise, signed = false) {
  const value = Number(paise) || 0;
  const sign = signed ? (value < 0 ? '−' : '+') : value < 0 ? '−' : '';
  return `${sign}₹${rupees(Math.abs(value))}`;
}

/** Short form for headline figures: ₹1.84 Lakh. */
export function moneyShort(paise) {
  const value = (Number(paise) || 0) / 100;
  if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh`;
  return `₹${rupees(paise)}`;
}

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function under1000(n) {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
  return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${under1000(n % 100)}` : ''}`;
}

/**
 * The amount written out, shown under the entry field. This is what catches
 * the ₹5,000-instead-of-₹500 slip before it is saved.
 */
export function amountInWords(paise) {
  const value = Math.floor((Number(paise) || 0) / 100);
  if (value <= 0) return '';

  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value % 10000000) / 100000);
  const thousand = Math.floor((value % 100000) / 1000);
  const rest = value % 1000;

  const parts = [];
  if (crore) parts.push(`${under1000(crore)} crore`);
  if (lakh) parts.push(`${under1000(lakh)} lakh`);
  if (thousand) parts.push(`${under1000(thousand)} thousand`);
  if (rest) parts.push(under1000(rest));

  return `${parts.join(' ')} rupees`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function dayMonth(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function periodLabel(period) {
  if (!period) return '';
  const [y, m] = period.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function periodLabelLong(period) {
  if (!period) return '';
  const [y, m] = period.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

export function periodShort(period) {
  if (!period) return '';
  const [, m] = period.split('-').map(Number);
  return MONTHS[m - 1];
}

export function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function todayInput() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function dateInputValue(iso) {
  if (!iso) return todayInput();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayInput();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function relativeDays(iso) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'a month ago' : `${months} months ago`;
}

export function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Both dates matter when an entry was backdated. */
export function wasBackdated(entry) {
  if (!entry || !entry.occurredOn || !entry.createdAt) return false;
  return entry.occurredOn.slice(0, 10) !== entry.createdAt.slice(0, 10);
}
