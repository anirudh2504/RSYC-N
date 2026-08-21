/**
 * The viewer router. Everything here is behind the club PIN, and everything
 * here is read-only — there is not a single write in this file.
 */

import express from 'express';
import { store } from '../store.js';
import { requireViewer } from '../middleware/auth.js';
import {
  balance,
  sortedEntries,
  liveEntries,
  decorate,
  monthTotals,
  eventSpend,
  eventExpenses,
} from '../services/ledger.js';
import { collectionBoard, currentPeriod, duesForEveryone } from '../services/dues.js';

const router = express.Router();

router.use(requireViewer);

router.get('/summary', (_req, res) => {
  const s = store.settings();
  const period = currentPeriod();
  const board = collectionBoard(period);

  const recent = sortedEntries(store.entries()).slice(0, 5).map(decorate);

  res.json({
    balance: balance(),
    period,
    collection: {
      expected: board.expected,
      collected: board.collected,
      paidCount: board.paidCount,
      payableCount: board.payableCount,
    },
    month: monthTotals(period),
    notice: s.notice,
    bankAccountLabel: s.bankAccountLabel,
    upiId: s.upiId,
    paymentPhone: s.paymentPhone,
    whatsappGroupUrl: s.whatsappGroupUrl,
    memberCount: store.activeMembers().length,
    recent,
  });
});

router.get('/transactions', (req, res) => {
  const { month, type, memberId, q } = req.query;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  let list = sortedEntries(store.entries());

  if (month) list = list.filter((e) => e.occurredOn.startsWith(String(month)));
  if (type === 'credit' || type === 'debit') list = list.filter((e) => e.direction === type);
  if (memberId) list = list.filter((e) => e.memberId === memberId);

  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((e) => {
      const member = e.memberId ? store.findMember(e.memberId) : null;
      return [e.reason, e.note, e.payerName, member ? member.name : '']
        .filter(Boolean)
        .some((t) => String(t).toLowerCase().includes(needle));
    });
  }

  const total = list.length;
  const page = list.slice(offset, offset + limit).map(decorate);

  res.json({
    entries: page,
    total,
    offset,
    limit,
    hasMore: offset + limit < total,
    balance: balance(),
    month: month ? monthTotals(String(month)) : null,
  });
});

/**
 * The club directory. Deliberately carries no money at all — not the monthly
 * amount, not what anyone has paid, not who is behind. That belongs on the
 * monthly contribution board, not against a person's name in a directory.
 */
router.get('/members', (_req, res) => {
  const members = store
    .activeMembers()
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  res.json({
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      fatherName: m.fatherName || '',
      phone: m.phone,
      joinedPeriod: m.joinedPeriod,
      joinedOn: m.joinedOn,
      photoUrl: m.photoUrl || null,
    })),
    totalCount: members.length,
  });
});

router.get('/collection', (req, res) => {
  const s = store.settings();
  if (!s.showPaidBoard) {
    return res.status(404).json({ error: 'disabled', message: 'This board is switched off.' });
  }
  const period = String(req.query.period || currentPeriod());
  return res.json(collectionBoard(period));
});

/** The same event as the open route, but with the club spend attached. */
router.get('/events/:slug', (req, res) => {
  const event = store.findEventBySlug(req.params.slug);
  if (!event) {
    return res.status(404).json({ error: 'not_found', message: 'That event could not be found.' });
  }
  return res.json({
    event,
    spend: eventSpend(event.id),
    expenses: eventExpenses(event.id),
  });
});

/** Months that actually have entries, for the filter dropdown. */
router.get('/months', (_req, res) => {
  const months = [...new Set(liveEntries().map((e) => e.occurredOn.slice(0, 7)))].sort().reverse();
  res.json({ months });
});

export default router;
