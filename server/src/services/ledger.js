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
 *
 * Everything here works on `db` — the per-request snapshot — rather than
 * querying as it goes. Reads are plain arithmetic over arrays. Only the three
 * functions that create entries touch the database, and those are async.
 */

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
export function allEntries(db) {
  return db.entries();
}

/**
 * Entries that still stand. Used where a reversed entry should stop counting
 * as a fact about the world — a reversed contribution is not a paid month, and
 * a reversed expense is not money the club spent on an event.
 */
export function liveEntries(db) {
  return db.entries().filter((e) => !e.isReversed);
}

export function balance(db) {
  return allEntries(db).reduce(
    (sum, e) => sum + (e.direction === 'credit' ? e.amount : -e.amount),
    0,
  );
}

/* --- these need no data, only the entry in front of them ------------------ */

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

/* -------------------------------------------------------------------------- */

/** Attaches the names a client needs so the feed never has to look things up. */
export function decorate(db, entry) {
  const member = entry.memberId ? db.findMember(entry.memberId) : null;
  const admin = db.findAdmin(entry.createdByAdminId);
  const event = entry.eventId ? db.findEvent(entry.eventId) : null;
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
export function monthTotals(db, period) {
  let credit = 0;
  let debit = 0;
  allEntries(db).forEach((e) => {
    if (!String(e.occurredOn).startsWith(period)) return;
    if (e.direction === 'credit') credit += e.amount;
    else debit += e.amount;
  });
  return { credit, debit, net: credit - debit };
}

/** Total spent against one event, for the event detail page. */
export function eventSpend(db, eventId) {
  return liveEntries(db)
    .filter((e) => e.eventId === eventId && e.direction === 'debit')
    .reduce((sum, e) => sum + e.amount, 0);
}

export function eventExpenses(db, eventId) {
  return sortedEntries(
    liveEntries(db).filter((e) => e.eventId === eventId && e.direction === 'debit'),
  ).map((e) => decorate(db, e));
}

/**
 * Posts a new entry. Everything that writes to the ledger comes through here,
 * including the opening balance, adjustments and reversals, so there is exactly
 * one place where a row can be created.
 */
export async function postEntry(
  db,
  {
    direction,
    kind,
    amount,
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
  },
) {
  const createdAt = nowIso();
  return db.addEntry({
    direction,
    kind,
    amount,
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
export async function reverseEntry(db, entryId, reason, adminId) {
  const original = db.findEntry(entryId);
  if (!original) return { error: 'That entry no longer exists.' };
  if (original.isReversed) return { error: 'That entry has already been reversed.' };
  if (original.kind === 'opening') return { error: 'The opening balance cannot be reversed.' };

  await db.updateEntry(entryId, { isReversed: true, reversalReason: reason });

  const reversal = await postEntry(db, {
    direction: original.direction === 'credit' ? 'debit' : 'credit',
    kind: 'reversal',
    amount: original.amount,
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
export async function postAdjustment(db, target, reason, adminId) {
  const current = balance(db);
  const delta = target - current;
  if (delta === 0) return { error: 'That is already the balance. Nothing to correct.' };

  const entry = await postEntry(db, {
    direction: delta > 0 ? 'credit' : 'debit',
    kind: 'adjustment',
    amount: Math.abs(delta),
    reason,
    adminId,
  });

  return { entry, delta, previousBalance: current, newBalance: target };
}
