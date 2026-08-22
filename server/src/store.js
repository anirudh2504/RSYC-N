/**
 * The data gateway.
 *
 * Reads come from a snapshot loaded once per request; writes go straight to
 * MongoDB and are also applied to the snapshot so the rest of the request sees
 * its own change.
 *
 * Why a snapshot rather than querying as we go: the ledger and dues services
 * are pure arithmetic over arrays — working out who has paid walks every month
 * of every member and asks about entries dozens of times. Against a database
 * that is hundreds of round trips per page. Loading once and computing in
 * memory turns it into one.
 *
 * At this club's size — a few thousand entries, fifty members — the whole
 * dataset is well under a megabyte, so this is both simpler and faster. If it
 * ever grew past that, the fix is to narrow what each router loads rather than
 * to scatter queries back through the services.
 */

import {
  Admin,
  Member,
  ContributionPlan,
  LedgerEntry,
  Event,
  JoinRequest,
  Reminder,
  AuditLog,
  Settings,
} from './models.js';

/* ------------------------------------------------------------------ shape -- */

const id = (value) => (value ? String(value) : null);

/** Mongo gives ObjectIds; the rest of the app compares plain strings. */
function normalise(doc) {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  const out = { id: String(_id), ...rest };

  for (const key of Object.keys(out)) {
    // Any *Id field, and the dates, become primitives the services can compare.
    if (key.endsWith('Id') && out[key] && typeof out[key] === 'object') out[key] = id(out[key]);
    if (out[key] instanceof Date) out[key] = out[key].toISOString();
  }
  return out;
}

const all = async (Model, sort) => (await Model.find({}).sort(sort || {}).lean()).map(normalise);

/* ------------------------------------------------------------------ load -- */

export async function loadSnapshot() {
  const [admins, members, plans, entries, events, joinRequests, reminders, auditLogs, settingsDoc] =
    await Promise.all([
      all(Admin),
      all(Member),
      all(ContributionPlan),
      all(LedgerEntry, { occurredOn: -1 }),
      all(Event),
      all(JoinRequest),
      all(Reminder),
      all(AuditLog, { createdAt: -1 }),
      Settings.findOne({}).lean(),
    ]);

  return {
    admins,
    members,
    plans,
    entries,
    events,
    joinRequests,
    reminders,
    auditLogs,
    settings: normalise(settingsDoc),
  };
}

/* ----------------------------------------------------------------- store -- */

/**
 * Builds the accessors over one snapshot. Reads are synchronous; anything that
 * writes returns a promise, because it is talking to the database.
 */
export function makeStore(data) {
  const store = {
    // ---- admins ------------------------------------------------------------
    admins: () => data.admins,
    findAdmin: (adminId) => data.admins.find((a) => a.id === adminId) || null,
    findAdminByEmail: (email) =>
      data.admins.find((a) => a.email.toLowerCase() === String(email).toLowerCase().trim()) || null,
    addAdmin: async (fields) => {
      const created = normalise((await Admin.create(fields)).toObject());
      data.admins.push(created);
      return created;
    },
    updateAdmin: async (adminId, patch) => {
      await Admin.updateOne({ _id: adminId }, { $set: patch });
      const admin = store.findAdmin(adminId);
      if (admin) Object.assign(admin, patch);
      return admin;
    },
    removeAdmin: async (adminId) => {
      const admin = store.findAdmin(adminId);
      if (!admin || admin.role === 'master') return false; // never, at any layer
      await Admin.deleteOne({ _id: adminId });
      data.admins = data.admins.filter((a) => a.id !== adminId);
      return true;
    },

    // ---- members -----------------------------------------------------------
    members: () => data.members,
    activeMembers: () => data.members.filter((m) => m.status === 'active'),
    findMember: (memberId) => data.members.find((m) => m.id === memberId) || null,
    addMember: async (fields) => {
      const created = normalise((await Member.create(fields)).toObject());
      data.members.push(created);
      return created;
    },
    updateMember: async (memberId, patch) => {
      await Member.updateOne({ _id: memberId }, { $set: patch });
      const member = store.findMember(memberId);
      if (member) Object.assign(member, patch);
      return member;
    },
    /**
     * Write a whole new running order in one round trip.
     *
     * Dragging a name to the top changes the position of everyone below it, so
     * this is one bulkWrite rather than a request per member — otherwise a
     * board of thirty would fire thirty writes for a single drag.
     */
    reorderMembers: async (orderedIds) => {
      const ops = orderedIds.map((id, index) => ({
        updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } },
      }));
      if (ops.length) await Member.bulkWrite(ops);
      orderedIds.forEach((id, index) => {
        const member = store.findMember(id);
        if (member) member.sortOrder = index;
      });
    },
    /** Where a newly added member goes: the end of the board, not the middle. */
    nextMemberOrder: () =>
      data.members.reduce((max, m) => Math.max(max, (m.sortOrder || 0) + 1), 0),

    // ---- contribution plans -------------------------------------------------
    plans: () => data.plans,
    plansFor: (memberId) => data.plans.filter((p) => p.memberId === memberId),
    addPlan: async (fields) => {
      const created = normalise((await ContributionPlan.create(fields)).toObject());
      data.plans.push(created);
      return created;
    },
    /**
     * Correct a plan in place. Only used when an admin fixes an amount they
     * mistyped in the same month, before anyone has paid against it — there is
     * no history to preserve yet, so closing it off and opening another would
     * leave a stray row that was never actually in force.
     */
    updatePlan: async (planId, patch) => {
      await ContributionPlan.updateOne({ _id: planId }, { $set: patch });
      const row = data.plans.find((p) => p.id === planId);
      if (row) Object.assign(row, patch);
      return row;
    },
    closePlans: async (memberId, effectiveTo) => {
      await ContributionPlan.updateMany(
        { memberId, effectiveTo: null },
        { $set: { effectiveTo } },
      );
      data.plans
        .filter((p) => p.memberId === memberId && p.effectiveTo === null)
        .forEach((p) => {
          p.effectiveTo = effectiveTo;
        });
    },

    // ---- ledger -------------------------------------------------------------
    entries: () => data.entries,
    findEntry: (entryId) => data.entries.find((e) => e.id === entryId) || null,
    addEntry: async (fields) => {
      const created = normalise((await LedgerEntry.create(fields)).toObject());
      data.entries.push(created);
      return created;
    },
    updateEntry: async (entryId, patch) => {
      await LedgerEntry.updateOne({ _id: entryId }, { $set: patch });
      const entry = store.findEntry(entryId);
      if (entry) Object.assign(entry, patch);
      return entry;
    },

    // ---- events -------------------------------------------------------------
    events: () => data.events,
    findEvent: (eventId) => data.events.find((e) => e.id === eventId) || null,
    findEventBySlug: (slug) => data.events.find((e) => e.slug === slug) || null,
    addEvent: async (fields) => {
      const created = normalise((await Event.create(fields)).toObject());
      data.events.push(created);
      return created;
    },
    updateEvent: async (eventId, patch) => {
      await Event.updateOne({ _id: eventId }, { $set: patch });
      const event = store.findEvent(eventId);
      if (event) Object.assign(event, patch, { updatedAt: new Date().toISOString() });
      return event;
    },
    removeEvent: async (eventId) => {
      const res = await Event.deleteOne({ _id: eventId });
      data.events = data.events.filter((e) => e.id !== eventId);
      return res.deletedCount > 0;
    },

    // ---- join requests ------------------------------------------------------
    joinRequests: () => data.joinRequests,
    findJoinRequest: (requestId) => data.joinRequests.find((r) => r.id === requestId) || null,
    addJoinRequest: async (fields) => {
      const created = normalise((await JoinRequest.create(fields)).toObject());
      data.joinRequests.push(created);
      return created;
    },
    updateJoinRequest: async (requestId, patch) => {
      await JoinRequest.updateOne({ _id: requestId }, { $set: patch });
      const request = store.findJoinRequest(requestId);
      if (request) Object.assign(request, patch);
      return request;
    },

    // ---- reminders ----------------------------------------------------------
    reminders: () => data.reminders,
    addReminder: async (fields) => {
      const created = normalise((await Reminder.create(fields)).toObject());
      data.reminders.push(created);
      return created;
    },
    lastReminderFor: (memberId) => {
      const list = data.reminders
        .filter((r) => r.memberId === memberId)
        .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1));
      return list[0] || null;
    },

    // ---- audit --------------------------------------------------------------
    auditLogs: () => data.auditLogs,
    addAudit: async (fields) => {
      const created = normalise((await AuditLog.create(fields)).toObject());
      data.auditLogs.unshift(created);
      return created;
    },

    // ---- settings -----------------------------------------------------------
    settings: () => data.settings,
    updateSettings: async (patch) => {
      await Settings.updateOne({ _id: data.settings.id }, { $set: patch });
      Object.assign(data.settings, patch);
      return data.settings;
    },
  };

  return store;
}
