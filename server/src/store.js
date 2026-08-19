/**
 * The in-memory demo store.
 *
 * Every service in the app talks to this object rather than to Mongoose
 * directly. When the Atlas cluster is ready, the swap is: replace the bodies of
 * these accessors with Mongoose queries against models.js. No route, no
 * service and no React component has to change.
 *
 * Nothing here survives a restart. That is deliberate for the demo.
 */

import { buildSeed } from './seed.js';
import { newId, nowIso } from './utils.js';

let db = buildSeed();

export function resetStore() {
  db = buildSeed();
  return db;
}

export const store = {
  // ---- admins --------------------------------------------------------------
  admins: () => db.admins,
  findAdmin: (id) => db.admins.find((a) => a.id === id) || null,
  findAdminByEmail: (email) =>
    db.admins.find((a) => a.email.toLowerCase() === String(email).toLowerCase().trim()) || null,
  addAdmin: (data) => {
    const admin = { id: newId('adm'), createdAt: nowIso(), lastLoginAt: null, ...data };
    db.admins.push(admin);
    return admin;
  },
  removeAdmin: (id) => {
    const admin = store.findAdmin(id);
    if (!admin) return false;
    if (admin.role === 'master') return false; // never, at any layer
    db.admins = db.admins.filter((a) => a.id !== id);
    return true;
  },

  // ---- members -------------------------------------------------------------
  members: () => db.members,
  activeMembers: () => db.members.filter((m) => m.status === 'active'),
  findMember: (id) => db.members.find((m) => m.id === id) || null,
  addMember: (data) => {
    const member = { id: newId('mem'), status: 'active', notes: '', createdAt: nowIso(), ...data };
    db.members.push(member);
    return member;
  },
  updateMember: (id, patch) => {
    const member = store.findMember(id);
    if (!member) return null;
    Object.assign(member, patch);
    return member;
  },

  // ---- contribution plans --------------------------------------------------
  plans: () => db.plans,
  plansFor: (memberId) => db.plans.filter((p) => p.memberId === memberId),
  addPlan: (data) => {
    const plan = { id: newId('pln'), createdAt: nowIso(), effectiveTo: null, ...data };
    db.plans.push(plan);
    return plan;
  },
  closePlans: (memberId, effectiveTo) => {
    db.plans
      .filter((p) => p.memberId === memberId && p.effectiveTo === null)
      .forEach((p) => {
        p.effectiveTo = effectiveTo;
      });
  },

  // ---- ledger --------------------------------------------------------------
  entries: () => db.entries,
  findEntry: (id) => db.entries.find((e) => e.id === id) || null,
  addEntry: (data) => {
    const entry = { id: newId('led'), createdAt: nowIso(), ...data };
    db.entries.push(entry);
    return entry;
  },
  updateEntry: (id, patch) => {
    const entry = store.findEntry(id);
    if (!entry) return null;
    Object.assign(entry, patch);
    return entry;
  },

  // ---- events --------------------------------------------------------------
  events: () => db.events,
  findEvent: (id) => db.events.find((e) => e.id === id) || null,
  findEventBySlug: (slug) => db.events.find((e) => e.slug === slug) || null,
  addEvent: (data) => {
    const event = { id: newId('evt'), createdAt: nowIso(), updatedAt: nowIso(), ...data };
    db.events.push(event);
    return event;
  },
  updateEvent: (id, patch) => {
    const event = store.findEvent(id);
    if (!event) return null;
    Object.assign(event, patch, { updatedAt: nowIso() });
    return event;
  },
  removeEvent: (id) => {
    const before = db.events.length;
    db.events = db.events.filter((e) => e.id !== id);
    return db.events.length < before;
  },

  // ---- join requests -------------------------------------------------------
  joinRequests: () => db.joinRequests,
  findJoinRequest: (id) => db.joinRequests.find((r) => r.id === id) || null,
  addJoinRequest: (data) => {
    const request = {
      id: newId('jr'),
      status: 'pending',
      createdAt: nowIso(),
      reviewedByAdminId: null,
      reviewedAt: null,
      rejectionReason: null,
      ...data,
    };
    db.joinRequests.push(request);
    return request;
  },

  // ---- reminders -----------------------------------------------------------
  reminders: () => db.reminders,
  addReminder: (data) => {
    const reminder = { id: newId('rem'), sentAt: nowIso(), channel: 'whatsapp', ...data };
    db.reminders.push(reminder);
    return reminder;
  },
  lastReminderFor: (memberId) => {
    const list = db.reminders
      .filter((r) => r.memberId === memberId)
      .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1));
    return list[0] || null;
  },

  // ---- audit ---------------------------------------------------------------
  auditLogs: () => db.auditLogs,
  addAudit: (data) => {
    const log = { id: newId('aud'), createdAt: nowIso(), ...data };
    db.auditLogs.unshift(log);
    return log;
  },

  // ---- settings ------------------------------------------------------------
  settings: () => db.settings,
  updateSettings: (patch) => {
    Object.assign(db.settings, patch);
    return db.settings;
  },
};
