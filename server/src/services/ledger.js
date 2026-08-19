/**
 * The ledger.
 *
 * Two rules hold this whole application together:
 *
 *   1. The balance is a SUM over the entries. It is never stored, never
 *      incremented, never written to. Fix an entry and the balance fixes
 *      itself.
 *   2. Entries are append-only once locked. A mistake is corrected by posting
 *      a reversal that points back at the original, never by editing history.
 */

import { store } from '../store.js';
import { config } from '../config.js';
import { nowIso } from '../utils.js';

/**
 * Everything ever recorded, including reversed entries and the reversals that
 * cancel them.
 *
 * The balance sums over ALL of these. A reversed entry keeps its original
 * effect and the matching opposite entry undoes it, so the pair nets to zero —
 * that is what makes the ledger append-only rather than editable. Excluding the
 * original *and* counting the reversal would subtract the amount twice.
 */
export function allEntries() {
  return store.entries();
}

/**
 * Entries that still stand. Used where a reversed entry should stop counting
 * as a fact about the world — a reversed contribution is not a paid month, and
 * a reversed expense is not money the club spent on an event.
 */
export function liveEntries() {
  return store.entries().filter((e) => !e.isReversed);
}

export function balancePaise() {
  return allEntries().reduce(
    (sum, e) => sum + (e.direction === 'credit' ? e.amountPaise : -e.amountPaise),
    0,
  );
}

/** Newest first, by the date the money moved, then by when it was recorded. */
export function sortedEntries(list) {
  return [...list].sort((a, b) => {
    if (a.occurredOn === b.occurredOn) return a.createdAt < b.createdAt ? 1 : -1;
    return a.occurredOn < b.occurredOn ? 1 : -1;
  });
}

export function isLocked(entry) {
  return new Date(entry.lockedAt).getTime() <= Date.now();
}

export function lockAtFor(createdAtIso) {
  return new Date(
    new Date(createdAtIso).getTime() + config.entryEditWindowMinutes * 60 * 1000,
  ).toISOString();
}

/** Attaches the names a client needs so the feed never has to look things up. */
export function decorate(entry) {
  const member = entry.memberId ? store.findMember(entry.memberId) : null;
  const admin = store.findAdmin(entry.createdByAdminId);
  const event = entry.eventId ? store.findEvent(entry.eventId) : null;
  return {
    ...entry,
    memberName: member ? member.name : null,
    payer: member ? member.name : entry.payerName,
    recordedBy: admin ? admin.name : 'Unknown',
    eventTitle: event ? event.title : null,
    eventSlug: event ? event.slug : null,
    locked: isLocked(entry),
  };
}

/**
 * Month totals for the summary strip. Sums over every entry, matching the
 * balance: a correction made this month shows up in this month's figures, not
 * quietly rewritten into the month it corrects.
 */
export function monthTotals(period) {
  let credit = 0;
  let debit = 0;
  allEntries().forEach((e) => {
    if (!e.occurredOn.startsWith(period)) return;
    if (e.direction === 'credit') credit += e.amountPaise;
    else debit += e.amountPaise;
  });
  return { creditPaise: credit, debitPaise: debit, netPaise: credit - debit };
}

/** Total spent against one event, for the event detail page. */
export function eventSpendPaise(eventId) {
  return liveEntries()
    .filter((e) => e.eventId === eventId && e.direction === 'debit')
    .reduce((sum, e) => sum + e.amountPaise, 0);
}

export function eventExpenses(eventId) {
  return sortedEntries(
    liveEntries().filter((e) => e.eventId === eventId && e.direction === 'debit'),
  ).map(decorate);
}

/**
 * Posts a new entry. Everything that writes to the ledger comes through here,
 * including the opening balance, adjustments and reversals, so there is exactly
 * one place where a row can be created.
 */
export function postEntry({
  direction,
  kind,
  amountPaise,
  memberId = null,
  payerName = null,
  allocations = [],
  reason = null,
  takenBy = null,
  note = '',
  eventId = null,
  occurredOn = null,
  reversesEntryId = null,
  reversalReason = null,
  adminId,
}) {
  const createdAt = nowIso();
  return store.addEntry({
    direction,
    kind,
    amountPaise,
    memberId,
    payerName,
    allocations,
    reason,
    takenBy,
    note,
    eventId,
    occurredOn: occurredOn || createdAt,
    createdAt,
    lockedAt: lockAtFor(createdAt),
    isReversed: false,
    reversesEntryId,
    reversalReason,
    createdByAdminId: adminId,
  });
}

/**
 * Reverses a locked entry. The original stays in the feed, struck through and
 * tagged, and a matching opposite entry cancels it out.
 */
export function reverseEntry(entryId, reason, adminId) {
  const original = store.findEntry(entryId);
  if (!original) return { error: 'That entry no longer exists.' };
  if (original.isReversed) return { error: 'That entry has already been reversed.' };
  if (original.kind === 'opening') return { error: 'The opening balance cannot be reversed.' };

  store.updateEntry(entryId, { isReversed: true, reversalReason: reason });

  const reversal = postEntry({
    direction: original.direction === 'credit' ? 'debit' : 'credit',
    kind: 'reversal',
    amountPaise: original.amountPaise,
    memberId: original.memberId,
    reason: `Reversal - ${reason}`,
    reversesEntryId: original.id,
    reversalReason: reason,
    adminId,
  });

  return { original, reversal };
}

/**
 * Balance correction. There is no "set the balance to X" write anywhere in this
 * codebase. The master admin states what the balance should be, and the system
 * posts an ordinary, visible entry for the difference.
 */
export function postAdjustment(targetPaise, reason, adminId) {
  const current = balancePaise();
  const delta = targetPaise - current;
  if (delta === 0) return { error: 'That is already the balance. Nothing to correct.' };

  const entry = postEntry({
    direction: delta > 0 ? 'credit' : 'debit',
    kind: 'adjustment',
    amountPaise: Math.abs(delta),
    reason,
    adminId,
  });

  return { entry, deltaPaise: delta, previousPaise: current, newPaise: targetPaise };
}
