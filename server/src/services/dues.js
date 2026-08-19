/**
 * Who has paid, who has not, and how far behind they are.
 *
 * Nothing is stored. There is no cron job creating a row per member per month.
 * For each member we walk the months from when they joined to now, look up the
 * contribution plan that was in force for that month, and compare it against
 * what they actually paid for it. A backdated payment therefore corrects itself
 * instead of leaving a stale row behind.
 */

import { store } from '../store.js';
import { periodOf, periodRange } from '../utils.js';
import { liveEntries } from './ledger.js';

export function currentPeriod() {
  return periodOf(new Date());
}

/** The plan in force for a member in a given month, or null if none was. */
export function planFor(memberId, period) {
  const plans = store
    .plansFor(memberId)
    .filter((p) => p.effectiveFrom <= period && (p.effectiveTo === null || p.effectiveTo >= period))
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));
  return plans[0] || null;
}

/** The plan in force right now. Used by the admin screens. */
export function currentPlan(memberId) {
  return planFor(memberId, currentPeriod());
}

/** What a member actually paid towards one month, across every entry. */
function paidForPeriod(memberId, period) {
  return liveEntries()
    .filter((e) => e.memberId === memberId && e.direction === 'credit')
    .reduce((sum, e) => {
      const hit = (e.allocations || []).filter((a) => a.period === period);
      return sum + hit.reduce((s, a) => s + a.amountPaise, 0);
    }, 0);
}

/**
 * The full month-by-month picture for one member.
 * Months where collection was switched off are included, marked 'exempt', so
 * the history stays honest rather than silently disappearing.
 */
export function duesForMember(memberId, upto = currentPeriod()) {
  const member = store.findMember(memberId);
  if (!member) return null;

  const periods = periodRange(member.joinedPeriod, upto);
  const months = periods.map((period) => {
    const plan = planFor(memberId, period);
    const duePaise = plan && plan.isEnabled ? plan.amountPaise : 0;
    const paidPaise = paidForPeriod(memberId, period);

    let status = 'exempt';
    if (duePaise > 0) {
      if (paidPaise >= duePaise) status = 'paid';
      else if (paidPaise > 0) status = 'partial';
      else status = 'unpaid';
    } else if (paidPaise > 0) {
      status = 'paid';
    }

    return { period, duePaise, paidPaise, status, outstandingPaise: Math.max(duePaise - paidPaise, 0) };
  });

  const pending = months.filter((m) => m.status === 'unpaid' || m.status === 'partial');
  const plan = currentPlan(memberId);

  // Anything paid beyond the current month is an advance.
  const advance = liveEntries()
    .filter((e) => e.memberId === memberId && e.direction === 'credit')
    .flatMap((e) => e.allocations || [])
    .filter((a) => a.period > upto)
    .reduce((sum, a) => sum + a.amountPaise, 0);

  return {
    memberId,
    name: member.name,
    phone: member.phone,
    status: member.status,
    joinedPeriod: member.joinedPeriod,
    monthlyAmountPaise: plan ? plan.amountPaise : 0,
    isEnabled: plan ? plan.isEnabled : false,
    months,
    pendingPeriods: pending.map((m) => m.period),
    pendingCount: pending.length,
    pendingPaise: pending.reduce((sum, m) => sum + m.outstandingPaise, 0),
    totalPaidPaise: months.reduce((sum, m) => sum + m.paidPaise, 0) + advance,
    advancePaise: advance,
  };
}

export function duesForEveryone(upto = currentPeriod()) {
  return store
    .activeMembers()
    .map((m) => duesForMember(m.id, upto))
    .filter(Boolean);
}

/** Everyone with something outstanding, worst first. */
export function pendingMembers(upto = currentPeriod()) {
  return duesForEveryone(upto)
    .filter((d) => d.pendingCount > 0)
    .sort((a, b) => b.pendingCount - a.pendingCount || b.pendingPaise - a.pendingPaise)
    .map((d) => {
      const last = store.lastReminderFor(d.memberId);
      return { ...d, lastRemindedAt: last ? last.sentAt : null };
    });
}

/** The paid / not-paid board for one month. */
export function collectionBoard(period = currentPeriod()) {
  const rows = duesForEveryone(period)
    .map((d) => {
      const month = d.months.find((m) => m.period === period);
      if (!month) return null;
      return {
        memberId: d.memberId,
        name: d.name,
        phone: d.phone,
        duePaise: month.duePaise,
        paidPaise: month.paidPaise,
        status: month.status,
        pendingCount: d.pendingCount,
      };
    })
    .filter(Boolean);

  const expected = rows.reduce((sum, r) => sum + r.duePaise, 0);
  const collected = rows.reduce((sum, r) => sum + Math.min(r.paidPaise, r.duePaise), 0);
  const payable = rows.filter((r) => r.duePaise > 0);

  return {
    period,
    rows,
    expectedPaise: expected,
    collectedPaise: collected,
    paidCount: payable.filter((r) => r.status === 'paid').length,
    payableCount: payable.length,
  };
}

/**
 * Given an amount, work out which months it should settle. This is what makes
 * the credit form fill its own month selection in: a member who owes Rs 200 a
 * month and hands over Rs 600 gets their three oldest unpaid months ticked.
 */
export function suggestAllocations(memberId, amountPaise) {
  const dues = duesForMember(memberId);
  if (!dues) return [];

  const out = [];
  let left = amountPaise;

  dues.months
    .filter((m) => m.outstandingPaise > 0)
    .forEach((m) => {
      if (left <= 0) return;
      const take = Math.min(left, m.outstandingPaise);
      out.push({ period: m.period, amountPaise: take });
      left -= take;
    });

  // Anything still in hand rolls forward into future months as an advance.
  let period = currentPeriod();
  const monthly = dues.monthlyAmountPaise;
  let guard = 0;
  while (left > 0 && monthly > 0 && guard < 24) {
    guard += 1;
    period = nextPeriod(period);
    if (out.some((o) => o.period === period)) continue;
    const take = Math.min(left, monthly);
    out.push({ period, amountPaise: take });
    left -= take;
  }

  // If there is no plan to spread it over, put the remainder on this month.
  if (left > 0) {
    const here = out.find((o) => o.period === currentPeriod());
    if (here) here.amountPaise += left;
    else out.push({ period: currentPeriod(), amountPaise: left });
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
