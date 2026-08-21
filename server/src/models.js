/**
 * Mongoose schemas.
 *
 * These define every collection the app uses, with its indexes and the
 * constraints that keep the ledger honest — one opening balance, whole-rupee
 * amounts, a master admin that cannot be deleted.
 *
 * Money is a WHOLE NUMBER OF RUPEES everywhere. Rs 200 is 200. Paise are not
 * recorded, and the integer validator below is what keeps it that way.
 */

import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const adminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['master', 'admin'], required: true },
    isActive: { type: Boolean, default: true },
    twoFactorSecret: { type: String, default: null },
    lastLoginAt: { type: Date, default: null },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    createdByAdminId: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true },
);

/**
 * Exactly one master admin, enforced by the database itself.
 *
 * This is what makes the one-time setup route safe. Two requests arriving in
 * the same instant would both see an empty admin list and both try to found
 * the club; here the second one simply fails, whatever the application code
 * believed at the time.
 */
adminSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: 'master' } });

// The founding master account can never be removed, at any layer.
adminSchema.pre('deleteOne', { document: true, query: false }, function guard(next) {
  if (this.role === 'master') return next(new Error('The master admin cannot be deleted.'));
  return next();
});

const memberSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    // Father's name — shown as "S/o ..." beside the member everywhere.
    fatherName: { type: String, default: '', trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    photoUrl: { type: String, default: null },
    joinedOn: { type: Date, required: true },
    joinedPeriod: { type: String, required: true },
    status: { type: String, enum: ['active', 'left'], default: 'active' },
    notes: { type: String, default: '' },
    createdByAdminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

/**
 * The monthly amount lives here rather than on the member, with effective
 * dates. Change an amount and a NEW row is written, so past months keep the
 * amount that was actually in force at the time.
 */
const contributionPlanSchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    amount: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger, message: 'Amounts must be whole rupees.' } },
    isEnabled: { type: Boolean, default: true },
    effectiveFrom: { type: String, required: true },
    effectiveTo: { type: String, default: null },
    createdByAdminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

const allocationSchema = new Schema(
  {
    period: { type: String, required: true },
    amount: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger, message: 'Amounts must be whole rupees.' } },
  },
  { _id: false },
);

const photoSchema = new Schema(
  {
    url: { type: String, default: null },
    thumbUrl: { type: String, default: null },
    seed: { type: String, default: '' },
    caption: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const ledgerEntrySchema = new Schema(
  {
    direction: { type: String, enum: ['credit', 'debit'], required: true },
    kind: {
      type: String,
      enum: ['opening', 'contribution', 'donation', 'expense', 'adjustment', 'reversal'],
      required: true,
    },
    // Whole rupees. A decimal is a bug, so the schema refuses one outright.
    amount: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: 'Amounts must be whole rupees.' } },

    memberId: { type: Schema.Types.ObjectId, ref: 'Member', default: null },
    payerName: { type: String, default: null },
    allocations: { type: [allocationSchema], default: [] },

    reason: { type: String, default: null },
    takenBy: { type: String, default: null },
    note: { type: String, default: '' },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', default: null },

    occurredOn: { type: Date, required: true },
    lockedAt: { type: Date, required: true },

    isReversed: { type: Boolean, default: false },
    reversesEntryId: { type: Schema.Types.ObjectId, ref: 'LedgerEntry', default: null },
    reversalReason: { type: String, default: null },

    createdByAdminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  },
  { timestamps: true },
);

ledgerEntrySchema.index({ occurredOn: -1, _id: -1 });
ledgerEntrySchema.index({ memberId: 1, 'allocations.period': 1 });
ledgerEntrySchema.index({ eventId: 1 });

// There can only ever be one opening balance, enforced by the database itself.
ledgerEntrySchema.index({ kind: 1 }, { unique: true, partialFilterExpression: { kind: 'opening' } });

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    titleHi: { type: String, default: '' },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    eventDate: { type: Date, required: true },
    tags: { type: [String], default: [] },
    palette: { type: Number, default: 0 },
    coverUrl: { type: String, default: '' },
    // Cycle the cover and gallery on the event tile instead of a still cover.
    autoSwipe: { type: Boolean, default: false },
    photos: { type: [photoSchema], default: [] },
    isPublished: { type: Boolean, default: false },
    createdByAdminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

const joinRequestSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    fatherName: { type: String, default: '', trim: true },
    phone: { type: String, required: true, trim: true },
    message: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedByAdminId: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
  },
  { timestamps: true },
);

const reminderSchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    periods: { type: [String], default: [] },
    amount: { type: Number, required: true },
    channel: { type: String, default: 'whatsapp' },
    messageText: { type: String, default: '' },
    sentByAdminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const reconciliationSchema = new Schema(
  {
    period: { type: String, required: true },
    passbookBalance: { type: Number, required: true },
    bookBalance: { type: Number, required: true },
    matched: { type: Boolean, required: true },
    difference: { type: Number, default: 0 },
    note: { type: String, default: '' },
    verifiedByAdminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
    verifiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const auditLogSchema = new Schema(
  {
    actorAdminId: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    action: { type: String, required: true },
    category: { type: String, default: 'other', index: true },
    entityType: { type: String, default: null },
    entityId: { type: String, default: null },
    summary: { type: String, default: '' },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const settingsSchema = new Schema(
  {
    groupName: { type: String, required: true },
    groupNameHi: { type: String, default: '' },
    village: { type: String, default: '' },
    villageHi: { type: String, default: '' },
    tagline: { type: String, default: '' },
    about: { type: String, default: '' },
    aboutHi: { type: String, default: '' },
    rules: { type: [String], default: [] },
    bankAccountLabel: { type: String, default: '' },
    upiId: { type: String, default: '' },
    paymentPhone: { type: String, default: '' },
    whatsappGroupUrl: { type: String, default: '' },
    contactPhone: { type: String, default: '' },

    purpose: { type: String, default: '' },
    purposeHi: { type: String, default: '' },
    purposePoints: { type: [String], default: [] },
    purposePointsHi: { type: [String], default: [] },

    founderName: { type: String, default: '' },
    founderNameHi: { type: String, default: '' },
    founderYears: { type: String, default: '' },
    founderPhotoUrl: { type: String, default: '' },
    founderAbout: { type: String, default: '' },
    founderAboutHi: { type: String, default: '' },
    founderContribution: { type: [String], default: [] },
    founderContributionHi: { type: [String], default: [] },

    // Empty until the first master admin chooses one during setup. While it is
    // empty the PIN gate refuses everybody rather than letting anybody in.
    pinHash: { type: String, default: '' },
    pinVersion: { type: Number, default: 1 },
    pinUpdatedAt: { type: Date, default: null },
    pinUpdatedByAdminId: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    viewerSessionDays: { type: Number, default: 30 },

    showPaidBoard: { type: Boolean, default: true },
    defaultAmount: { type: Number, default: 200 },
    notice: { type: String, default: '' },
    locale: { type: String, default: 'en' },
  },
  { timestamps: true },
);

export const Admin = models.Admin || model('Admin', adminSchema);
export const Member = models.Member || model('Member', memberSchema);
export const ContributionPlan =
  models.ContributionPlan || model('ContributionPlan', contributionPlanSchema);
export const LedgerEntry = models.LedgerEntry || model('LedgerEntry', ledgerEntrySchema);
export const Event = models.Event || model('Event', eventSchema);
export const JoinRequest = models.JoinRequest || model('JoinRequest', joinRequestSchema);
export const Reminder = models.Reminder || model('Reminder', reminderSchema);
export const Reconciliation = models.Reconciliation || model('Reconciliation', reconciliationSchema);
export const AuditLog = models.AuditLog || model('AuditLog', auditLogSchema);
export const Settings = models.Settings || model('Settings', settingsSchema);
