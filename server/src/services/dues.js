/**
 * Who has paid, who has not, and how far behind they are.
 *
 * Nothing is stored. There is no cron job creating a row per member per month.
 * For each member we walk the months from when they joined to now, look up the
 * contribution plan that was in force for that month, and compare it against
 * what they actually paid for it. A backdated payment therefore corrects itself
 * instead of leaving a stale row behind.
 */

import { periodOf, periodRange } from '../utils.js';
import { liveEntries } from './ledger.js';

export function currentPeriod() {
  return periodOf(new Date());
}

/** The plan in force for a member in a given month, or null if none was. */
export function planFor(db, memberId, period) {
  const plans = db
    .plansFor(memberId)
    .filter((p) => p.effectiveFrom <= period && (p.effectiveTo === null || p.effectiveTo >= period))
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));
  return plans[0] || null;
}

/** The plan in force right now. Used by the admin screens. */
export function currentPlan(db, memberId) {
  return planFor(db, memberId, currentPeriod());
}

/** What a member actually paid towards one month, across every entry. */
function paidForPeriod(db, memberId, period) {
  return liveEntries(db)
    .filter((e) => e.memberId === memberId && e.direction === 'credit')
    .reduce((sum, e) => {
      const hit = (e.allocations || []).filter((a) => a.period === period);
      return sum + hit.reduce((s, a) => s + a.amount, 0);
    }, 0);
}

/**
 * The full month-by-month picture for one member.
 * Months where collection was switched off are included, marked 'exempt', so
 * the history stays honest rather than silently disappearing.
 */
export function duesForMember(db, memberId, upto = currentPeriod()) {
  const member = db.findMember(memberId);
  if (!member) return null;

  const periods = periodRange(member.joinedPeriod, upto);
  const months = periods.map((period) => {
    const plan = planFor(db, memberId, period);
    const due = plan && plan.isEnabled ? plan.amount : 0;
    const paid = paidForPeriod(db, memberId, period);

    let status = 'exempt';
    if (due > 0) {
      if (paid >= due) status = 'paid';
      else if (paid > 0) status = 'partial';
      else status = 'unpaid';
    } else if (paid > 0) {
      status = 'paid';
    }

    return { period, due, paid, status, outstanding: Math.max(due - paid, 0) };
  });

  const pending = months.filter((m) => m.status === 'unpaid' || m.status === 'partial');
  const plan = currentPlan(db, memberId);

  // Anything paid beyond the current month is an advance.
  const advance = liveEntries(db)
    .filter((e) => e.memberId === memberId && e.direction === 'credit')
    .flatMap((e) => e.allocations || [])
    .filter((a) => a.period > upto)
    .reduce((sum, a) => sum + a.amount, 0);

  return {
    memberId,
    name: member.name,
    fatherName: member.fatherName || '',
    phone: member.phone,
    photoUrl: member.photoUrl || null,
    status: member.status,
    joinedPeriod: member.joinedPeriod,
    monthlyAmount: plan ? plan.amount : 0,
    isEnabled: plan ? plan.isEnabled : false,
    months,
    pendingPeriods: pending.map((m) => m.period),
    pendingCount: pending.length,
    pending: pending.reduce((sum, m) => sum + m.outstanding, 0),
    totalPaid: months.reduce((sum, m) => sum + m.paid, 0) + advance,
    advance: advance,
  };
}

export function duesForEveryone(db, upto = currentPeriod()) {
  return db
    .activeMembers()
    .map((m) => duesForMember(db, m.id, upto))
    .filter(Boolean);
}

/** Everyone with something outstanding, worst first. */
export function pendingMembers(db, upto = currentPeriod()) {
  return duesForEveryone(db, upto)
    .filter((d) => d.pendingCount > 0)
    .sort((a, b) => b.pendingCount - a.pendingCount || b.pending - a.pending)
    .map((d) => {
      const last = db.lastReminderFor(d.memberId);
      return { ...d, lastRemindedAt: last ? last.sentAt : null };
    });
}

/** The paid / not-paid board for one month. */
export function collectionBoard(db, period = currentPeriod()) {
  const rows = duesForEveryone(db, period)
    .map((d) => {
      const month = d.months.find((m) => m.period === period);
      if (!month) return null;
      return {
        memberId: d.memberId,
        name: d.name,
        phone: d.phone,
        due: month.due,
        paid: month.paid,
        status: month.status,
        pendingCount: d.pendingCount,
      };
    })
    .filter(Boolean);

  const expected = rows.reduce((sum, r) => sum + r.due, 0);
  const collected = rows.reduce((sum, r) => sum + Math.min(r.paid, r.due), 0);
  const payable = rows.filter((r) => r.due > 0);

  return {
    period,
    rows,
    expected: expected,
    collected: collected,
    paidCount: payable.filter((r) => r.status === 'paid').length,
    payableCount: payable.length,
  };
}

/**
 * Given an amount, work out which months it should settle. This is what makes
 * the credit form fill its own month selection in: a member who owes Rs 200 a
 * month and hands over Rs 600 gets their three oldest unpaid months ticked.
 */
export function suggestAllocations(db, memberId, amount) {
  const dues = duesForMember(db, memberId);
  if (!dues) return [];

  const out = [];
  let left = amount;

  dues.months
    .filter((m) => m.outstanding > 0)
    .forEach((m) => {
      if (left <= 0) return;
      const take = Math.min(left, m.outstanding);
      out.push({ period: m.period, amount: take });
      left -= take;
    });

  // Anything still in hand rolls forward into future months as an advance.
  let period = currentPeriod();
  const monthly = dues.monthlyAmount;
  let guard = 0;
  while (left > 0 && monthly > 0 && guard < 24) {
    guard += 1;
    period = nextPeriod(period);
    if (out.some((o) => o.period === period)) continue;
    const take = Math.min(left, monthly);
    out.push({ period, amount: take });
    left -= take;
  }

  // If there is no plan to spread it over, put the remainder on this month.
  if (left > 0) {
    const here = out.find((o) => o.period === currentPeriod());
    if (here) here.amount += left;
    else out.push({ period: currentPeriod(), amount: left });
  }

  return out.sort((a, b) => (a.period < b.period ? -1 : 1));
}

function nextPeriod(period) {
  let [y, m] = period.split('-').map(Number);
  m += 1;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}
