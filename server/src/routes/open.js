/**
 * The open router. No PIN, no login.
 *
 * This file deliberately imports nothing from the ledger, dues or member
 * services. The part of the app that shows money is not reachable from here at
 * all, which is a stronger guarantee than a permission check that could be
 * written wrong.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { notifyJoinRequest } from '../services/notify.js';

const router = express.Router();

/** How many pictures a slideshow tile is allowed to pull down. */
const SLIDESHOW_LIMIT = 6;

/**
 * The card shape, for the events list.
 *
 * Deliberately does NOT carry the gallery. Photos are stored as data URIs, so
 * sending every photo of every event just to draw a grid of covers would cost
 * the village megabytes on a phone. Only an event with the slideshow switched
 * on sends extra frames, and only a few of them.
 */
function openEventCard(e) {
  const slideshow = e.autoSwipe
    ? (e.photos || [])
        .slice(0, SLIDESHOW_LIMIT)
        .map((p) => ({ id: p.id, url: p.url || null, seed: p.seed || '' }))
    : [];

  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    titleHi: e.titleHi,
    eventDate: e.eventDate,
    tags: e.tags,
    palette: e.palette,
    coverUrl: e.coverUrl || '',
    autoSwipe: !!e.autoSwipe,
    slideshow,
    photoCount: (e.photos || []).length,
  };
}

/** The full shape, for one event's own page. No spend, ever. */
function openEvent(e) {
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    titleHi: e.titleHi,
    description: e.description,
    eventDate: e.eventDate,
    tags: e.tags,
    palette: e.palette,
    coverUrl: e.coverUrl || '',
    autoSwipe: !!e.autoSwipe,
    photos: e.photos,
  };
}

router.get('/club', async (req, res) => {
  const s = req.db.settings();
  res.json({
    groupName: s.groupName,
    groupNameHi: s.groupNameHi,
    village: s.village,
    villageHi: s.villageHi,
    tagline: s.tagline,
  });
});

router.get('/events', async (req, res) => {
  const events = req.db
    .events()
    .filter((e) => e.isPublished)
    .sort((a, b) => (a.eventDate < b.eventDate ? 1 : -1))
    .map(openEventCard);
  res.json({ events });
});

router.get('/events/:slug', async (req, res) => {
  const event = req.db.findEventBySlug(req.params.slug);
  if (!event || !event.isPublished) {
    return res.status(404).json({ error: 'not_found', message: 'That event could not be found.' });
  }
  return res.json({ event: openEvent(event), spend: null, expenses: [] });
});

router.get('/about', async (req, res) => {
  const s = req.db.settings();
  res.json({
    groupName: s.groupName,
    groupNameHi: s.groupNameHi,
    village: s.village,
    villageHi: s.villageHi,
    tagline: s.tagline,
    about: s.about,
    aboutHi: s.aboutHi,
    rules: s.rules,
    purpose: s.purpose,
    purposeHi: s.purposeHi,
    purposePoints: s.purposePoints,
    purposePointsHi: s.purposePointsHi,
    founder: {
      name: s.founderName,
      nameHi: s.founderNameHi,
      years: s.founderYears,
      photoUrl: s.founderPhotoUrl,
      about: s.founderAbout,
      aboutHi: s.founderAboutHi,
      contribution: s.founderContribution,
      contributionHi: s.founderContributionHi,
    },
    // Deliberately no admin names here. The club is run by the village, and
    // naming individuals on an open page serves nobody.
    contactPhone: s.contactPhone,
  });
});

/**
 * The public members board: a face and a name, nothing else.
 *
 * No phone numbers, no amounts, no payment status — all of that stays behind
 * the club PIN on /api/view/members. This endpoint exists so the village can
 * see who is in the club without being handed everyone's contact details.
 */
router.get('/members', async (req, res) => {
  const s = req.db.settings();
  res.json({
    members: req.db
      .members()
      .filter((m) => m.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => ({
        id: m.id,
        name: m.name,
        fatherName: m.fatherName || '',
        photoUrl: m.photoUrl || null,
      })),
    contactPhone: s.contactPhone,
    groupName: s.groupName,
    groupNameHi: s.groupNameHi,
  });
});

const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many requests. Please try again later.' },
});

router.post('/join-request', joinLimiter, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const fatherName = String(req.body.fatherName || '').trim();
  const phone = String(req.body.phone || '').trim();
  const message = String(req.body.message || '').trim().slice(0, 500);

  if (name.length < 2) {
    return res.status(400).json({ error: 'invalid', message: 'Please enter your full name.' });
  }
  if (fatherName.length < 2) {
    return res.status(400).json({ error: 'invalid', message: "Please enter your father's name." });
  }
  if (!/^[0-9]{10}$/.test(phone)) {
    return res
      .status(400)
      .json({ error: 'invalid', message: 'Please enter a 10 digit mobile number.' });
  }

  const settings = req.db.settings();

  // What the visitor can send themselves, right now, with no API and no cost.
  const clubPhone = settings.contactPhone;
  const text =
    `Namaste. I would like to join ${settings.groupName}, ${settings.village}.\n` +
    `Name: ${name}\nS/o: ${fatherName}\nPhone: ${phone}` +
    (message ? `\n${message}` : '');
  const whatsappUrl = clubPhone
    ? `https://wa.me/91${clubPhone}?text=${encodeURIComponent(text)}`
    : null;

  // A repeat request from the same number is collapsed rather than rejected,
  // so nobody gets an error for pressing the button twice.
  const existing = req.db
    .joinRequests()
    .find((r) => r.phone === phone && r.status === 'pending');
  if (existing) return res.json({ ok: true, whatsappUrl });

  await req.db.addJoinRequest({ name, fatherName, phone, message });
  await req.db.addAudit({
    actorAdminId: null,
    action: 'joinrequest.create',
    category: 'join-request',
    entityType: 'JoinRequest',
    summary: `New join request from ${name}`,
    ip: req.ip,
  });

  // Fire and forget. A notification failure must never lose the request.
  notifyJoinRequest({ name, fatherName, phone, message })
    .then((r) => {
      if (r.sent) console.log(`[rsyc] WhatsApp notified ${r.delivered}/${r.total} admin(s)`);
      else console.log(`[rsyc] join request saved; not notified — ${r.reason || 'send failed'}`);
    })
    .catch((err) => console.error('[rsyc] notify error:', err.message));

  return res.json({ ok: true, whatsappUrl });
});

export default router;
