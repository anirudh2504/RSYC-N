# RSYC — Rav Shekha Ji Yuva Club, Nangla

राव शेखा जी युवा क्लब, नांगला

A shared fund ledger and noticeboard for the village club. Members contribute a
fixed amount every month; anyone holding the club PIN can see the balance and
every rupee that has left it. Admins record. Nobody needs a username.

Built with the MERN stack, mobile first.

---

## Running it

```bash
npm run install:all
```

```bash
npm run dev
```

- Client → http://localhost:5173
- API → http://localhost:5000

Vite proxies `/api` to the Express server, so everything is same-origin in the
browser and the session cookies work with no CORS setup.

To run the two halves separately:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

### Demo sign-ins

The app is currently running on **in-memory dummy data**. Nothing is written to
disk, and every restart rebuilds the same seed.

| | |
|---|---|
| Club PIN | `Anirudh@1234` |
| Master admin | `anirajput20022@gmial.com` / `Indian@12` |
| Admin | `tryideas2504@gmail.com` / `Indian@12` |

These are printed in the server console at startup and shown on the unlock and
sign-in screens. Both disappear automatically the moment a database is
connected.

All three are set in `server/.env` (`DEMO_PIN`, `MASTER_EMAIL`,
`MASTER_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`) — change them there rather
than in the code. Once the app is live, the club PIN is changed from
`/admin/pin` instead, which also ends every existing viewer session.

---

## Connecting your MongoDB cluster

1. `cp server/.env.example server/.env`
2. Paste the Atlas connection string into `MONGODB_URI`
3. Change `JWT_SECRET` to something random
4. Restart the server

The Mongoose schemas are already written, with the right indexes and
constraints, in [`server/src/models.js`](server/src/models.js). The only piece
left to write is swapping the bodies of the accessors in
[`server/src/store.js`](server/src/store.js) from array operations to Mongoose
queries. Every service, route and React component talks to that store and none
of them change.

Atlas gives you a replica set, so multi-document transactions are available —
use one in the bulk collect path where several entries must land together.

---

## Who can see what

| | Open | Viewer | Admin | Master |
|---|:--:|:--:|:--:|:--:|
| Events and photos | ✓ | ✓ | ✓ | ✓ |
| Request to join | ✓ | ✓ | ✓ | ✓ |
| Balance and transactions | — | ✓ | ✓ | ✓ |
| Member list **with phone numbers** | — | ✓ | ✓ | ✓ |
| Record money in and out | — | — | ✓ | ✓ |
| Manage members, events, reminders | — | — | ✓ | ✓ |
| Correct the balance | — | — | — | ✓ |
| Set or rotate the club PIN | — | — | — | ✓ |
| Add and remove admins, audit log | — | — | — | ✓ |

**Open** is anyone with the link. They see the events page and nothing else —
no balance, no names, no numbers.

**Viewer** is anyone who typed the club PIN. No account, no signup. The PIN is
the whole identity.

Three separate Express routers sit behind three different guards. The open
router has no import path to the ledger, member or dues services at all, so a
phone number cannot leak from it through a mistake in a conditional.

---

## The rules the ledger follows

1. **Money is an integer number of paise.** ₹200 is `20000`. Never a float.
   Formatting to `₹1,84,500` happens in the browser at the last moment.

2. **The balance is a sum over the entries, never a stored number.** Two admins
   saving at the same moment cannot corrupt it, and fixing an entry fixes the
   balance automatically.

3. **Entries are append-only after 15 minutes.** Inside the window an entry is
   freely editable so a typo can just be fixed. After that the only route is a
   *reversal*: a new entry of equal amount and opposite direction pointing back
   at the original. The original stays in the feed, struck through and tagged.
   The pair nets to zero in the balance.

4. **The transaction date is set once.** `occurredOn` is admin-settable and
   defaults to today; `createdAt` is the server clock and is never editable.
   When they differ, both are shown — *14 Aug · recorded 19 Aug* — so a
   backdated entry can never look like it was always there.

5. **Balance corrections are entries too.** There is no "set the balance to X"
   write anywhere in this codebase. The master admin states the true figure and
   a mandatory reason; the system posts an ordinary, visible `adjustment` entry
   for the difference.

6. **Credits carry their month allocation.** One row moves the balance *and*
   settles specific months of dues, so there is no second bookkeeping system to
   drift out of sync. Partial and advance payments fall out of this for free.

7. **The monthly amount lives in `contributionPlans`, with effective dates.**
   Change a member from ₹500 to ₹300 and a *new* plan row is written from this
   month forward. Every past month keeps the amount that was actually in force
   at the time.

---

## The PIN

Stored as a bcrypt hash and never displayed — a master admin who forgets it sets
a new one rather than looking it up. Unlocking sets a 30-day `httpOnly` cookie
carrying `role: viewer` and the current `pinVersion`.

**Rotation is the whole revocation story.** Changing the PIN increments
`pinVersion`, and every cookie in the village carries the old number. They all
stop working at the same instant — no session table to sweep, no cleanup job.

A shared PIN cannot be revoked for one person, and it will eventually be
forwarded outside the club's WhatsApp group. Rotate it whenever someone leaves.
Two or three easy words (`nangla-club-2026`) is far stronger than four digits
and just as easy to say aloud at a meeting.

---

## Layout

```
RSYC/
├─ server/
│  └─ src/
│     ├─ index.js          Express app, mounts the three routers
│     ├─ config.js         everything has a working default
│     ├─ seed.js           the dummy data, anchored to today's date
│     ├─ store.js          in-memory store — swap this for Mongoose
│     ├─ models.js         Mongoose schemas, ready and unused
│     ├─ utils.js          paise, periods, slugs
│     ├─ middleware/auth.js   requireViewer / requireAdmin / requireMaster
│     ├─ services/
│     │  ├─ ledger.js      balance, post, reverse, adjust
│     │  └─ dues.js        who paid, who did not, months pending
│     └─ routes/
│        ├─ open.js        no auth — events, about, join request
│        ├─ access.js      unlock, lock
│        ├─ auth.js        admin sign in
│        ├─ view.js        PIN-gated, read only
│        └─ admin.js       admin + master writes
└─ client/
   └─ src/
      ├─ App.jsx           routes and the three guards
      ├─ styles/           design tokens, then components
      ├─ components/       Ornaments (all the SVG), ui, Layout, LedgerRow
      ├─ context/Session.jsx
      ├─ lib/              api client, money and date formatting
      └─ pages/
         ├─ open/          Events, EventDetail, About, Join, Unlock, Login
         ├─ viewer/        Fund, Transactions, Members, Collection
         ├─ admin/         Dashboard, AddTransaction, Collect, Members, …
         └─ master/        Adjust, Pin, Admins, Audit, Settings
```

---

## The design

The palette comes from Shekhawati — the indigo of Rajput court dress and
painted haveli walls, marigold and saffron from festival garlands, oxblood, and
antique brass for the hairlines. Neutrals are warm sandstone rather than grey.

Every piece of artwork is **drawn in the browser as SVG**: the club crest is a
jharokha arch with a diya, the balance card sits behind a pierced jali screen,
and event covers are deterministic mandala panels generated from the event slug.
There are no image files and no external image requests, so nothing can 404 and
the gallery costs almost nothing on a weak signal.

Type is Rozha One for display and Mukta for body — both carry Devanagari, so the
Hindi names set properly alongside the English. Both are loaded from Google
Fonts with full local fallbacks, so the app renders correctly offline.

Light and dark are both designed, driven by `prefers-color-scheme`.

### Built for a phone

- Mobile-first CSS throughout; every breakpoint is `min-width`
- Fixed bottom navigation that becomes a top tab bar on wide screens
- `env(safe-area-inset-*)` respected, 44px minimum tap targets
- All inputs are 16px so iOS Safari never zooms the page on focus
- `overflow-x: hidden` on the body; wide content scrolls inside its own container
- `prefers-reduced-motion` respected

---

## What is not built yet

Deliberately out of scope for now, and noted so nobody goes looking:

- **Photo upload.** The gallery draws generated artwork. Adding real uploads
  means multer plus Cloudinary, with EXIF stripped server-side — event photos
  carry GPS coordinates that can identify people's homes.
- **A real UPI QR image.** The fund page shows the UPI ID and a `upi://` deep
  link instead, which is the better mobile flow anyway. A QR needs a library.
- **Passbook reconciliation, monthly PDF statement, Hindi UI toggle, CSV
  export.** All designed, none built.
- **2FA on the master account.** The schema field is there.
