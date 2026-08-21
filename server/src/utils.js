/**
 * Shared helpers.
 *
 * Money is always a WHOLE NUMBER OF RUPEES — never a float, never a string.
 * ₹200 is 200. Paise are not recorded anywhere: the club never deals in them,
 * and refusing decimals is what keeps every amount an exact integer, so sums
 * can never drift the way floating point money does.
 */

/** 'YYYY-MM' for a Date. */
export function periodOf(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Inclusive list of 'YYYY-MM' from one period to another. */
export function periodRange(from, to) {
  const out = [];
  if (!from || !to || from > to) return out;
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  // Guard against a runaway loop if the inputs are ever malformed.
  for (let i = 0; i < 600; i++) {
    const p = `${y}-${String(m).padStart(2, '0')}`;
    out.push(p);
    if (y > ty || (y === ty && m >= tm)) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function addMonths(period, n) {
  let [y, m] = period.split('-').map(Number);
  m += n;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function periodLabel(period) {
  if (!period) return '';
  const [y, m] = period.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

let counter = 0;
export function newId(prefix = 'id') {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

export function nowIso() {
  return new Date().toISOString();
}
