/** Admin and master routes. Everything here writes, so everything here is guarded. */

import express from 'express';
import bcrypt from 'bcryptjs';
import { store } from '../store.js';
import { requireAdmin, requireMaster } from '../middleware/auth.js';
import { nowIso, slugify } from '../utils.js';
import {
  balancePaise,
  sortedEntries,
  decorate,
  postEntry,
  reverseEntry,
  postAdjustment,
  isLocked,
  monthTotals,
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
  'ledger.opening': 'correction',
  'member.create': 'member',
  'member.update': 'member',
  'member.plan': 'member',
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

const audit = (req, action, entityType, summary, entityId = null) =>
  store.addAudit({
    actorAdminId: req.admin.id,
    action,
    category: CATEGORY[action] || 'other',
    entityType,
    entityId,
    summary,
    ip: req.ip,
  });

const bad = (res, message) => res.status(400).json({ error: 'invalid', message });

// ---------------------------------------------------------------- dashboard
router.get('/dashboard', (req, res) => {
  const period = currentPeriod();
  const board = collectionBoard(period);
  const pending = pendingMembers();

  res.json({
    balancePaise: balancePaise(),
    period,
    month: monthTotals(period),
    collection: {
      expectedPaise: board.expectedPaise,
      collectedPaise: board.collectedPaise,
      paidCount: board.paidCount,
      payableCount: board.payableCount,
    },
    pendingCount: pending.length,
    pendingPaise: pending.reduce((s, p) => s + p.pendingPaise, 0),
    joinRequestCount: store.joinRequests().filter((r) => r.status === 'pending').length,
    memberCount: store.activeMembers().length,
    recent: sortedEntries(store.entries()).slice(0, 5).map(decorate),
    me: { id: req.admin.id, name: req.admin.name, role: req.admin.role },
  });
});

// -------------------------------------------------------------- transactions
router.get('/transactions', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const q = req.query.q ? String(req.query.q).toLowerCase() : '';

  let list = sortedEntries(store.entries());
  if (q) {
    list = list.filter((e) => {
      const member = e.memberId ? store.findMember(e.memberId) : null;
      return [e.reason, e.note, e.payerName, member ? member.name : '', String(e.amountPaise / 100)]
        .filter(Boolean)
        .some((t) => String(t).toLowerCase().includes(q));
    });
  }

  res.json({
    entries: list.slice(offset, offset + limit).map((e) => ({
      ...decorate(e),
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
    balancePaise: balancePaise(),
  });
});

router.get('/transactions/suggest', (req, res) => {
  const memberId = String(req.query.memberId || '');
  const amountPaise = Number(req.query.amountPaise) || 0;
  if (!store.findMember(memberId)) return res.json({ allocations: [] });
  return res.json({ allocations: suggestAllocations(memberId, amountPaise) });
});

router.post('/transactions', (req, res) => {
  const direction = req.body.direction === 'debit' ? 'debit' : 'credit';
  const amountPaise = Math.round(Number(req.body.amountPaise) || 0);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    return bad(res, 'Enter an amount greater than zero.');
  }

  // The date may be set on the way in and never again. Not in the future, and
  // never before the opening balance.
  let occurredOn = req.body.occurredOn ? new Date(req.body.occurredOn) : new Date();
  if (Number.isNaN(occurredOn.getTime())) occurredOn = new Date();
  if (occurredOn.getTime() > Date.now()) return bad(res, 'The date cannot be in the future.');

  const opening = store.entries().find((e) => e.kind === 'opening');
  if (opening && occurredOn < new Date(opening.occurredOn)) {
    return bad(res, 'The date cannot be before the opening balance.');
  }

  if (direction === 'debit') {
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 10) {
      return bad(res, 'Write a reason of at least 10 characters for money going out.');
    }
    const entry = postEntry({
      direction: 'debit',
      kind: 'expense',
      amountPaise,
      reason,
      takenBy: String(req.body.takenBy || '').trim() || null,
      note: String(req.body.note || '').trim(),
      eventId: req.body.eventId || null,
      occurredOn: occurredOn.toISOString(),
      adminId: req.admin.id,
    });
    audit(req, 'ledger.money-out', 'LedgerEntry', `Rs ${amountPaise / 100} out — ${reason}`, entry.id);
    return res.json({ entry: decorate(entry), balancePaise: balancePaise() });
  }

  // credit
  const memberId = req.body.memberId || null;
  const payerName = String(req.body.payerName || '').trim();

  if (!memberId && !payerName) {
    return bad(res, 'Choose a member, or type who gave the money.');
  }
  if (memberId && !store.findMember(memberId)) return bad(res, 'That member no longer exists.');

  let allocations = Array.isArray(req.body.allocations) ? req.body.allocations : [];
  allocations = allocations
    .filter((a) => a && a.period && Number(a.amountPaise) > 0)
    .map((a) => ({ period: String(a.period), amountPaise: Math.round(Number(a.amountPaise)) }));

  if (memberId && allocations.length) {
    const allocated = allocations.reduce((s, a) => s + a.amountPaise, 0);
    if (allocated > amountPaise) {
      return bad(res, 'The months selected add up to more than the amount received.');
    }
  }

  const entry = postEntry({
    direction: 'credit',
    kind: memberId ? 'contribution' : 'donation',
    amountPaise,
    memberId,
    payerName: memberId ? null : payerName,
    allocations: memberId ? allocations : [],
    note: String(req.body.note || '').trim(),
    occurredOn: occurredOn.toISOString(),
    adminId: req.admin.id,
  });

  const who = memberId ? store.findMember(memberId).name : payerName;
  audit(req, 'ledger.money-in', 'LedgerEntry', `Rs ${amountPaise / 100} in from ${who}`, entry.id);
  return res.json({ entry: decorate(entry), balancePaise: balancePaise() });
});

router.patch('/transactions/:id', (req, res) => {
  const entry = store.findEntry(req.params.id);
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
  if (req.body.amountPaise !== undefined) {
    const amount = Math.round(Number(req.body.amountPaise));
    if (!Number.isFinite(amount) || amount <= 0) return bad(res, 'Enter a valid amount.');
    patch.amountPaise = amount;
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

  store.updateEntry(entry.id, patch);
  audit(req, 'ledger.edit', 'LedgerEntry', 'Edited an entry inside the edit window', entry.id);
  return res.json({ entry: decorate(store.findEntry(entry.id)), balancePaise: balancePaise() });
});

router.post('/transactions/:id/reverse', (req, res) => {
  const reason = String(req.body.reason || '').trim();
  if (reason.length < 5) return bad(res, 'Write a short reason for the reversal.');

  const entry = store.findEntry(req.params.id);
  if (!entry) return res.status(404).json({ error: 'not_found', message: 'Entry not found.' });
  if (req.admin.role !== 'master' && entry.createdByAdminId !== req.admin.id) {
    return res
      .status(403)
      .json({ error: 'forbidden', message: 'Only the master admin can reverse this entry.' });
  }

  const result = reverseEntry(req.params.id, reason, req.admin.id);
  if (result.error) return bad(res, result.error);

  audit(req, 'ledger.reverse', 'LedgerEntry', `Reversed an entry: ${reason}`, req.params.id);
  return res.json({ ok: true, balancePaise: balancePaise() });
});

// ------------------------------------------------------------------ collect
router.get('/collect', (req, res) => {
  const period = String(req.query.period || currentPeriod());
  res.json(collectionBoard(period));
});

router.post('/collect', (req, res) => {
  const period = String(req.body.period || currentPeriod());
  const payments = Array.isArray(req.body.payments) ? req.body.payments : [];
  if (!payments.length) return bad(res, 'Nothing was ticked.');

  const created = [];
  const names = [];
  for (const p of payments) {
    const member = store.findMember(p.memberId);
    const amountPaise = Math.round(Number(p.amountPaise) || 0);
    if (!member || amountPaise <= 0) continue;

    const entry = postEntry({
      direction: 'credit',
      kind: 'contribution',
      amountPaise,
      memberId: member.id,
      allocations: [{ period, amountPaise }],
      occurredOn: new Date().toISOString(),
      adminId: req.admin.id,
    });
    created.push(decorate(entry));
    names.push(`${member.name} Rs ${amountPaise / 100}`);
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
    balancePaise: balancePaise(),
    board: collectionBoard(period),
  });
});

// ------------------------------------------------------------------ members
router.get('/members', (_req, res) => {
  const dues = duesForEveryone().sort((a, b) => b.pendingCount - a.pendingCount || a.name.localeCompare(b.name));
  res.json({
    members: dues.map((d) => ({
      id: d.memberId,
      name: d.name,
      phone: d.phone,
      joinedPeriod: d.joinedPeriod,
      monthlyAmountPaise: d.monthlyAmountPaise,
      isEnabled: d.isEnabled,
      pendingCount: d.pendingCount,
      pendingPaise: d.pendingPaise,
      totalPaidPaise: d.totalPaidPaise,
    })),
    defaultAmountPaise: store.settings().defaultAmountPaise,
  });
});

router.get('/members/:id', (req, res) => {
  const dues = duesForMember(req.params.id);
  if (!dues) return res.status(404).json({ error: 'not_found', message: 'Member not found.' });

  const entries = sortedEntries(
    store.entries().filter((e) => e.memberId === req.params.id),
  ).map(decorate);

  const plans = store
    .plansFor(req.params.id)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));

  const last = store.lastReminderFor(req.params.id);

  return res.json({ member: dues, entries, plans, lastRemindedAt: last ? last.sentAt : null });
});

router.post('/members', (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const isEnabled = req.body.isEnabled !== false;
  const amountPaise = Math.round(Number(req.body.amountPaise) || 0);

  if (name.length < 2) return bad(res, 'Enter the member name.');
  if (!/^[0-9]{10}$/.test(phone)) return bad(res, 'Enter a 10 digit mobile number.');
  if (isEnabled && amountPaise <= 0) return bad(res, 'Enter the monthly amount.');

  const joinedPeriod = String(req.body.joinedPeriod || currentPeriod());

  const member = store.addMember({
    name,
    phone,
    joinedOn: new Date(`${joinedPeriod}-01T06:00:00.000Z`).toISOString(),
    joinedPeriod,
    createdByAdminId: req.admin.id,
  });

  store.addPlan({
    memberId: member.id,
    amountPaise: isEnabled ? amountPaise : 0,
    isEnabled,
    effectiveFrom: joinedPeriod,
    createdByAdminId: req.admin.id,
  });

  audit(req, 'member.create', 'Member', `Added member ${name}`, member.id);
  return res.json({ member: duesForMember(member.id) });
});

router.patch('/members/:id', (req, res) => {
  const member = store.findMember(req.params.id);
  if (!member) return res.status(404).json({ error: 'not_found', message: 'Member not found.' });

  const patch = {};
  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (name.length < 2) return bad(res, 'Enter the member name.');
    patch.name = name;
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

  store.updateMember(member.id, patch);
  audit(req, 'member.update', 'Member', `Updated ${member.name}`, member.id);
  return res.json({ member: duesForMember(member.id) });
});

/**
 * Changing the amount or switching collection on or off writes a NEW plan row
 * from this month forward. The old row is closed off at last month, so every
 * past month keeps the amount that was actually in force at the time.
 */
router.put('/members/:id/plan', (req, res) => {
  const member = store.findMember(req.params.id);
  if (!member) return res.status(404).json({ error: 'not_found', message: 'Member not found.' });

  const isEnabled = req.body.isEnabled !== false;
  const amountPaise = Math.round(Number(req.body.amountPaise) || 0);
  if (isEnabled && amountPaise <= 0) return bad(res, 'Enter the monthly amount.');

  const from = currentPeriod();
  const existing = currentPlan(member.id);
  if (existing && existing.amountPaise === (isEnabled ? amountPaise : 0) && existing.isEnabled === isEnabled) {
    return res.json({ member: duesForMember(member.id), unchanged: true });
  }

  const [y, m] = from.split('-').map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  store.closePlans(member.id, prev);

  store.addPlan({
    memberId: member.id,
    amountPaise: isEnabled ? amountPaise : 0,
    isEnabled,
    effectiveFrom: from,
    createdByAdminId: req.admin.id,
  });

  audit(
    req,
    'member.plan',
    'ContributionPlan',
    isEnabled
      ? `Set ${member.name} to Rs ${amountPaise / 100} a month from ${from}`
      : `Took ${member.name} off the collection list from ${from}`,
    member.id,
  );
  return res.json({ member: duesForMember(member.id) });
});

// ------------------------------------------------------------------ pending
router.get('/pending', (_req, res) => {
  const s = store.settings();
  res.json({
    members: pendingMembers(),
    upiId: s.upiId,
    groupName: s.groupName,
  });
});

router.post('/reminders', (req, res) => {
  const member = store.findMember(req.body.memberId);
  if (!member) return res.status(404).json({ error: 'not_found', message: 'Member not found.' });

  const dues = duesForMember(member.id);
  const s = store.settings();

  const months = dues.pendingPeriods;
  const rupeesDue = dues.pendingPaise / 100;
  const text =
    String(req.body.messageText || '').trim() ||
    `Namaste ${member.name} ji.\n${s.groupName}, ${s.village} - Rs ${rupeesDue} pending (${months.length} month${months.length === 1 ? '' : 's'}).\nUPI: ${s.upiId}\nDhanyavaad.`;

  store.addReminder({
    memberId: member.id,
    periods: months,
    amountPaise: dues.pendingPaise,
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
router.get('/events', (_req, res) => {
  res.json({
    events: store
      .events()
      .sort((a, b) => (a.eventDate < b.eventDate ? 1 : -1))
      .map((e) => ({ ...e, photoCount: e.photos.length })),
  });
});

router.post('/events', (req, res) => {
  const title = String(req.body.title || '').trim();
  if (title.length < 3) return bad(res, 'Give the event a title.');

  const eventDate = req.body.eventDate ? new Date(req.body.eventDate) : new Date();
  if (Number.isNaN(eventDate.getTime())) return bad(res, 'That date is not valid.');

  let slug = slugify(title);
  if (!slug) slug = `event-${Date.now()}`;
  while (store.findEventBySlug(slug)) slug = `${slug}-1`;

  const event = store.addEvent({
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

router.patch('/events/:id', (req, res) => {
  const event = store.findEvent(req.params.id);
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
  if (Array.isArray(req.body.photos)) patch.photos = req.body.photos;

  store.updateEvent(event.id, patch);
  audit(req, 'event.update', 'Event', `Updated event: ${event.title}`, event.id);
  return res.json({ event: store.findEvent(event.id) });
});

router.post('/events/:id/photos', (req, res) => {
  const event = store.findEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'not_found', message: 'Event not found.' });

  const count = Math.min(Math.max(Number(req.body.count) || 1, 1), 8);
  const photos = [...event.photos];
  for (let i = 0; i < count; i += 1) {
    photos.push({
      id: `${event.id}_p${photos.length + 1}_${Date.now()}${i}`,
      seed: `${event.id}-${photos.length + i}-${Date.now()}`,
      caption: '',
      order: photos.length,
    });
  }
  store.updateEvent(event.id, { photos });
  audit(req, 'event.photos', 'Event', `Added ${count} photos to ${event.title}`, event.id);
  return res.json({ event: store.findEvent(event.id) });
});

router.delete('/events/:id/photos/:photoId', (req, res) => {
  const event = store.findEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'not_found', message: 'Event not found.' });
  const photos = event.photos.filter((p) => p.id !== req.params.photoId);
  store.updateEvent(event.id, { photos });
  return res.json({ event: store.findEvent(event.id) });
});

router.delete('/events/:id', (req, res) => {
  const event = store.findEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'not_found', message: 'Event not found.' });
  store.removeEvent(event.id);
  audit(req, 'event.delete', 'Event', `Deleted event: ${event.title}`, event.id);
  return res.json({ ok: true });
});

// ------------------------------------------------------------ join requests
router.get('/join-requests', (_req, res) => {
  res.json({
    requests: store
      .joinRequests()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((r) => ({
        ...r,
        existingMember: store.members().some((m) => m.phone === r.phone),
      })),
  });
});

router.post('/join-requests/:id/approve', (req, res) => {
  const request = store.findJoinRequest(req.params.id);
  if (!request) return res.status(404).json({ error: 'not_found', message: 'Request not found.' });

  request.status = 'approved';
  request.reviewedByAdminId = req.admin.id;
  request.reviewedAt = nowIso();

  audit(req, 'joinrequest.approve', 'JoinRequest', `Approved ${request.name}`, request.id);
  return res.json({ ok: true, prefill: { name: request.name, phone: request.phone } });
});

router.post('/join-requests/:id/reject', (req, res) => {
  const request = store.findJoinRequest(req.params.id);
  if (!request) return res.status(404).json({ error: 'not_found', message: 'Request not found.' });

  request.status = 'rejected';
  request.reviewedByAdminId = req.admin.id;
  request.reviewedAt = nowIso();
  request.rejectionReason = String(req.body.reason || '').trim() || null;

  audit(req, 'joinrequest.reject', 'JoinRequest', `Rejected ${request.name}`, request.id);
  return res.json({ ok: true });
});

// =========================================================== master only ===

router.post('/adjustments', requireMaster, (req, res) => {
  const targetPaise = Math.round(Number(req.body.targetPaise));
  const reason = String(req.body.reason || '').trim();

  if (!Number.isFinite(targetPaise) || targetPaise < 0) return bad(res, 'Enter the true balance.');
  if (reason.length < 10) return bad(res, 'Write a reason of at least 10 characters.');

  const result = postAdjustment(targetPaise, reason, req.admin.id);
  if (result.error) return bad(res, result.error);

  audit(
    req,
    'ledger.adjust',
    'LedgerEntry',
    `Balance corrected by Rs ${result.deltaPaise / 100}: ${reason}`,
    result.entry.id,
  );
  return res.json({ ...result, entry: decorate(result.entry), balancePaise: balancePaise() });
});

router.get('/adjustments', requireMaster, (_req, res) => {
  res.json({
    entries: sortedEntries(store.entries().filter((e) => e.kind === 'adjustment')).map(decorate),
    balancePaise: balancePaise(),
  });
});

router.get('/pin', requireMaster, (_req, res) => {
  const s = store.settings();
  const admin = s.pinUpdatedByAdminId ? store.findAdmin(s.pinUpdatedByAdminId) : null;
  res.json({
    pinVersion: s.pinVersion,
    pinUpdatedAt: s.pinUpdatedAt,
    pinUpdatedBy: admin ? admin.name : null,
    viewerSessionDays: s.viewerSessionDays,
    failedAttempts: store
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

  const s = store.settings();
  store.updateSettings({
    pinHash: await bcrypt.hash(pin, 10),
    pinVersion: s.pinVersion + 1,
    pinUpdatedAt: nowIso(),
    pinUpdatedByAdminId: req.admin.id,
  });

  audit(req, 'settings.pin.rotate', 'Settings', 'Group PIN changed. All viewer sessions ended.');
  return res.json({ ok: true, pinVersion: store.settings().pinVersion });
});

router.get('/admins', requireMaster, (_req, res) => {
  res.json({
    admins: store.admins().map((a) => ({
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
  if (store.findAdminByEmail(email)) return bad(res, 'An admin with that email already exists.');

  const admin = store.addAdmin({
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

router.delete('/admins/:id', requireMaster, (req, res) => {
  const target = store.findAdmin(req.params.id);
  if (!target) return res.status(404).json({ error: 'not_found', message: 'Admin not found.' });
  if (target.role === 'master') {
    return res
      .status(403)
      .json({ error: 'forbidden', message: 'The master admin can never be removed.' });
  }

  store.removeAdmin(target.id);
  audit(req, 'admin.delete', 'Admin', `Removed admin ${target.name}`, target.id);
  return res.json({ ok: true });
});

router.get('/audit', requireMaster, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json({
    logs: store
      .auditLogs()
      .slice(0, limit)
      .map((l) => {
        const actor = l.actorAdminId ? store.findAdmin(l.actorAdminId) : null;
        return { ...l, actorName: actor ? actor.name : 'Anonymous' };
      }),
  });
});

router.get('/settings', requireMaster, (_req, res) => {
  const { pinHash, ...safe } = store.settings();
  res.json({ settings: safe });
});

router.put('/settings', requireMaster, (req, res) => {
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
    'founderName',
    'founderNameHi',
    'founderYears',
    'founderPhotoUrl',
    'founderAbout',
    'founderAboutHi',
  ].forEach((k) => {
    if (req.body[k] !== undefined) patch[k] = String(req.body[k]);
  });
  if (Array.isArray(req.body.rules)) patch.rules = req.body.rules.filter(Boolean);
  if (req.body.showPaidBoard !== undefined) patch.showPaidBoard = !!req.body.showPaidBoard;
  if (req.body.defaultAmountPaise !== undefined) {
    const amount = Math.round(Number(req.body.defaultAmountPaise));
    if (Number.isFinite(amount) && amount >= 0) patch.defaultAmountPaise = amount;
  }
  if (req.body.viewerSessionDays !== undefined) {
    const days = Math.round(Number(req.body.viewerSessionDays));
    if (Number.isFinite(days) && days >= 1 && days <= 365) patch.viewerSessionDays = days;
  }

  store.updateSettings(patch);
  audit(req, 'settings.update', 'Settings', 'Club settings updated');

  const { pinHash, ...safe } = store.settings();
  return res.json({ settings: safe });
});

/** One-time opening balance. Only available while the ledger is empty. */
router.post('/opening-balance', requireMaster, (req, res) => {
  if (store.entries().some((e) => e.kind === 'opening')) {
    return res
      .status(409)
      .json({ error: 'exists', message: 'The opening balance has already been set.' });
  }
  const amountPaise = Math.round(Number(req.body.amountPaise) || 0);
  if (amountPaise <= 0) return bad(res, 'Enter the amount currently in the register.');

  const occurredOn = req.body.occurredOn ? new Date(req.body.occurredOn) : new Date();
  const entry = postEntry({
    direction: 'credit',
    kind: 'opening',
    amountPaise,
    note: String(req.body.note || 'Balance carried over from the club register'),
    occurredOn: occurredOn.toISOString(),
    adminId: req.admin.id,
  });

  audit(req, 'ledger.opening', 'LedgerEntry', `Opening balance set to Rs ${amountPaise / 100}`, entry.id);
  return res.json({ entry: decorate(entry), balancePaise: balancePaise() });
});

export default router;
