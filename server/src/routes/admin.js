/** Admin and master routes. Everything here writes, so everything here is guarded. */

import express from 'express';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { requireAdmin, requireMaster } from '../middleware/auth.js';
import { addMonths, nowIso, slugify } from '../utils.js';
import {
  balance,
  sortedEntries,
  decorate,
  postEntry,
  reverseEntry,
  postAdjustment,
  isLocked,
  monthTotals,
  eventSpend,
  eventExpenses,
} from '../services/ledger.js';
import {
  duesForMember,
  duesForEveryone,
  pendingMembers,
  collectionBoard,
  currentPeriod,
  currentPlan,
  suggestAllocations,
} from '../services/dues.js';

const router = express.Router();

router.use(requireAdmin);

/**
 * Every audit entry carries a category as well as an action. The audit screen
 * builds its filter from the categories that are actually present, so it never
 * offers a filter that would return nothing.
 */
const CATEGORY = {
  'ledger.money-in': 'money-in',
  'ledger.money-out': 'money-out',
  'ledger.collect': 'money-in',
  'ledger.adjust': 'correction',
  'ledger.reverse': 'correction',
  'ledger.edit': 'correction',
  'ledger.relink': 'event',
  'ledger.opening': 'correction',
  'member.create': 'member',
  'member.update': 'member',
  'member.plan': 'member',
  'member.remove': 'member',
  'event.create': 'event',
  'event.update': 'event',
  'event.delete': 'event',
  'event.photos': 'event',
  'joinrequest.approve': 'join-request',
  'joinrequest.reject': 'join-request',
  'reminder.send': 'reminder',
  'admin.create': 'admin',
  'admin.delete': 'admin',
  'settings.update': 'settings',
  'settings.pin.rotate': 'settings',
  'auth.login': 'sign-in',
};

/**
 * Fire and forget: a response should never wait on the audit write, and a
 * failure to log must never lose the thing being logged. The catch is what
 * keeps a rejected promise from taking the process down.
 */
const audit = (req, action, entityType, summary, entityId = null) =>
  req.db
    .addAudit({
      actorAdminId: req.admin.id,
      action,
      category: CATEGORY[action] || 'other',
      entityType,
      entityId,
      summary,
      ip: req.ip,
    })
    .catch((err) => console.error('[rsyc] audit write failed:', err.message));

const bad = (res, message) => res.status(400).json({ error: 'invalid', message });

/**
 * Money is whole rupees, always.
 *
 * A decimal is refused rather than rounded. Rounding would silently turn Rs
 * 200.5 into Rs 201 and nobody would know which one the club actually
 * received — the point of an append-only ledger is that the number on the
 * screen is the number that happened.
 */
function readAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return { error: 'Enter an amount in rupees.' };
  if (!Number.isInteger(n)) return { error: 'Enter whole rupees only, with no paise.' };
  return n;
}

/**
 * Photos arrive as a compressed data URI, already scaled by the browser before
 * it sent them. Anything well over the cap means that compression did not run,
 * so it is refused rather than stored.
 *
 * Member portraits are small squares; event photos are viewed full width in a
 * lightbox, so they get a larger allowance.
 */
const MAX_MEMBER_PHOTO_CHARS = 400_000;
const MAX_EVENT_PHOTO_CHARS = 900_000;

/**
 * A photo is either a URL on the club's own image host, or — when no host is
 * configured — an inline data URI.
 *
 * Only the configured host is accepted. Taking any https URL the client sent
 * would let anyone with an admin session point the site at a picture on someone
 * else's server, which is not something the club should be able to do by
 * accident.
 */
function readImage(value, maxChars) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const url = String(value);

  if (/^https:\/\//i.test(url)) {
    if (!config.imageHosts.length) {
      return { error: 'No image host is configured on the server.' };
    }
    let host;
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      return { error: 'That image address is not valid.' };
    }
    if (!config.imageHosts.includes(host)) {
      return { error: `Images must be hosted on ${config.imageHosts.join(' or ')}.` };
    }
    return url;
  }

  if (!/^data:image\/(jpeg|png|webp);base64,/.test(url)) {
    return { error: 'That photo could not be read. Choose a JPG or PNG.' };
  }
  if (url.length > maxChars) {
    return { error: 'That photo is too large after compression. Try a smaller one.' };
  }
  return url;
}

const readPhoto = (value) => readImage(value, MAX_MEMBER_PHOTO_CHARS);
const readEventPhoto = (value) => readImage(value, MAX_EVENT_PHOTO_CHARS);

// ---------------------------------------------------------------- dashboard
router.get('/dashboard', async (req, res) => {
  const period = currentPeriod();
  const board = collectionBoard(req.db, period);
  const pending = pendingMembers(req.db);

  res.json({
    balance: balance(req.db),
    period,
    month: monthTotals(req.db, period),
    collection: {
      expected: board.expected,
      collected: board.collected,
      paidCount: board.paidCount,
      payableCount: board.payableCount,
    },
    pendingCount: pending.length,
    pending: pending.reduce((s, p) => s + p.pending, 0),
    joinRequestCount: req.db.joinRequests().filter((r) => r.status === 'pending').length,
    memberCount: req.db.activeMembers().length,
    recent: sortedEntries(req.db.entries()).slice(0, 5).map((e) => decorate(req.db, e)),
    me: { id: req.admin.id, name: req.admin.name, role: req.admin.role },
  });
});

// -------------------------------------------------------------- transactions
router.get('/transactions', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const q = req.query.q ? String(req.query.q).toLowerCase() : '';

  let list = sortedEntries(req.db.entries());
  if (q) {
    list = list.filter((e) => {
      const member = e.memberId ? req.db.findMember(e.memberId) : null;
      return [e.reason, e.note, e.payerName, member ? member.name : '', String(e.amount)]
        .filter(Boolean)
        .some((t) => String(t).toLowerCase().includes(q));
    });
  }

  res.json({
    entries: list.slice(offset, offset + limit).map((e) => ({
      ...decorate(req.db, e),
      canEdit: !isLocked(e) && e.createdByAdminId === req.admin.id,
      canReverse:
        isLocked(e) &&
        !e.isReversed &&
        e.kind !== 'opening' &&
        e.kind !== 'reversal' &&
        (req.admin.role === 'master' || e.createdByAdminId === req.admin.id),
    })),
    total: list.length,
    offset,
    limit,
    hasMore: offset + limit < list.length,
    balance: balance(req.db),
  });
});

router.get('/transactions/suggest', async (req, res) => {
  const memberId = String(req.query.memberId || '');
  const amount = Number(req.query.amount) || 0;
  if (!req.db.findMember(memberId)) return res.json({ allocations: [] });
  return res.json({ allocations: suggestAllocations(req.db, memberId, amount) });
});

router.post('/transactions', async (req, res) => {
  const direction = req.body.direction === 'debit' ? 'debit' : 'credit';
  const amount = readAmount(req.body.amount);
  if (amount && amount.error) return bad(res, amount.error);
  if (!amount || amount <= 0) return bad(res, 'Enter an amount greater than zero.');

  // The date may be set on the way in and never again. Not in the future, and
  // never before the opening balance.
  let occurredOn = req.body.occurredOn ? new Date(req.body.occurredOn) : new Date();
  if (Number.isNaN(occurredOn.getTime())) occurredOn = new Date();
  if (occurredOn.getTime() > Date.now()) return bad(res, 'The date cannot be in the future.');

  const opening = req.db.entries().find((e) => e.kind === 'opening');
  if (opening && occurredOn < new Date(opening.occurredOn)) {
    return bad(res, 'The date cannot be before the opening balance.');
  }

  if (direction === 'debit') {
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 10) {
      return bad(res, 'Write a reason of at least 10 characters for money going out.');
    }
    const entry = await postEntry(req.db, {
      direction: 'debit',
      kind: 'expense',
      amount,
      reason,
      takenBy: String(req.body.takenBy || '').trim() || null,
      note: String(req.body.note || '').trim(),
      eventId: req.body.eventId || null,
      occurredOn: occurredOn.toISOString(),
      adminId: req.admin.id,
    });
    audit(req, 'ledger.money-out', 'LedgerEntry', `Rs ${amount} out — ${reason}`, entry.id);
    return res.json({ entry: decorate(req.db, entry), balance: balance(req.db) });
  }

  // credit
  const memberId = req.body.memberId || null;
  const payerName = String(req.body.payerName || '').trim();

  if (!memberId && !payerName) {
    return bad(res, 'Choose a member, or type who gave the money.');
  }
  if (memberId && !req.db.findMember(memberId)) return bad(res, 'That member no longer exists.');

  let allocations = Array.isArray(req.body.allocations) ? req.body.allocations : [];
  allocations = allocations
    .filter((a) => a && a.period && Number(a.amount) > 0)
    .map((a) => ({ period: String(a.period), amount: Math.round(Number(a.amount)) }));

  if (memberId && allocations.length) {
    const allocated = allocations.reduce((s, a) => s + a.amount, 0);
    if (allocated > amount) {
      return bad(res, 'The months selected add up to more than the amount received.');
    }
  }

  const entry = await postEntry(req.db, {
    direction: 'credit',
    kind: memberId ? 'contribution' : 'donation',
    amount,
    memberId,
    payerName: memberId ? null : payerName,
    allocations: memberId ? allocations : [],
    note: String(req.body.note || '').trim(),
    occurredOn: occurredOn.toISOString(),
    adminId: req.admin.id,
  });

  const who = memberId ? req.db.findMember(memberId).name : payerName;
  audit(req, 'ledger.money-in', 'LedgerEntry', `Rs ${amount} in from ${who}`, entry.id);
  return res.json({ entry: decorate(req.db, entry), balance: balance(req.db) });
});

router.patch('/transactions/:id', async (req, res) => {
  const entry = req.db.findEntry(req.params.id);
  if (!entry) return res.status(404).json({ error: 'not_found', message: 'Entry not found.' });
  if (isLocked(entry)) {
    return res.status(409).json({
      error: 'locked',
      message: 'The edit window has passed. Reverse this entry instead.',
    });
  }
  if (entry.createdByAdminId !== req.admin.id) {
    return res.status(403).json({ error: 'forbidden', message: 'You did not record this entry.' });
  }

  const patch = {};
  if (req.body.amount !== undefined) {
    const amount = readAmount(req.body.amount);
    if (amount && amount.error) return bad(res, amount.error);
    if (!amount || amount <= 0) return bad(res, 'Enter a valid amount.');
    patch.amount = amount;
  }
  if (req.body.reason !== undefined) patch.reason = String(req.body.reason).trim();
  if (req.body.note !== undefined) patch.note = String(req.body.note).trim();
  if (req.body.takenBy !== undefined) patch.takenBy = String(req.body.takenBy).trim() || null;
  if (req.body.occurredOn !== undefined) {
    const when = new Date(req.body.occurredOn);
    if (Number.isNaN(when.getTime())) return bad(res, 'That date is not valid.');
    if (when.getTime() > Date.now()) return bad(res, 'The date cannot be in the future.');
    patch.occurredOn = when.toISOString();
  }

  await req.db.updateEntry(entry.id, patch);
  audit(req, 'ledger.edit', 'LedgerEntry', 'Edited an entry inside the edit window', entry.id);
  return res.json({ entry: decorate(req.db, req.db.findEntry(entry.id)), balance: balance(req.db) });
});

/**
 * Link an expense to an event, or unlink it.
 *
 * This touches a locked entry, which the append-only rule normally forbids —
 * but it changes no amount, no direction, no date and no reason. It only says
 * which event the money was for. The balance cannot move, so re-filing an
 * expense is a categorisation, not an edit to the accounts. It is audited all
 * the same.
 */
router.post('/transactions/:id/event', async (req, res) => {
  const entry = req.db.findEntry(req.params.id);
  if (!entry) return res.status(404).json({ error: 'not_found', message: 'Entry not found.' });
  if (entry.direction !== 'debit') {
    return bad(res, 'Only money going out can belong to an event.');
  }

  const eventId = req.body.eventId || null;
  const event = eventId ? req.db.findEvent(eventId) : null;
  if (eventId && !event) return bad(res, 'That event no longer exists.');

  const previous = entry.eventId ? req.db.findEvent(entry.eventId) : null;
  await req.db.updateEntry(entry.id, { eventId });

  audit(
    req,
    'ledger.relink',
    'LedgerEntry',
    event
      ? `Linked an expense of Rs ${entry.amount} to ${event.title}`
      : `Unlinked an expense of Rs ${entry.amount} from ${previous ? previous.title : 'an event'}`,
    entry.id,
  );

  return res.json({ entry: decorate(req.db, req.db.findEntry(entry.id)) });
});

router.post('/transactions/:id/reverse', async (req, res) => {
  const reason = String(req.body.reason || '').trim();
  if (reason.length < 5) return bad(res, 'Write a short reason for the reversal.');

  const entry = req.db.findEntry(req.params.id);
  if (!entry) return res.status(404).json({ error: 'not_found', message: 'Entry not found.' });
  if (req.admin.role !== 'master' && entry.createdByAdminId !== req.admin.id) {
    return res
      .status(403)
      .json({ error: 'forbidden', message: 'Only the master admin can reverse this entry.' });
  }

  const result = await reverseEntry(req.db, req.params.id, reason, req.admin.id);
  if (result.error) return bad(res, result.error);

  audit(req, 'ledger.reverse', 'LedgerEntry', `Reversed an entry: ${reason}`, req.params.id);
  return res.json({ ok: true, balance: balance(req.db) });
});

// ------------------------------------------------------------------ collect
router.get('/collect', async (req, res) => {
  const period = String(req.query.period || currentPeriod());
  res.json(collectionBoard(req.db, period));
});

router.post('/collect', async (req, res) => {
  const period = String(req.body.period || currentPeriod());
  const payments = Array.isArray(req.body.payments) ? req.body.payments : [];
  if (!payments.length) return bad(res, 'Nothing was ticked.');

  const created = [];
  const names = [];
  for (const p of payments) {
    const member = req.db.findMember(p.memberId);
    const amount = readAmount(p.amount);
    if (!member || typeof amount !== 'number' || amount <= 0) continue;

    const entry = await postEntry(req.db, {
      direction: 'credit',
      kind: 'contribution',
      amount,
      memberId: member.id,
      allocations: [{ period, amount }],
      occurredOn: new Date().toISOString(),
      adminId: req.admin.id,
    });
    created.push(decorate(req.db, entry));
    names.push(`${member.name} Rs ${amount}`);
  }

  audit(
    req,
    'ledger.collect',
    'LedgerEntry',
    created.length === 1
      ? `${names[0]} in — contribution for ${period}`
      : `${created.length} contributions collected for ${period}`,
  );

  return res.json({
    ok: true,
    count: created.length,
    entries: created,
    balance: balance(req.db),
    board: collectionBoard(req.db, period),
  });
});

// ------------------------------------------------------------------ members
/**
 * The member list, in the order the club arranged it.
 *
 * This used to lead with whoever was furthest behind. That is useful when
 * chasing dues, but it is not what the board should look like — and the admin
 * screen has a Pending filter for that job. The order here is the one an admin
 * set by dragging, and it is the same order the village sees.
 */
router.get('/members', async (req, res) => {
  const dues = duesForEveryone(req.db).sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name),
  );
  res.json({
    members: dues.map((d) => ({
      id: d.memberId,
      name: d.name,
      fatherName: d.fatherName,
      phone: d.phone,
      photoUrl: d.photoUrl,
      joinedPeriod: d.joinedPeriod,
      monthlyAmount: d.monthlyAmount,
      isEnabled: d.isEnabled,
      pendingCount: d.pendingCount,
      pending: d.pending,
      totalPaid: d.totalPaid,
    })),
    defaultAmount: req.db.settings().defaultAmount,
  });
});

/**
 * Save a new running order after a drag.
 *
 * The whole list of ids is sent, not just the one that moved, because moving
 * one name shifts every name below it. Ids that are not sent keep whatever
 * position they had — a member added on another phone mid-drag is not thrown
 * to the top of the board because this request had never heard of them.
 */
router.put('/members/order', async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : null;
  if (!ids || ids.length === 0) return bad(res, 'Send the members in their new order.');

  const known = ids.filter((id) => req.db.findMember(id));
  if (known.length !== ids.length) return bad(res, 'That list refers to a member who is not in the club.');

  await req.db.reorderMembers(known);
  audit(req, 'member.reorder', 'Member', `Rearranged the member board (${known.length} members)`);

  return res.json({ ok: true, count: known.length });
});

router.get('/members/:id', async (req, res) => {
  const dues = duesForMember(req.db, req.params.id);
  if (!dues) return res.status(404).json({ error: 'not_found', message: 'Member not found.' });

  const entries = sortedEntries(
    req.db.entries().filter((e) => e.memberId === req.params.id),
  ).map((e) => decorate(req.db, e));

  const plans = req.db
    .plansFor(req.params.id)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));

  const last = req.db.lastReminderFor(req.params.id);

  return res.json({ member: dues, entries, plans, lastRemindedAt: last ? last.sentAt : null });
});

router.post('/members', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const fatherName = String(req.body.fatherName || '').trim();
  const phone = String(req.body.phone || '').trim();
  const isEnabled = req.body.isEnabled !== false;
  const amount = readAmount(req.body.amount);
  if (amount && amount.error) return bad(res, amount.error);

  if (name.length < 2) return bad(res, 'Enter the member name.');
  if (fatherName.length < 2) return bad(res, "Enter the father's name.");
  if (!/^[0-9]{10}$/.test(phone)) return bad(res, 'Enter a 10 digit mobile number.');
  if (isEnabled && amount <= 0) return bad(res, 'Enter the monthly amount.');

  const photo = readPhoto(req.body.photoUrl);
  if (photo && photo.error) return bad(res, photo.error);

  const joinedPeriod = String(req.body.joinedPeriod || currentPeriod());

  const member = await req.db.addMember({
    name,
    fatherName,
    phone,
    photoUrl: photo || null,
    joinedOn: new Date(`${joinedPeriod}-01T06:00:00.000Z`).toISOString(),
    joinedPeriod,
    // Joins the bottom of the board. An admin can drag them up if they belong
    // higher; nobody arrives ahead of the people already there.
    sortOrder: req.db.nextMemberOrder(),
    createdByAdminId: req.admin.id,
  });

  await req.db.addPlan({
    memberId: member.id,
    amount: isEnabled ? amount : 0,
    isEnabled,
    effectiveFrom: joinedPeriod,
    createdByAdminId: req.admin.id,
  });

  audit(req, 'member.create', 'Member', `Added member ${name}`, member.id);
  return res.json({ member: duesForMember(req.db, member.id) });
});

router.patch('/members/:id', async (req, res) => {
  const member = req.db.findMember(req.params.id);
  if (!member) return res.status(404).json({ error: 'not_found', message: 'Member not found.' });

  const patch = {};
  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (name.length < 2) return bad(res, 'Enter the member name.');
    patch.name = name;
  }
  if (req.body.fatherName !== undefined) {
    const fatherName = String(req.body.fatherName).trim();
    if (fatherName.length < 2) return bad(res, "Enter the father's name.");
    patch.fatherName = fatherName;
  }
  if (req.body.phone !== undefined) {
    const phone = String(req.body.phone).trim();
    if (!/^[0-9]{10}$/.test(phone)) return bad(res, 'Enter a 10 digit mobile number.');
    patch.phone = phone;
  }
  if (req.body.notes !== undefined) patch.notes = String(req.body.notes).trim();
  if (req.body.status !== undefined && ['active', 'left'].includes(req.body.status)) {
    patch.status = req.body.status;
  }
  const photo = readPhoto(req.body.photoUrl);
  if (photo && photo.error) return bad(res, photo.error);
  if (photo !== undefined) patch.photoUrl = photo;

  await req.db.updateMember(member.id, patch);
  audit(req, 'member.update', 'Member', `Updated ${member.name}`, member.id);
  return res.json({ member: duesForMember(req.db, member.id) });
});

/**
 * Changing the amount, or switching collection on or off.
 *
 * A new plan row is written and the old one is closed off the month before it,
 * so every past month keeps the amount that was actually in force at the time.
 */
router.put('/members/:id/plan', async (req, res) => {
  const member = req.db.findMember(req.params.id);
  if (!member) return res.status(404).json({ error: 'not_found', message: 'Member not found.' });

  // The amount only matters when collection is on. Switching a member off does
  // not need one, and asking for it would block the button.
  const isEnabled = req.body.isEnabled !== false;
  let amount = 0;
  if (isEnabled) {
    const parsed = readAmount(req.body.amount);
    if (parsed && parsed.error) return bad(res, parsed.error);
    if (!parsed || parsed <= 0) return bad(res, 'Enter the monthly amount.');
    amount = parsed;
  }

  const thisMonth = currentPeriod();

  // The row still open at the end of the history — which may be one that has
  // been agreed but does not start until a later month.
  const open = req.db.plansFor(member.id).find((p) => p.effectiveTo === null) || null;
  if (open && open.amount === amount && open.isEnabled === isEnabled) {
    return res.json({
      member: duesForMember(req.db, member.id),
      effectiveFrom: open.effectiveFrom,
      unchanged: true,
    });
  }

  /**
   * When does the new amount start? Next month.
   *
   * The month already under way was announced at the old amount and some
   * members will have paid it. Changing it now would tell a man who paid his
   * ₹200 in good faith that he is ₹100 short, and would charge two members
   * different amounts for the same month depending on which day they happened
   * to pay. Announce it, it starts next month.
   *
   * Unless the row we would be replacing was never actually in force — it
   * starts in a future month, or it starts this month and nothing has been
   * paid against it. Then the admin is correcting a figure, not changing an
   * agreement, so the row is fixed where it stands. Closing it off instead
   * would leave behind a plan that ended before it began.
   */
  const paidThisMonth = (duesForMember(req.db, member.id).months || []).find(
    (mo) => mo.period === thisMonth,
  );
  const notYetInForce =
    open &&
    (open.effectiveFrom > thisMonth ||
      (open.effectiveFrom === thisMonth && (!paidThisMonth || paidThisMonth.paid === 0)));

  const from = notYetInForce ? open.effectiveFrom : addMonths(thisMonth, 1);

  if (notYetInForce) {
    await req.db.updatePlan(open.id, { amount, isEnabled });
  } else {
    await req.db.closePlans(member.id, addMonths(from, -1));
    await req.db.addPlan({
      memberId: member.id,
      amount,
      isEnabled,
      effectiveFrom: from,
      createdByAdminId: req.admin.id,
    });
  }

  audit(
    req,
    'member.plan',
    'ContributionPlan',
    isEnabled
      ? `Set ${member.name} to Rs ${amount} a month from ${from}`
      : `Took ${member.name} off the collection list from ${from}`,
    member.id,
  );
  return res.json({
    member: duesForMember(req.db, member.id),
    effectiveFrom: from,
    // True when the change is agreed now but only takes effect later, so the
    // admin screen can say so rather than appearing not to have saved.
    startsNextMonth: from > thisMonth,
  });
});

/**
 * Removing a member.
 *
 * Their status becomes 'left' and their contribution plan is closed off at last
 * month, so nothing further is ever due from them. Every rupee they paid stays
 * in the ledger exactly where it was and the balance does not move — deleting
 * the row would silently change the club's accounts, which the ledger rules do
 * not allow. They simply stop appearing in the lists.
 */
router.delete('/members/:id', async (req, res) => {
  const member = req.db.findMember(req.params.id);
  if (!member) return res.status(404).json({ error: 'not_found', message: 'Member not found.' });
  if (member.status === 'left') {
    return bad(res, 'That member has already been removed.');
  }

  const from = currentPeriod();
  const [y, m] = from.split('-').map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  await req.db.closePlans(member.id, prev);

  await req.db.updateMember(member.id, { status: 'left' });

  const kept = req.db.entries().filter((e) => e.memberId === member.id).length;
  audit(
    req,
    'member.remove',
    'Member',
    `Removed ${member.name} from the club (${kept} ledger entries kept)`,
    member.id,
  );

  return res.json({ ok: true, entriesKept: kept });
});

// ------------------------------------------------------------------ pending
router.get('/pending', async (req, res) => {
  const s = req.db.settings();
  res.json({
    members: pendingMembers(req.db),
    upiId: s.upiId,
    groupName: s.groupName,
  });
});

router.post('/reminders', async (req, res) => {
  const member = req.db.findMember(req.body.memberId);
  if (!member) return res.status(404).json({ error: 'not_found', message: 'Member not found.' });

  const dues = duesForMember(req.db, member.id);
  const s = req.db.settings();

  const months = dues.pendingPeriods;
  const amountDue = dues.pending;
  const text =
    String(req.body.messageText || '').trim() ||
    `Namaste ${member.name} ji.\n${s.groupName}, ${s.village} - Rs ${amountDue} pending (${months.length} month${months.length === 1 ? '' : 's'}).\nUPI: ${s.upiId}\nDhanyavaad.`;

  await req.db.addReminder({
    memberId: member.id,
    periods: months,
    amount: dues.pending,
    messageText: text,
    sentByAdminId: req.admin.id,
  });

  audit(req, 'reminder.send', 'Reminder', `Reminded ${member.name}`, member.id);

  return res.json({
    ok: true,
    // The client opens this. Free, no Meta approval, no per-message cost.
    whatsappUrl: `https://wa.me/91${member.phone}?text=${encodeURIComponent(text)}`,
    messageText: text,
  });
});

// ------------------------------------------------------------------- events
router.get('/events', async (req, res) => {
  res.json({
    // Tiles show a cover and a count, so the full gallery is left out here —
    // the editor fetches one event in full when it needs the photos. An event
    // with the slideshow on sends a few frames, the same as the public list.
    events: req.db
      .events()
      .sort((a, b) => (a.eventDate < b.eventDate ? 1 : -1))
      .map(({ photos, ...e }) => ({
        ...e,
        photoCount: photos.length,
        slideshow: e.autoSwipe
          ? photos.slice(0, 6).map((p) => ({ id: p.id, url: p.url || null, seed: p.seed || '' }))
          : [],
      })),
  });
});

router.get('/events/:id', async (req, res) => {
  const event = req.db.findEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'not_found', message: 'Event not found.' });
  return res.json({ event, spend: eventSpend(req.db, event.id), expenses: eventExpenses(req.db, event.id) });
});

router.post('/events', async (req, res) => {
  const title = String(req.body.title || '').trim();
  if (title.length < 3) return bad(res, 'Give the event a title.');

  const eventDate = req.body.eventDate ? new Date(req.body.eventDate) : new Date();
  if (Number.isNaN(eventDate.getTime())) return bad(res, 'That date is not valid.');

  let slug = slugify(title);
  if (!slug) slug = `event-${Date.now()}`;
  while (req.db.findEventBySlug(slug)) slug = `${slug}-1`;

  const event = await req.db.addEvent({
    title,
    titleHi: String(req.body.titleHi || '').trim(),
    slug,
    description: String(req.body.description || '').trim(),
    eventDate: eventDate.toISOString(),
    tags: Array.isArray(req.body.tags) ? req.body.tags.slice(0, 6) : [],
    palette: Number(req.body.palette) || 0,
    photos: [],
    isPublished: req.body.isPublished !== false,
    createdByAdminId: req.admin.id,
  });

  audit(req, 'event.create', 'Event', `Created event: ${title}`, event.id);
  return res.json({ event });
});

router.patch('/events/:id', async (req, res) => {
  const event = req.db.findEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'not_found', message: 'Event not found.' });

  const patch = {};
  ['title', 'titleHi', 'description'].forEach((k) => {
    if (req.body[k] !== undefined) patch[k] = String(req.body[k]).trim();
  });
  if (req.body.eventDate !== undefined) {
    const when = new Date(req.body.eventDate);
    if (Number.isNaN(when.getTime())) return bad(res, 'That date is not valid.');
    patch.eventDate = when.toISOString();
  }
  if (Array.isArray(req.body.tags)) patch.tags = req.body.tags.slice(0, 6);
  if (req.body.palette !== undefined) patch.palette = Number(req.body.palette) || 0;
  if (req.body.isPublished !== undefined) patch.isPublished = !!req.body.isPublished;
  if (req.body.autoSwipe !== undefined) patch.autoSwipe = !!req.body.autoSwipe;

  const cover = readEventPhoto(req.body.coverUrl);
  if (cover && cover.error) return bad(res, cover.error);
  if (cover !== undefined) patch.coverUrl = cover;

  await req.db.updateEvent(event.id, patch);
  audit(req, 'event.update', 'Event', `Updated event: ${event.title}`, event.id);
  return res.json({ event: req.db.findEvent(event.id) });
});

const MAX_PHOTOS_PER_EVENT = 24;

/** Add one photo. The client sends them one at a time to keep each body small. */
router.post('/events/:id/photos', async (req, res) => {
  const event = req.db.findEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'not_found', message: 'Event not found.' });

  if (event.photos.length >= MAX_PHOTOS_PER_EVENT) {
    return bad(res, `An event can hold ${MAX_PHOTOS_PER_EVENT} photos. Remove one first.`);
  }

  const image = readEventPhoto(req.body.photoUrl);
  if (image && image.error) return bad(res, image.error);
  if (!image) return bad(res, 'No photo was sent.');

  const photos = [
    ...event.photos,
    {
      id: `${event.id}_p${Date.now().toString(36)}${event.photos.length}`,
      url: image,
      seed: '',
      caption: String(req.body.caption || '').trim(),
      order: event.photos.length,
    },
  ];

  await req.db.updateEvent(event.id, { photos });
  audit(req, 'event.photos', 'Event', `Added a photo to ${event.title}`, event.id);
  return res.json({ event: req.db.findEvent(event.id) });
});

/** Replace the image on one photo, or edit its caption. */
router.patch('/events/:id/photos/:photoId', async (req, res) => {
  const event = req.db.findEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'not_found', message: 'Event not found.' });

  const target = event.photos.find((p) => p.id === req.params.photoId);
  if (!target) return res.status(404).json({ error: 'not_found', message: 'Photo not found.' });

  const image = readEventPhoto(req.body.photoUrl);
  if (image && image.error) return bad(res, image.error);

  const photos = event.photos.map((p) =>
    p.id !== target.id
      ? p
      : {
          ...p,
          // Swapping in a real photo retires the generated artwork behind it.
          url: image !== undefined ? image : p.url,
          seed: image ? '' : p.seed,
          caption: req.body.caption !== undefined ? String(req.body.caption).trim() : p.caption,
        },
  );

  await req.db.updateEvent(event.id, { photos });
  audit(req, 'event.photos', 'Event', `Updated a photo on ${event.title}`, event.id);
  return res.json({ event: req.db.findEvent(event.id) });
});

router.delete('/events/:id/photos/:photoId', async (req, res) => {
  const event = req.db.findEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'not_found', message: 'Event not found.' });

  const photos = event.photos
    .filter((p) => p.id !== req.params.photoId)
    .map((p, i) => ({ ...p, order: i }));

  await req.db.updateEvent(event.id, { photos });
  audit(req, 'event.photos', 'Event', `Removed a photo from ${event.title}`, event.id);
  return res.json({ event: req.db.findEvent(event.id) });
});

router.delete('/events/:id', async (req, res) => {
  const event = req.db.findEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'not_found', message: 'Event not found.' });
  await req.db.removeEvent(event.id);
  audit(req, 'event.delete', 'Event', `Deleted event: ${event.title}`, event.id);
  return res.json({ ok: true });
});

// ------------------------------------------------------------ join requests
router.get('/join-requests', async (req, res) => {
  res.json({
    requests: req.db
      .joinRequests()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((r) => ({
        ...r,
        existingMember: req.db.members().some((m) => m.phone === r.phone),
      })),
  });
});

router.post('/join-requests/:id/approve', async (req, res) => {
  const request = req.db.findJoinRequest(req.params.id);
  if (!request) return res.status(404).json({ error: 'not_found', message: 'Request not found.' });

  request.status = 'approved';
  request.reviewedByAdminId = req.admin.id;
  request.reviewedAt = nowIso();

  audit(req, 'joinrequest.approve', 'JoinRequest', `Approved ${request.name}`, request.id);
  return res.json({
    ok: true,
    prefill: {
      name: request.name,
      fatherName: request.fatherName || '',
      phone: request.phone,
    },
  });
});

router.post('/join-requests/:id/reject', async (req, res) => {
  const request = req.db.findJoinRequest(req.params.id);
  if (!request) return res.status(404).json({ error: 'not_found', message: 'Request not found.' });

  request.status = 'rejected';
  request.reviewedByAdminId = req.admin.id;
  request.reviewedAt = nowIso();
  request.rejectionReason = String(req.body.reason || '').trim() || null;

  audit(req, 'joinrequest.reject', 'JoinRequest', `Rejected ${request.name}`, request.id);
  return res.json({ ok: true });
});

// =========================================================== master only ===

router.post('/adjustments', requireMaster, async (req, res) => {
  const target = readAmount(req.body.target);
  const reason = String(req.body.reason || '').trim();

  if (target && target.error) return bad(res, target.error);
  if (typeof target !== 'number' || target < 0) return bad(res, 'Enter the true balance.');
  if (reason.length < 10) return bad(res, 'Write a reason of at least 10 characters.');

  const result = await postAdjustment(req.db, target, reason, req.admin.id);
  if (result.error) return bad(res, result.error);

  audit(
    req,
    'ledger.adjust',
    'LedgerEntry',
    `Balance corrected by Rs ${result.delta}: ${reason}`,
    result.entry.id,
  );
  return res.json({ ...result, entry: decorate(req.db, result.entry), balance: balance(req.db) });
});

router.get('/adjustments', requireMaster, async (req, res) => {
  res.json({
    entries: sortedEntries(req.db.entries().filter((e) => e.kind === 'adjustment')).map((e) => decorate(req.db, e)),
    balance: balance(req.db),
  });
});

router.get('/pin', requireMaster, async (req, res) => {
  const s = req.db.settings();
  const admin = s.pinUpdatedByAdminId ? req.db.findAdmin(s.pinUpdatedByAdminId) : null;
  res.json({
    pinVersion: s.pinVersion,
    pinUpdatedAt: s.pinUpdatedAt,
    pinUpdatedBy: admin ? admin.name : null,
    viewerSessionDays: s.viewerSessionDays,
    failedAttempts: req.db
      .auditLogs()
      .filter((l) => l.action === 'access.unlock.failed')
      .slice(0, 30),
  });
});

/**
 * Setting a new PIN bumps pinVersion, and every viewer cookie in the village
 * carries the old number. They all stop working at the same instant.
 */
router.put('/pin', requireMaster, async (req, res) => {
  const pin = String(req.body.pin || '').trim();
  if (pin.length < 6) return bad(res, 'The PIN must be at least 6 characters. Two or three words is better than four digits.');

  const s = req.db.settings();
  await req.db.updateSettings({
    pinHash: await bcrypt.hash(pin, 10),
    pinVersion: s.pinVersion + 1,
    pinUpdatedAt: nowIso(),
    pinUpdatedByAdminId: req.admin.id,
  });

  audit(req, 'settings.pin.rotate', 'Settings', 'Group PIN changed. All viewer sessions ended.');
  return res.json({ ok: true, pinVersion: req.db.settings().pinVersion });
});

router.get('/admins', requireMaster, async (req, res) => {
  res.json({
    admins: req.db.admins().map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone,
      role: a.role,
      isActive: a.isActive,
      lastLoginAt: a.lastLoginAt,
      canRemove: a.role !== 'master',
    })),
  });
});

router.post('/admins', requireMaster, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '');

  if (name.length < 2) return bad(res, 'Enter the name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad(res, 'Enter a valid email address.');
  if (password.length < 8) return bad(res, 'The password must be at least 8 characters.');
  if (req.db.findAdminByEmail(email)) return bad(res, 'An admin with that email already exists.');

  const admin = await req.db.addAdmin({
    name,
    email,
    phone,
    role: 'admin',
    isActive: true,
    passwordHash: await bcrypt.hash(password, 10),
    createdByAdminId: req.admin.id,
  });

  audit(req, 'admin.create', 'Admin', `Added admin ${name}`, admin.id);
  return res.json({ ok: true });
});

router.delete('/admins/:id', requireMaster, async (req, res) => {
  const target = req.db.findAdmin(req.params.id);
  if (!target) return res.status(404).json({ error: 'not_found', message: 'Admin not found.' });
  if (target.role === 'master') {
    return res
      .status(403)
      .json({ error: 'forbidden', message: 'The master admin can never be removed.' });
  }

  await req.db.removeAdmin(target.id);
  audit(req, 'admin.delete', 'Admin', `Removed admin ${target.name}`, target.id);
  return res.json({ ok: true });
});

router.get('/audit', requireMaster, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json({
    logs: req.db
      .auditLogs()
      .slice(0, limit)
      .map((l) => {
        const actor = l.actorAdminId ? req.db.findAdmin(l.actorAdminId) : null;
        return { ...l, actorName: actor ? actor.name : 'Anonymous' };
      }),
  });
});

router.get('/settings', requireMaster, async (req, res) => {
  const { pinHash, ...safe } = req.db.settings();
  res.json({ settings: safe });
});

router.put('/settings', requireMaster, async (req, res) => {
  const patch = {};
  [
    'groupName',
    'groupNameHi',
    'village',
    'villageHi',
    'tagline',
    'about',
    'aboutHi',
    'bankAccountLabel',
    'upiId',
    'paymentPhone',
    'whatsappGroupUrl',
    'contactPhone',
    'notice',
    'purpose',
    'purposeHi',
    'founderName',
    'founderNameHi',
    'founderYears',
    'founderPhotoUrl',
    'founderAbout',
    'founderAboutHi',
  ].forEach((k) => {
    if (req.body[k] !== undefined) patch[k] = String(req.body[k]);
  });

  ['rules', 'purposePoints', 'purposePointsHi', 'founderContribution', 'founderContributionHi'].forEach(
    (k) => {
      if (Array.isArray(req.body[k])) patch[k] = req.body[k].filter(Boolean);
    },
  );
  if (req.body.showPaidBoard !== undefined) patch.showPaidBoard = !!req.body.showPaidBoard;
  if (req.body.defaultAmount !== undefined) {
    const amount = readAmount(req.body.defaultAmount);
    if (typeof amount === 'number' && amount >= 0) patch.defaultAmount = amount;
  }
  if (req.body.viewerSessionDays !== undefined) {
    const days = Math.round(Number(req.body.viewerSessionDays));
    if (Number.isFinite(days) && days >= 1 && days <= 365) patch.viewerSessionDays = days;
  }

  await req.db.updateSettings(patch);
  audit(req, 'settings.update', 'Settings', 'Club settings updated');

  const { pinHash, ...safe } = req.db.settings();
  return res.json({ settings: safe });
});

/** One-time opening balance. Only available while the ledger is empty. */
router.post('/opening-balance', requireMaster, async (req, res) => {
  if (req.db.entries().some((e) => e.kind === 'opening')) {
    return res
      .status(409)
      .json({ error: 'exists', message: 'The opening balance has already been set.' });
  }
  const amount = readAmount(req.body.amount);
  if (amount && amount.error) return bad(res, amount.error);
  if (!amount || amount <= 0) return bad(res, 'Enter the amount currently in the register.');

  const occurredOn = req.body.occurredOn ? new Date(req.body.occurredOn) : new Date();
  const entry = await postEntry(req.db, {
    direction: 'credit',
    kind: 'opening',
    amount,
    note: String(req.body.note || 'Balance carried over from the club register'),
    occurredOn: occurredOn.toISOString(),
    adminId: req.admin.id,
  });

  audit(req, 'ledger.opening', 'LedgerEntry', `Opening balance set to Rs ${amount}`, entry.id);
  return res.json({ entry: decorate(req.db, entry), balance: balance(req.db) });
});

export default router;
