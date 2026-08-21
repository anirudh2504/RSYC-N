/**
 * Dummy data for the demo run.
 *
 * Nothing here is persisted — the whole thing is rebuilt in memory every time
 * the server starts. Once MONGODB_URI is set, this same shape is what gets
 * written to the collections in models.js, so the switch is a swap of the
 * store, not a rewrite of the app.
 */

import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { periodRange, addMonths, rupees } from './utils.js';

const HASH_ROUNDS = 8;

/** The demo pretends "today" is whatever the machine clock says. */
const TODAY = new Date();
const CURRENT_PERIOD = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}`;

// Everything below is anchored relative to the current month so the demo never
// goes stale, no matter when someone runs it.
const P = (n) => addMonths(CURRENT_PERIOD, n);

const ADMINS = [
  {
    id: 'adm_master',
    name: 'Bhawani Singh Shekhawat',
    email: config.masterEmail,
    phone: '9829011001',
    role: 'master',
    isActive: true,
  },
  {
    id: 'adm_2',
    name: 'Devendra Singh Rathore',
    email: config.adminEmail,
    phone: '9829011002',
    role: 'admin',
    isActive: true,
  },
  {
    id: 'adm_3',
    name: 'Karni Singh',
    email: 'karni@rsyc.in',
    phone: '9829011003',
    role: 'admin',
    isActive: true,
  },
];

/**
 * joined  — month they started contributing
 * through — last month they have fully paid for (null = never paid)
 * amount  — monthly contribution in rupees
 * enabled — false means "in the club, not on the collection list"
 */
const MEMBERS = [
  { name: 'Bhawani Singh Shekhawat', father: 'Sh. Madho Singh Shekhawat', phone: '9829011001', joined: P(-7), through: P(0),  amount: 500, enabled: true },
  { name: 'Devendra Singh Rathore',  father: 'Sh. Bhairon Singh Rathore', phone: '9829011002', joined: P(-7), through: P(0),  amount: 500, enabled: true },
  { name: 'Karni Singh',             father: 'Sh. Gopal Singh',           phone: '9829011003', joined: P(-7), through: P(0),  amount: 300, enabled: true },
  { name: 'Mahendra Singh',          father: 'Sh. Roop Singh',            phone: '9829011004', joined: P(-7), through: P(2),  amount: 200, enabled: true },
  { name: 'Pratap Singh Rathore',    father: 'Sh. Sujan Singh Rathore',   phone: '9829011005', joined: P(-7), through: P(-1), amount: 200, enabled: true },
  { name: 'Rajveer Singh',           father: 'Sh. Bharat Singh',          phone: '9829011006', joined: P(-7), through: P(-3), amount: 200, enabled: true },
  { name: 'Shyam Singh Chundawat',   father: 'Sh. Amar Singh Chundawat',  phone: '9829011007', joined: P(-7), through: P(0),  amount: 200, enabled: true },
  { name: 'Ummed Singh',             father: 'Sh. Chandra Singh',         phone: '9829011008', joined: P(-6), through: P(-1), amount: 200, enabled: true },
  { name: 'Gajendra Singh',          father: 'Sh. Prithvi Singh',         phone: '9829011009', joined: P(-6), through: P(0),  amount: 200, enabled: true },
  { name: 'Hukam Singh Naruka',      father: 'Sh. Dalpat Singh Naruka',   phone: '9829011010', joined: P(-6), through: P(-4), amount: 200, enabled: true },
  { name: 'Jitendra Singh',          father: 'Sh. Kalyan Singh',          phone: '9829011011', joined: P(-6), through: P(0),  amount: 200, enabled: true },
  { name: 'Kishan Singh Tanwar',     father: 'Sh. Jorawar Singh Tanwar',  phone: '9829011012', joined: P(-5), through: P(-1), amount: 200, enabled: true },
  { name: 'Laxman Singh',            father: 'Sh. Nathu Singh',           phone: '9829011013', joined: P(-5), through: P(0),  amount: 300, enabled: true },
  { name: 'Narendra Singh Bhati',    father: 'Sh. Shakti Singh Bhati',    phone: '9829011014', joined: P(-5), through: P(-2), amount: 200, enabled: true },
  { name: 'Ranveer Singh',           father: 'Sh. Vijay Singh',           phone: '9829011015', joined: P(-4), through: P(0),  amount: 200, enabled: true },
  { name: 'Surendra Singh Kachhawa', father: 'Sh. Lal Singh Kachhawa',    phone: '9829011016', joined: P(-4), through: P(-1), amount: 200, enabled: true },
  { name: 'Vikram Singh',            father: 'Sh. Hanuman Singh',         phone: '9829011017', joined: P(-3), through: P(0),  amount: 200, enabled: true },
  { name: 'Yashpal Singh',           father: 'Sh. Onkar Singh',           phone: '9829011018', joined: P(-3), through: P(-2), amount: 200, enabled: true },
  { name: 'Bhanwar Lal Jat',         father: 'Sh. Ram Chandra Jat',       phone: '9829011019', joined: P(-7), through: null,  amount: 0,   enabled: false },
  { name: 'Om Prakash Sharma',       father: 'Sh. Ganga Ram Sharma',      phone: '9829011020', joined: P(-5), through: null,  amount: 0,   enabled: false },
];

const EVENTS = [
  {
    id: 'evt_jayanti',
    slug: 'rao-shekha-ji-jayanti',
    title: 'Rao Shekha Ji Jayanti',
    titleHi: 'राव शेखा जी जयंती',
    monthOffset: -5,
    day: 14,
    tags: ['जयंती', 'संस्कृति', 'समारोह'],
    description:
      'The club marks the birth anniversary of Rao Shekha Ji every year at the village chaupal. This year the day opened with a prabhat pheri through Nangla, followed by a shobha yatra, a talk on the history of Shekhawati for the schoolchildren, and prasad served to roughly four hundred people. The pandal, sound system and prasad were paid for out of the club fund.',
    photos: 6,
    palette: 0,
    autoSwipe: true,
  },
  {
    id: 'evt_holi',
    slug: 'holi-milan-samaroh',
    title: 'Holi Milan Samaroh',
    titleHi: 'होली मिलन समारोह',
    monthOffset: -5,
    day: 4,
    tags: ['होली', 'मिलन', 'गाँव'],
    description:
      'The whole village gathered at the club ground the evening after Dhulandi. Chang and dhol from the older members, a fagun geet competition that ran far longer than planned, and thandai for everyone. The club covered decorations, the sound system and refreshments.',
    photos: 5,
    palette: 1,
    autoSwipe: true,
  },
  {
    id: 'evt_raktdaan',
    slug: 'rakt-daan-shivir',
    title: 'Rakt Daan Shivir',
    titleHi: 'रक्तदान शिविर',
    monthOffset: -3,
    day: 10,
    tags: ['सेवा', 'स्वास्थ्य', 'शिविर'],
    description:
      'A blood donation camp run with the district hospital team at the government school. Sixty-two units collected, forty-one of them from first-time donors. The club arranged the hall, banners, refreshments and transport for the medical team.',
    photos: 4,
    palette: 2,
  },
  {
    id: 'evt_vriksharopan',
    slug: 'vriksharopan-abhiyan',
    title: 'Vriksharopan Abhiyan',
    titleHi: 'वृक्षारोपण अभियान',
    monthOffset: -1,
    day: 12,
    tags: ['पर्यावरण', 'सेवा', 'गाँव'],
    description:
      'Two hundred neem, peepal and gulmohar saplings planted along the road from the bus stand to the school, with tree guards on every one. Each sapling has a member named against it who waters it through the first summer.',
    photos: 5,
    palette: 3,
  },
  {
    id: 'evt_kabaddi',
    slug: 'kabaddi-pratiyogita',
    title: 'Kabaddi Pratiyogita',
    titleHi: 'कबड्डी प्रतियोगिता',
    monthOffset: 0,
    day: 30,
    tags: ['खेल', 'युवा', 'प्रतियोगिता'],
    description:
      'The annual inter-village kabaddi tournament on the club ground. Twelve teams from the surrounding villages have entered so far. Entry is free for players; trophies, mats and refreshments come from the club fund. Registration closes a week before.',
    photos: 3,
    palette: 4,
  },
];

const EXPENSES = [
  { monthOffset: -5, day: 16, amount: 11500, reason: 'Rao Shekha Ji Jayanti — pandal, sound system and prasad', takenBy: 'Devendra Singh Rathore', event: 'evt_jayanti' },
  { monthOffset: -5, day: 6,  amount: 6500,  reason: 'Holi Milan Samaroh — decorations, sound and thandai', takenBy: 'Karni Singh', event: 'evt_holi' },
  { monthOffset: -4, day: 21, amount: 2400,  reason: 'Water cooler repair at the government school', takenBy: 'Mahendra Singh', event: null },
  { monthOffset: -3, day: 12, amount: 4200,  reason: 'Rakt Daan Shivir — banners, refreshments and team transport', takenBy: 'Karni Singh', event: 'evt_raktdaan' },
  { monthOffset: -3, day: 28, amount: 7000,  reason: 'Emergency ambulance help for Bhanwar Lal ji’s family', takenBy: 'Bhawani Singh Shekhawat', event: null },
  { monthOffset: -2, day: 9,  amount: 5000,  reason: 'Club room whitewash and repair of the front gate', takenBy: 'Devendra Singh Rathore', event: null },
  { monthOffset: -1, day: 14, amount: 3600,  reason: 'Vriksharopan Abhiyan — saplings and tree guards', takenBy: 'Ranveer Singh', event: 'evt_vriksharopan' },
  { monthOffset: -1, day: 25, amount: 900,   reason: 'Printing of receipt books and club stationery', takenBy: 'Karni Singh', event: null },
  { monthOffset: 0,  day: 8,  amount: 9800,  reason: 'Kabaddi Pratiyogita — trophies, mats and ground preparation', takenBy: 'Devendra Singh Rathore', event: 'evt_kabaddi' },
];

const DONATIONS = [
  { monthOffset: -4, day: 18, amount: 5100, payer: 'Thakur Sahab, Nangla haveli', note: 'Donation towards the blood donation camp' },
  { monthOffset: -2, day: 22, amount: 2100, payer: 'Sarpanch ji', note: 'Donation on his daughter’s wedding' },
  { monthOffset: 0,  day: 6,  amount: 11000, payer: 'Nangla Pravasi Mandal, Jaipur', note: 'Contribution from villagers settled in Jaipur, for the kabaddi tournament' },
];

function dateFor(monthOffset, day) {
  const period = P(monthOffset);
  const [y, m] = period.split('-').map(Number);
  const safeDay = Math.min(day, new Date(y, m, 0).getDate());
  return new Date(Date.UTC(y, m - 1, safeDay, 6, 0, 0)).toISOString();
}

/** How many months a 'YYYY-MM' sits away from the current month. */
function offsetOf(period) {
  const [y, m] = period.split('-').map(Number);
  const [cy, cm] = CURRENT_PERIOD.split('-').map(Number);
  return (y - cy) * 12 + (m - cm);
}

export function buildSeed() {
  const admins = ADMINS.map((a) => ({
    ...a,
    passwordHash: bcrypt.hashSync(
      a.role === 'master' ? config.masterPassword : config.adminPassword,
      HASH_ROUNDS,
    ),
    lastLoginAt: null,
    createdAt: dateFor(-7, 1),
  }));

  const members = [];
  const plans = [];
  const entries = [];
  const auditLogs = [];

  MEMBERS.forEach((m, i) => {
    const id = `mem_${String(i + 1).padStart(2, '0')}`;
    members.push({
      id,
      name: m.name,
      fatherName: m.father,
      phone: m.phone,
      joinedOn: dateFor(offsetOf(m.joined), 1),
      joinedPeriod: m.joined,
      status: 'active',
      notes: '',
      createdAt: dateFor(-7, 1),
      createdByAdminId: 'adm_master',
    });

    plans.push({
      id: `pln_${id}`,
      memberId: id,
      amountPaise: rupees(m.amount),
      isEnabled: m.enabled,
      effectiveFrom: m.joined,
      effectiveTo: null,
      createdByAdminId: 'adm_master',
      createdAt: dateFor(-7, 1),
    });
  });

  // ---- opening balance -----------------------------------------------------
  entries.push({
    id: 'led_opening',
    direction: 'credit',
    kind: 'opening',
    amountPaise: rupees(45000),
    memberId: null,
    payerName: null,
    allocations: [],
    reason: null,
    takenBy: null,
    note: 'Balance carried over from the club register',
    eventId: null,
    occurredOn: dateFor(-7, 1),
    createdAt: dateFor(-7, 1),
    lockedAt: dateFor(-7, 1),
    isReversed: false,
    reversesEntryId: null,
    reversalReason: null,
    createdByAdminId: 'adm_master',
  });

  // ---- monthly contributions ----------------------------------------------
  let seq = 0;
  members.forEach((member, i) => {
    const src = MEMBERS[i];
    if (!src.through || !src.enabled) return;

    const periods = periodRange(src.joined, src.through);
    const amountPaise = rupees(src.amount);

    // Two members pay several months at once, so the feed shows multi-month
    // allocations rather than one tidy row per month.
    const bulk = i === 3 || i === 12;

    if (bulk) {
      const chunk = periods.slice(0, Math.max(periods.length - 2, 1));
      const rest = periods.slice(chunk.length);
      if (chunk.length) {
        seq += 1;
        entries.push(contribution(member, chunk, amountPaise, seq, src));
      }
      rest.forEach((p) => {
        seq += 1;
        entries.push(contribution(member, [p], amountPaise, seq, src));
      });
    } else {
      periods.forEach((p) => {
        seq += 1;
        entries.push(contribution(member, [p], amountPaise, seq, src));
      });
    }
  });

  function contribution(member, periods, amountPaise, n, src) {
    const last = periods[periods.length - 1];
    // Months paid in advance were still handed over today, not in the future.
    const offset = Math.min(offsetOf(last), 0);
    const day = 3 + (n % 6);
    const when = dateFor(offset, day);
    return {
      id: `led_c${String(n).padStart(3, '0')}`,
      direction: 'credit',
      kind: 'contribution',
      amountPaise: amountPaise * periods.length,
      memberId: member.id,
      payerName: null,
      allocations: periods.map((p) => ({ period: p, amountPaise })),
      reason: null,
      takenBy: null,
      note: periods.length > 1 ? `${periods.length} months paid together` : '',
      eventId: null,
      occurredOn: when,
      createdAt: when,
      lockedAt: when,
      isReversed: false,
      reversesEntryId: null,
      reversalReason: null,
      createdByAdminId: n % 3 === 0 ? 'adm_3' : n % 2 === 0 ? 'adm_2' : 'adm_master',
    };
  }

  // ---- a partial payment for the current month ----------------------------
  const partialMember = members[7];
  entries.push({
    id: 'led_partial',
    direction: 'credit',
    kind: 'contribution',
    amountPaise: rupees(100),
    memberId: partialMember.id,
    payerName: null,
    allocations: [{ period: CURRENT_PERIOD, amountPaise: rupees(100) }],
    reason: null,
    takenBy: null,
    note: 'Part payment, balance promised next week',
    eventId: null,
    occurredOn: dateFor(0, 11),
    createdAt: dateFor(0, 11),
    lockedAt: dateFor(0, 11),
    isReversed: false,
    reversesEntryId: null,
    reversalReason: null,
    createdByAdminId: 'adm_2',
  });

  // ---- donations from non-members -----------------------------------------
  DONATIONS.forEach((d, i) => {
    entries.push({
      id: `led_d${i + 1}`,
      direction: 'credit',
      kind: 'donation',
      amountPaise: rupees(d.amount),
      memberId: null,
      payerName: d.payer,
      allocations: [],
      reason: null,
      takenBy: null,
      note: d.note,
      eventId: null,
      occurredOn: dateFor(d.monthOffset, d.day),
      createdAt: dateFor(d.monthOffset, d.day),
      lockedAt: dateFor(d.monthOffset, d.day),
      isReversed: false,
      reversesEntryId: null,
      reversalReason: null,
      createdByAdminId: 'adm_master',
    });
  });

  // ---- expenses ------------------------------------------------------------
  EXPENSES.forEach((e, i) => {
    entries.push({
      id: `led_e${i + 1}`,
      direction: 'debit',
      kind: 'expense',
      amountPaise: rupees(e.amount),
      memberId: null,
      payerName: null,
      allocations: [],
      reason: e.reason,
      takenBy: e.takenBy,
      note: '',
      eventId: e.event,
      occurredOn: dateFor(e.monthOffset, e.day),
      createdAt: dateFor(e.monthOffset, e.day),
      lockedAt: dateFor(e.monthOffset, e.day),
      isReversed: false,
      reversesEntryId: null,
      reversalReason: null,
      createdByAdminId: i % 2 === 0 ? 'adm_master' : 'adm_2',
    });
  });

  // ---- one corrected entry, so the feed shows a reversal -------------------
  const wrongWhen = dateFor(-2, 17);
  entries.push({
    id: 'led_wrong',
    direction: 'credit',
    kind: 'contribution',
    amountPaise: rupees(2000),
    memberId: members[6].id,
    payerName: null,
    allocations: [{ period: P(-2), amountPaise: rupees(2000) }],
    reason: null,
    takenBy: null,
    note: '',
    eventId: null,
    occurredOn: wrongWhen,
    createdAt: wrongWhen,
    lockedAt: wrongWhen,
    isReversed: true,
    reversesEntryId: null,
    reversalReason: 'Amount typed as 2000 instead of 200',
    createdByAdminId: 'adm_3',
  });
  entries.push({
    id: 'led_wrong_rev',
    direction: 'debit',
    kind: 'reversal',
    amountPaise: rupees(2000),
    memberId: members[6].id,
    payerName: null,
    allocations: [],
    reason: 'Reversal — amount typed as 2000 instead of 200',
    takenBy: null,
    note: '',
    eventId: null,
    occurredOn: dateFor(-2, 18),
    createdAt: dateFor(-2, 18),
    lockedAt: dateFor(-2, 18),
    isReversed: false,
    reversesEntryId: 'led_wrong',
    reversalReason: 'Amount typed as 2000 instead of 200',
    createdByAdminId: 'adm_master',
  });

  // ---- one balance correction ---------------------------------------------
  entries.push({
    id: 'led_adj',
    direction: 'debit',
    kind: 'adjustment',
    amountPaise: rupees(300),
    memberId: null,
    payerName: null,
    allocations: [],
    reason: 'Cash counted short against the register during the half-yearly check',
    takenBy: null,
    note: '',
    eventId: null,
    occurredOn: dateFor(-1, 30),
    createdAt: dateFor(-1, 30),
    lockedAt: dateFor(-1, 30),
    isReversed: false,
    reversesEntryId: null,
    reversalReason: null,
    createdByAdminId: 'adm_master',
  });

  // ---- events --------------------------------------------------------------
  const events = EVENTS.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    titleHi: e.titleHi,
    description: e.description,
    eventDate: dateFor(e.monthOffset, e.day),
    tags: e.tags,
    palette: e.palette,
    coverUrl: '',
    autoSwipe: e.autoSwipe || false,
    photos: Array.from({ length: e.photos }, (_, i) => ({
      id: `${e.id}_p${i + 1}`,
      seed: `${e.id}-${i}`,
      caption: '',
      order: i,
    })),
    isPublished: true,
    createdByAdminId: 'adm_2',
    createdAt: dateFor(e.monthOffset, 1),
    updatedAt: dateFor(e.monthOffset, 1),
  }));

  // ---- join requests -------------------------------------------------------
  const joinRequests = [
    {
      id: 'jr_1',
      name: 'Arjun Singh Rathore',
      phone: '9829012201',
      message: 'I have shifted back to Nangla from Jaipur and would like to join the club.',
      status: 'pending',
      createdAt: dateFor(0, 12),
      reviewedByAdminId: null,
      reviewedAt: null,
      rejectionReason: null,
    },
    {
      id: 'jr_2',
      name: 'Sanwar Mal Saini',
      phone: '9829012202',
      message: 'Want to help with the tree planting work. Please add me.',
      status: 'pending',
      createdAt: dateFor(0, 15),
      reviewedByAdminId: null,
      reviewedAt: null,
      rejectionReason: null,
    },
    {
      id: 'jr_3',
      name: 'Tejpal Singh',
      phone: '9829012203',
      message: 'My father was a member. I would like to continue in his place.',
      status: 'pending',
      createdAt: dateFor(0, 17),
      reviewedByAdminId: null,
      reviewedAt: null,
      rejectionReason: null,
    },
  ];

  // ---- audit log -----------------------------------------------------------
  [
    ['adm_master', 'settings.pin.rotate', 'settings', 'Settings', 'Group PIN changed'],
    ['adm_2', 'ledger.money-in', 'money-in', 'LedgerEntry', 'Rs 200 in from Gajendra Singh'],
    ['adm_2', 'ledger.money-out', 'money-out', 'LedgerEntry', 'Rs 9800 out — Kabaddi Pratiyogita trophies and mats'],
    ['adm_master', 'ledger.adjust', 'correction', 'LedgerEntry', 'Balance corrected by -Rs 300'],
    ['adm_3', 'member.plan', 'member', 'Member', 'Changed monthly amount for Laxman Singh'],
    ['adm_master', 'ledger.reverse', 'correction', 'LedgerEntry', 'Reversed an entry of Rs 2000'],
    ['adm_2', 'event.create', 'event', 'Event', 'Created event: Kabaddi Pratiyogita'],
    ['adm_2', 'reminder.send', 'reminder', 'Reminder', 'Reminded Rajveer Singh'],
  ].forEach(([actor, action, category, entity, summary], i) => {
    auditLogs.push({
      id: `aud_${i + 1}`,
      actorAdminId: actor,
      action,
      category,
      entityType: entity,
      entityId: null,
      summary,
      ip: '192.168.1.' + (10 + i),
      createdAt: dateFor(0, 18 - i),
    });
  });

  const reminders = [
    { id: 'rem_1', memberId: 'mem_06', periods: [P(-2), P(-1), P(0)], amountPaise: rupees(600), channel: 'whatsapp', sentByAdminId: 'adm_2', sentAt: dateFor(0, 14) },
    { id: 'rem_2', memberId: 'mem_10', periods: [P(-3), P(-2), P(-1), P(0)], amountPaise: rupees(800), channel: 'whatsapp', sentByAdminId: 'adm_2', sentAt: dateFor(0, 14) },
  ];

  const settings = {
    id: 'set_1',
    groupName: 'Rav Shekha Ji Yuva Club',
    groupNameHi: 'राव शेखा जी युवा क्लब',
    village: 'Nangla',
    villageHi: 'नंगला',
    tagline: 'Serving the village since the club was founded',
    aboutHi:
      'राव शेखा जी युवा क्लब नंगला गाँव की युवा समिति है। सदस्य हर महीने एक निश्चित राशि साझा कोष में जमा करते हैं, और उसी कोष से गाँव के साझा काम होते हैं — त्योहार, शिविर, मरम्मत, खेलकूद और किसी परिवार पर आई आपात स्थिति में मदद।\n\nजो भी पैसा आता है और जो भी खर्च होता है, सब यहाँ दर्ज रहता है। क्लब का पिन रखने वाला गाँव का कोई भी व्यक्ति पूरा हिसाब देख सकता है।',
    about:
      'Rav Shekha Ji Yuva Club is the youth committee of Nangla. Members contribute a fixed amount every month into one shared fund, and that fund pays for the work the village decides on together — festivals, camps, repairs, sports, and help for families in an emergency.\n\nThe club takes its name from Rao Shekha Ji, the fifteenth-century Rajput ruler whose line gives Shekhawati its name. Every rupee that comes in and every rupee that goes out is recorded here, and any member of the village with the club PIN can see all of it.',
    rules: [
      'The monthly contribution is due by the tenth of each month.',
      'No money leaves the fund without a written reason recorded against it.',
      'Every entry is permanent. Mistakes are corrected by a visible reversal, never by deleting.',
      'The accounts are checked against the passbook at the end of every month.',
      'Any member may ask for the full statement at any time.',
    ],
    bankAccountLabel: 'SBI Nangla — A/c ****4821',
    upiId: 'rsycnangla@upi',
    paymentPhone: '9829011001',
    whatsappGroupUrl: '',
    contactPhone: '9829011001',

    // Shown on the About page, Hindi first. All of it is editable from club
    // settings — the club should check it and put it in its own words.
    founderName: 'Rao Shekha Ji',
    founderNameHi: 'राव शेखा जी',
    founderYears: '1433 – 1488',
    founderPhotoUrl: '/images/rao-shekha-ji.jpg',

    founderAboutHi:
      'राव शेखा जी का जन्म सन् 1433 में हुआ। वे अमरसर (नान) के राव मोकल के पुत्र थे और कछवाहा राजपूत वंश से थे।\n\nपरंपरा के अनुसार उनके माता-पिता को संतान की प्राप्ति शेख बुरहान की दरगाह पर मनोकामना माँगने के बाद हुई, इसीलिए बालक का नाम "शेखा" रखा गया। यह कथा आज भी इस क्षेत्र में आपसी सौहार्द की पहचान के रूप में कही जाती है।\n\nयुवावस्था में ही गद्दी सँभालने के बाद उन्होंने अपना राज्य विस्तृत किया और आमेर की अधीनता से स्वतंत्र होकर अपनी अलग पहचान बनाई। उन्हीं के नाम से शेखावत वंश चला और यह पूरा क्षेत्र आज "शेखावाटी" कहलाता है।\n\nसन् 1488 में उनका देहांत हुआ।\n\nक्लब उनका नाम इसी भाव से धारण करता है — अपने लोगों के साथ खड़े रहना और उनकी सेवा करना।',

    // Why the club exists.
    purposeHi:
      'क्लब का उद्देश्य गाँव के युवाओं को खेलकूद और अच्छे कामों की ओर प्रेरित करना है — ताकि गाँव की नई पीढ़ी आगे बढ़े और गाँव का नाम रोशन करे।',
    purpose:
      'The club exists to turn the young people of the village towards sport and towards work worth doing — so that the next generation of Nangla goes further than the last.',

    purposePointsHi: [
      'खेल प्रतियोगिताएँ कराना — कबड्डी, वॉलीबॉल और दौड़',
      'त्योहार और सांस्कृतिक कार्यक्रम आयोजित करना',
      'रक्तदान और स्वास्थ्य शिविर लगाना',
      'वृक्षारोपण और गाँव की साफ़-सफ़ाई',
      'युवाओं को नशे से दूर रखकर सही दिशा देना',
      'किसी परिवार पर आई आपात स्थिति में मदद करना',
    ],
    purposePoints: [
      'Hold sports competitions — kabaddi, volleyball and races',
      'Organise festivals and cultural programmes',
      'Run blood donation and health camps',
      'Plant trees and keep the village clean',
      'Steer young people away from addiction and towards something better',
      'Help any family in the village that hits an emergency',
    ],

    // "Contribution of Rao Shekha Ji" — a short historical section.
    founderContributionHi: [
      'उन्होंने अमरसर की छोटी सी जागीर को एक स्वतंत्र और सशक्त राज्य में बदला।',
      'आमेर की अधीनता स्वीकार करने से इनकार कर अपने क्षेत्र की अलग पहचान बनाई।',
      'उन्हीं के नाम से शेखावत वंश चला, जिसकी शाखाएँ आगे सीकर, खंडेला, झुंझुनूँ और नवलगढ़ तक फैलीं।',
      'आज का पूरा शेखावाटी क्षेत्र उन्हीं के नाम पर जाना जाता है।',
      'परंपरा के अनुसार उनकी सेना में पन्नी पठान भी सम्मिलित थे — उस समय के लिए यह असाधारण बात थी।',
      'शेख बुरहान की दरगाह से जुड़ी उनकी जन्म-कथा आज भी आपसी सौहार्द की मिसाल के रूप में कही जाती है।',
    ],
    founderContribution: [
      'He turned the small holding of Amarsar into an independent and capable state.',
      'He refused to stay under the authority of Amber and won a separate standing for his territory.',
      'The Shekhawat clan descends from him; its branches later spread to Sikar, Khandela, Jhunjhunu and Nawalgarh.',
      'The whole Shekhawati region is known by his name to this day.',
      'By tradition his forces included Panni Pathans alongside his own men — unusual for that time.',
      'The story of his birth at the shrine of Sheikh Burhan is still told as an example of communities standing together.',
    ],

    founderAbout:
      'Rao Shekha Ji was born in 1433, son of Rao Mokal of Amarsar (Nan), of the Kachhwaha Rajput line.\n\nBy tradition his parents were granted a son after praying at the shrine of Sheikh Burhan, and the boy was named Shekha in his honour — a story the region still tells as a mark of how its communities have lived alongside one another.\n\nHe came to the gaddi as a young man, extended his territory across what is now Shekhawati, and asserted his independence from Amber. The Shekhawat clan descends from him, and the whole region carries his name to this day.\n\nHe died in 1488.\n\nThe club takes his name for the same reason the region does: for standing with his own people and looking after them.',
    pinHash: bcrypt.hashSync(config.demoPin, HASH_ROUNDS),
    pinVersion: 3,
    pinUpdatedAt: dateFor(-1, 2),
    pinUpdatedByAdminId: 'adm_master',
    viewerSessionDays: config.viewerSessionDays,
    showPaidBoard: true,
    defaultAmountPaise: rupees(200),
    notice:
      'Kabaddi Pratiyogita registration closes this Sunday. Team entries with Devendra ji or Karni ji.',
    locale: 'en',
  };

  return { admins, members, plans, entries, events, joinRequests, auditLogs, reminders, settings };
}

export { CURRENT_PERIOD };
