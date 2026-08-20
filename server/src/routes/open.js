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
import { store } from '../store.js';

const router = express.Router();

/** The only shape an event takes on the open side. No spend, ever. */
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
    photos: e.photos,
  };
}

router.get('/club', (_req, res) => {
  const s = store.settings();
  res.json({
    groupName: s.groupName,
    groupNameHi: s.groupNameHi,
    village: s.village,
    villageHi: s.villageHi,
    tagline: s.tagline,
  });
});

router.get('/events', (_req, res) => {
  const events = store
    .events()
    .filter((e) => e.isPublished)
    .sort((a, b) => (a.eventDate < b.eventDate ? 1 : -1))
    .map(openEvent);
  res.json({ events });
});

router.get('/events/:slug', (req, res) => {
  const event = store.findEventBySlug(req.params.slug);
  if (!event || !event.isPublished) {
    return res.status(404).json({ error: 'not_found', message: 'That event could not be found.' });
  }
  return res.json({ event: openEvent(event), spend: null, expenses: [] });
});

router.get('/about', (_req, res) => {
  const s = store.settings();
  res.json({
    groupName: s.groupName,
    groupNameHi: s.groupNameHi,
    village: s.village,
    villageHi: s.villageHi,
    tagline: s.tagline,
    about: s.about,
    aboutHi: s.aboutHi,
    rules: s.rules,
    founder: {
      name: s.founderName,
      nameHi: s.founderNameHi,
      years: s.founderYears,
      photoUrl: s.founderPhotoUrl,
      about: s.founderAbout,
      aboutHi: s.founderAboutHi,
    },
    // Names only. No phone numbers, no roles, no counts.
    admins: store.admins().map((a) => ({ name: a.name })),
  });
});

/**
 * The public members board: a face and a name, nothing else.
 *
 * No phone numbers, no amounts, no payment status — all of that stays behind
 * the club PIN on /api/view/members. This endpoint exists so the village can
 * see who is in the club without being handed everyone's contact details.
 */
router.get('/members', (_req, res) => {
  const s = store.settings();
  res.json({
    members: store
      .members()
      .filter((m) => m.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => ({ id: m.id, name: m.name, photoUrl: m.photoUrl || null })),
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

router.post('/join-request', joinLimiter, (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const message = String(req.body.message || '').trim().slice(0, 500);

  if (name.length < 2) {
    return res.status(400).json({ error: 'invalid', message: 'Please enter your full name.' });
  }
  if (!/^[0-9]{10}$/.test(phone)) {
    return res
      .status(400)
      .json({ error: 'invalid', message: 'Please enter a 10 digit mobile number.' });
  }

  // A repeat request from the same number is collapsed rather than rejected,
  // so nobody gets an error for pressing the button twice.
  const existing = store
    .joinRequests()
    .find((r) => r.phone === phone && r.status === 'pending');
  if (existing) return res.json({ ok: true });

  store.addJoinRequest({ name, phone, message });
  return res.json({ ok: true });
});

export default router;
