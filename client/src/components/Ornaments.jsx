import { useState } from 'react';

import { imageUrl } from '../lib/upload.js';

/**
 * Hand-drawn SVG motifs.
 *
 * Everything visual in this app is drawn in the browser — there are no image
 * files and no external requests, so nothing can 404, nothing costs bandwidth
 * on a weak signal, and the artwork picks up the theme colours automatically.
 *
 * The shapes are Shekhawati: the cusped mehrab arch of a jharokha window, the
 * pierced jali screen, and the chhatri dome.
 */

/** Small deterministic hash, so an event always draws the same artwork. */
function hash(seed) {
  let h = 2166136261;
  const s = String(seed || 'rsyc');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/* ------------------------------------------------------------------ crest */

export function Crest({ className, title = 'Club crest' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label={title}>
      <defs>
        <linearGradient id="crestG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c3f92" />
          <stop offset="100%" stopColor="#141f52" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#crestG)" />
      {/* the jharokha arch */}
      <path
        d="M32 12c9.4 0 15 6.4 15 15v23H17V27c0-8.6 5.6-15 15-15z"
        fill="none"
        stroke="#e3b45c"
        strokeWidth="2"
      />
      <path
        d="M32 18c6 0 9.6 4.1 9.6 9.6V50H22.4V27.6C22.4 22.1 26 18 32 18z"
        fill="none"
        stroke="#e08a1e"
        strokeWidth="1.3"
        opacity="0.85"
      />
      {/* the diya flame */}
      <circle cx="32" cy="30" r="3.6" fill="#e08a1e" />
      <path d="M32 22.6c1.9 2.2 2.8 3.9 2.8 5.4a2.8 2.8 0 1 1-5.6 0c0-1.5.9-3.2 2.8-5.4z" fill="#f6d78a" />
      {/* base steps */}
      <rect x="14" y="50" width="36" height="2.4" rx="1.2" fill="#e3b45c" />
      <rect x="17.5" y="54" width="29" height="2.1" rx="1" fill="#e3b45c" opacity="0.7" />
    </svg>
  );
}

/* ------------------------------------------------------------------- jali */

/** The pierced screen that sits behind the balance card. */
export function Jali({ className }) {
  return (
    <svg className={className} viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="jaliP" width="24" height="24" patternUnits="userSpaceOnUse">
          <path
            d="M12 0c6.6 0 12 5.4 12 12s-5.4 12-12 12S0 18.6 0 12 5.4 0 12 0z"
            fill="none"
            stroke="#fdf6e8"
            strokeWidth="1"
          />
          <path d="M12 4l8 8-8 8-8-8z" fill="none" stroke="#fdf6e8" strokeWidth="0.8" />
          <circle cx="12" cy="12" r="1.6" fill="#fdf6e8" />
          <path d="M0 12h24M12 0v24" stroke="#fdf6e8" strokeWidth="0.4" opacity="0.55" />
        </pattern>
      </defs>
      <rect width="120" height="120" fill="url(#jaliP)" />
    </svg>
  );
}

/* ------------------------------------------------------- event artwork ---- */

const PALETTES = [
  { a: '#1b2a6b', b: '#3b2a7a', ink: '#f3c777' }, // indigo court
  { a: '#8c2b21', b: '#c1461f', ink: '#f7d9a0' }, // holi oxblood
  { a: '#1f5c4c', b: '#2f7d5c', ink: '#ffe0a8' }, // neem green
  { a: '#7a3d12', b: '#b8651c', ink: '#ffe3ab' }, // sandstone
  { a: '#3d2358', b: '#6c3579', ink: '#f6c9d8' }, // dusk
  { a: '#123a5c', b: '#1f6788', ink: '#ffd79a' }, // stepwell blue
];

/**
 * A deterministic jali panel, used everywhere a photograph would go. Same seed
 * always draws the same panel, so galleries look stable between renders.
 */
export function EventArt({ seed, palette = 0, className }) {
  const h = hash(seed);
  const p = PALETTES[(palette + (h % 3)) % PALETTES.length];
  const rings = 3 + (h % 3);
  const cusps = 7 + (h % 6);
  const rot = h % 30;

  const petals = [];
  for (let i = 0; i < cusps; i += 1) {
    const angle = (360 / cusps) * i + rot;
    petals.push(
      <g key={i} transform={`rotate(${angle} 100 100)`}>
        <path
          d="M100 34c9 10 13.5 19 13.5 27S107 76 100 76s-13.5-7-13.5-15S91 44 100 34z"
          fill={p.ink}
          opacity="0.32"
        />
        <path d="M100 24v18" stroke={p.ink} strokeWidth="1.4" opacity="0.5" />
      </g>,
    );
  }

  const ringEls = [];
  for (let i = 0; i < rings; i += 1) {
    ringEls.push(
      <circle
        key={i}
        cx="100"
        cy="100"
        r={30 + i * 17}
        fill="none"
        stroke={p.ink}
        strokeWidth={i % 2 ? 0.8 : 1.5}
        opacity={0.3 + i * 0.06}
        strokeDasharray={i % 2 ? '3 5' : 'none'}
      />,
    );
  }

  const gid = `ea${h % 100000}`;

  return (
    <svg className={className} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${gid}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.a} />
          <stop offset="100%" stopColor={p.b} />
        </linearGradient>
        <pattern id={`${gid}p`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M10 1l9 9-9 9-9-9z" fill="none" stroke={p.ink} strokeWidth="0.5" opacity="0.35" />
        </pattern>
      </defs>

      <rect width="200" height="200" fill={`url(#${gid}g)`} />
      <rect width="200" height="200" fill={`url(#${gid}p)`} />

      {/* the mehrab arch frame */}
      <path
        d="M28 186V74c0-30 22-52 72-52s72 22 72 52v112"
        fill="none"
        stroke={p.ink}
        strokeWidth="1.6"
        opacity="0.55"
      />
      <path
        d="M42 186V78c0-24 18-42 58-42s58 18 58 42v108"
        fill="none"
        stroke={p.ink}
        strokeWidth="0.9"
        opacity="0.35"
      />

      {ringEls}
      {petals}

      <circle cx="100" cy="100" r="7" fill={p.ink} opacity="0.85" />
      <rect x="20" y="188" width="160" height="3" rx="1.5" fill={p.ink} opacity="0.5" />
    </svg>
  );
}

/**
 * An event picture: the real photograph if one has been uploaded, otherwise the
 * drawn panel. Seeded events and any event without photos keep their artwork,
 * so the galleries are never empty and a broken file never leaves a gap.
 */
export function EventImage({ url, seed, palette = 0, alt = '', width }) {
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    // Ask the image host for the size this spot actually needs, rather than
    // pulling the full upload every time.
    return (
      <img src={imageUrl(url, { width })} alt={alt} loading="lazy" onError={() => setFailed(true)} />
    );
  }
  return <EventArt seed={seed} palette={palette} />;
}

/* ------------------------------------------------------------- empty mark */

export function EmptyMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M24 6c9 0 14 6 14 14v22H10V20C10 12 15 6 24 6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M17 42V27h14v15" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="24" cy="20" r="2.6" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

/* ------------------------------------------------------------------ icons */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const Icon = {
  // The handle for dragging a member up or down the board.
  grip: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 7h.01M15 7h.01M9 12h.01M15 12h.01M9 17h.01M15 17h.01"
        {...stroke}
        strokeWidth="2.6"
      />
    </svg>
  ),
  home: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 11.5 12 4l8 7.5" {...stroke} />
      <path d="M6 10.5V20h12v-9.5" {...stroke} />
    </svg>
  ),
  ledger: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h11l3 3v13H5z" {...stroke} />
      <path d="M8.5 10h7M8.5 14h7" {...stroke} />
    </svg>
  ),
  people: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9.5" cy="8.5" r="3.2" {...stroke} />
      <path d="M3.8 19c.6-3.2 3-5 5.7-5s5.1 1.8 5.7 5" {...stroke} />
      <path d="M16.5 7.2a3 3 0 0 1 0 5.8M17.5 14.4c2 .5 3.3 2.1 3.7 4.6" {...stroke} />
    </svg>
  ),
  calendar: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" {...stroke} />
      <path d="M4 10h16M9 3.5v4M15 3.5v4" {...stroke} />
    </svg>
  ),
  board: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4.5" width="16" height="15" rx="2.5" {...stroke} />
      <path d="M8 12.2l2.4 2.4L16 9" {...stroke} />
    </svg>
  ),
  plus: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5.5v13M5.5 12h13" {...stroke} />
    </svg>
  ),
  more: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5.5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="18.5" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  back: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M14.5 5.5 8 12l6.5 6.5" {...stroke} />
    </svg>
  ),
  chevron: () => (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path d="M9.5 5.5 16 12l-6.5 6.5" {...stroke} />
    </svg>
  ),
  lock: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" {...stroke} />
      <path d="M8.4 10.5V8a3.6 3.6 0 0 1 7.2 0v2.5" {...stroke} />
    </svg>
  ),
  whatsapp: () => (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path
        d="M12 3.6a8.3 8.3 0 0 0-7.1 12.6L3.8 20.4l4.3-1.1A8.3 8.3 0 1 0 12 3.6z"
        {...stroke}
      />
      <path d="M9 9.2c.3 2.4 3.3 5.4 5.8 5.8l1-1.4 1.6.8-.5 1.5c-2.9.6-7.5-3.5-8.4-6.6l1.4-.6z" fill="currentColor" />
    </svg>
  ),
  phone: () => (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path
        d="M6.2 4.5h3l1.4 3.4-1.9 1.5a11 11 0 0 0 5.4 5.4l1.5-1.9 3.4 1.4v3c0 .9-.8 1.6-1.7 1.5C10.2 18.2 5.8 13.8 4.7 6.2c-.1-.9.6-1.7 1.5-1.7z"
        {...stroke}
      />
    </svg>
  ),
  settings: () => (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
      <circle cx="12" cy="12" r="3.1" {...stroke} />
      <path
        d="M12 3.6l1.4 2.2 2.6-.4.6 2.5 2.3 1.3-1.2 2.3 1.2 2.3-2.3 1.3-.6 2.5-2.6-.4L12 20.4l-1.4-2.2-2.6.4-.6-2.5-2.3-1.3 1.2-2.3-1.2-2.3 2.3-1.3.6-2.5 2.6.4z"
        {...stroke}
      />
    </svg>
  ),
  shield: () => (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
      <path d="M12 3.5l7 2.6v6c0 4.3-2.9 7.5-7 8.4-4.1-.9-7-4.1-7-8.4v-6z" {...stroke} />
      <path d="M9 12.2l2.2 2.2 4-4.2" {...stroke} />
    </svg>
  ),
  scale: () => (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
      <path d="M12 4.5v15M6 19.5h12M5 8.5h14" {...stroke} />
      <path d="M5 8.5 2.8 13.5h4.4zM19 8.5l-2.2 5h4.4z" {...stroke} />
    </svg>
  ),
  bell: () => (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
      <path d="M6.5 17V11a5.5 5.5 0 1 1 11 0v6" {...stroke} />
      <path d="M4.5 17h15M10 20h4" {...stroke} />
    </svg>
  ),
  inbox: () => (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
      <path d="M4 13.5 6.2 5h11.6L20 13.5V19H4z" {...stroke} />
      <path d="M4 13.5h4l1.2 2.2h5.6L16 13.5h4" {...stroke} />
    </svg>
  ),
  edit: () => (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path d="M15.5 5.2 18.8 8.5 8.4 18.9l-4 .7.7-4z" {...stroke} />
    </svg>
  ),
  undo: () => (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path d="M8 8.5H14a4.5 4.5 0 0 1 0 9h-3" {...stroke} />
      <path d="M10.5 5.5 7.5 8.5l3 3" {...stroke} />
    </svg>
  ),
  logout: () => (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
      <path d="M14 6.5V5H5v14h9v-1.5" {...stroke} />
      <path d="M11 12h9M17 8.5l3.5 3.5L17 15.5" {...stroke} />
    </svg>
  ),
  eye: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M2.8 12S6.4 6.2 12 6.2 21.2 12 21.2 12 17.6 17.8 12 17.8 2.8 12 2.8 12z" {...stroke} />
      <circle cx="12" cy="12" r="2.9" {...stroke} />
    </svg>
  ),
  eyeOff: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M9.9 5.4A9.6 9.6 0 0 1 12 5.2c5.6 0 9.2 6.8 9.2 6.8a17 17 0 0 1-2.7 3.5" {...stroke} />
      <path d="M6.4 7.3A16.4 16.4 0 0 0 2.8 12S6.4 18.8 12 18.8c1.4 0 2.6-.3 3.7-.8" {...stroke} />
      <path d="M4 3.6 20 20.4" {...stroke} />
    </svg>
  ),
};

/* ------------------------------------------------------------------ logo -- */

/** The club logo file, at client/public/images/logo.jpeg. */
export const LOGO_SRC = '/images/logo.jpeg';

// Remembered across every instance, so once the file is known to be missing
// the other logos on the page do not each fire their own failing request.
let logoMissing = false;

/**
 * The club logo, used everywhere a mark appears — top bar, About page, unlock
 * and sign-in screens. Falls back to the drawn crest until the file exists, so
 * the site never shows a broken image.
 */
export function Logo({ className, alt = 'Rav Shekha Ji Yuva Club' }) {
  const [missing, setMissing] = useState(logoMissing);

  if (missing) return <Crest className={className} title={alt} />;

  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={`logo-img ${className || ''}`}
      onError={() => {
        logoMissing = true;
        setMissing(true);
      }}
    />
  );
}

/* ----------------------------------------------------- member medallion --- */

const MEMBER_TONES = [
  { a: '#1b2a6b', b: '#2c3f92' },
  { a: '#1f5c4c', b: '#2f7d5c' },
  { a: '#7a3d12', b: '#a75b1c' },
  { a: '#8c2b21', b: '#b04030' },
  { a: '#3d2358', b: '#5b3670' },
  { a: '#123a5c', b: '#1f6788' },
];

/**
 * Stands in for a member photograph until the club uploads real ones. Drawn
 * from the name, so the same person always gets the same medallion.
 */
export function MemberAvatar({ name, className }) {
  const h = hash(name);
  const tone = MEMBER_TONES[h % MEMBER_TONES.length];
  const gid = `ma${h % 100000}`;
  const letters = String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <svg className={className} viewBox="0 0 120 120" role="img" aria-label={name}>
      <defs>
        <linearGradient id={`${gid}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tone.a} />
          <stop offset="100%" stopColor={tone.b} />
        </linearGradient>
        <pattern id={`${gid}p`} width="15" height="15" patternUnits="userSpaceOnUse">
          <path d="M7.5 1l6.5 6.5-6.5 6.5L1 7.5z" fill="none" stroke="#e3b45c" strokeWidth="0.5" opacity="0.4" />
        </pattern>
      </defs>

      <rect width="120" height="120" fill={`url(#${gid}g)`} />
      <rect width="120" height="120" fill={`url(#${gid}p)`} />

      {/* the mehrab arch, same motif as the crest */}
      <path
        d="M22 118V52c0-18 14-31 38-31s38 13 38 31v66"
        fill="none"
        stroke="#e3b45c"
        strokeWidth="1.4"
        opacity="0.75"
      />
      <circle cx="60" cy="56" r="27" fill="#0e1636" opacity="0.28" />
      <circle cx="60" cy="56" r="27" fill="none" stroke="#e3b45c" strokeWidth="0.8" opacity="0.6" />

      <text
        x="60"
        y="56"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#f6e3bb"
        fontSize="24"
        fontFamily="Rozha One, Georgia, serif"
      >
        {letters}
      </text>

      <rect x="16" y="114" width="88" height="2.6" rx="1.3" fill="#e3b45c" opacity="0.7" />
    </svg>
  );
}

/* --------------------------------------------------- founder portrait ----- */

/**
 * Rao Shekha Ji died in 1488, four centuries before photography. This is an
 * illustrated portrait in the Rajasthani miniature idiom — a profile against a
 * jali ground — not a photograph, and it is drawn rather than sourced so the
 * app carries no image files and makes no external requests.
 */
export function FounderPortrait({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 150 200"
      role="img"
      aria-label="Illustrated portrait of Rao Shekha Ji"
    >
      <defs>
        <radialGradient id="fpHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f6ecd2" />
          <stop offset="82%" stopColor="#efe1c0" />
          <stop offset="100%" stopColor="#e2d0aa" />
        </radialGradient>
      </defs>

      {/* aged paper ground */}
      <rect width="150" height="200" fill="#cfc4ab" />
      {/* the grey-green field the figure sits against */}
      <rect x="4" y="18" width="142" height="182" fill="#6d7570" />

      {/* top border band, maroon with cream buds */}
      <rect x="4" y="0" width="142" height="17" fill="#7d2b23" />
      <g fill="#efe3c8">
        {[12, 32, 52, 72, 92, 112, 132].map((x) => (
          <path key={x} d={`M${x} 4c3 2 4 5 3 8-2-3-5-3-8-1 1-4 3-6 5-7z`} />
        ))}
      </g>
      <rect x="4" y="17" width="142" height="2" fill="#3b3a33" />

      {/* the chhatri dome behind the figure */}
      <path
        d="M20 200V88c0-27 24-46 55-46s55 19 55 46v112"
        fill="#5c6360"
        stroke="#7d2b23"
        strokeWidth="4"
      />
      <path
        d="M28 200V90c0-23 20-39 47-39s47 16 47 39v110"
        fill="none"
        stroke="#2f2f2b"
        strokeWidth="1.2"
        opacity="0.75"
      />

      {/* halo */}
      <circle cx="75" cy="82" r="35" fill="url(#fpHalo)" />
      <circle cx="75" cy="82" r="35" fill="none" stroke="#b09a6c" strokeWidth="0.8" />

      {/* ---- torso: the cream jama ---- */}
      <path d="M30 200v-30c0-22 20-36 45-36s45 14 45 36v30z" fill="#e9dcb8" />
      <path d="M30 200v-30c0-22 20-36 45-36s45 14 45 36v30z" fill="none" stroke="#8d7c54" strokeWidth="0.9" />
      {/* faint dot sprigs on the cloth */}
      <g fill="#c8b485" opacity="0.75">
        {[
          [45, 168], [58, 182], [40, 190], [100, 168], [112, 182], [95, 190], [75, 192],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="1" />
            <circle cx={x + 3} cy={y + 3} r="1" />
            <circle cx={x - 3} cy={y + 3} r="1" />
          </g>
        ))}
      </g>

      {/* crossed bandolier straps with gold studs */}
      <path d="M52 146L104 196" stroke="#b8863a" strokeWidth="7" />
      <path d="M98 146L46 196" stroke="#b8863a" strokeWidth="7" />
      <path d="M52 146L104 196M98 146L46 196" stroke="#7d2b23" strokeWidth="1" opacity="0.6" />
      <g fill="#f2d99a">
        {[0.2, 0.4, 0.6, 0.8].map((t) => (
          <circle key={`a${t}`} cx={52 + 52 * t} cy={146 + 50 * t} r="1.6" />
        ))}
        {[0.2, 0.4, 0.6, 0.8].map((t) => (
          <circle key={`b${t}`} cx={98 - 52 * t} cy={146 + 50 * t} r="1.6" />
        ))}
      </g>

      {/* waist plate */}
      <rect x="62" y="184" width="26" height="16" fill="#dcc894" stroke="#8d7c54" strokeWidth="0.9" />
      <rect x="68" y="189" width="14" height="9" fill="#6d7570" stroke="#8d7c54" strokeWidth="0.8" />

      {/* ---- bow and arrows over the right shoulder ---- */}
      <path d="M112 76c9 14 11 34 4 54" fill="none" stroke="#221c15" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M112 76c-2 4-1 8 2 10" fill="none" stroke="#221c15" strokeWidth="2" />
      <path d="M110 74c4-5 8-6 11-3-4 0-7 2-9 5z" fill="#221c15" />
      <path d="M116 84l3 44" stroke="#8d7c54" strokeWidth="1" />
      <path d="M117 86l4-6M119 92l4-6" stroke="#efe3c8" strokeWidth="1.2" strokeLinecap="round" />

      {/* ---- neck ---- */}
      <path d="M66 108h18v20H66z" fill="#c99263" />

      {/* ---- necklaces: pearl strands and a gold pendant ---- */}
      <path d="M58 130q17 16 34 0" fill="none" stroke="#f2ead6" strokeWidth="2.6" />
      <path d="M54 133q21 22 42 0" fill="none" stroke="#f2ead6" strokeWidth="2.2" />
      <path d="M50 136q25 28 50 0" fill="none" stroke="#e6d9b4" strokeWidth="1.8" />
      <circle cx="75" cy="147" r="5.4" fill="#e0b458" stroke="#8d6a24" strokeWidth="0.8" />
      <circle cx="75" cy="147" r="2" fill="#7d2b23" />
      {/* choker */}
      <path d="M63 126q12 9 24 0" fill="none" stroke="#c9302c" strokeWidth="2.4" />

      {/* ---- face ---- */}
      <path
        d="M75 56c15 0 24 11 24 27 0 17-10 31-24 31S51 100 51 83c0-16 9-27 24-27z"
        fill="#d9a06d"
      />
      {/* ears */}
      <path d="M50 84c-3 0-5 3-4 6 1 3 3 5 5 4z" fill="#c99263" />
      <path d="M100 84c3 0 5 3 4 6-1 3-3 5-5 4z" fill="#c99263" />
      <circle cx="49" cy="92" r="1.8" fill="#e0b458" />
      <circle cx="101" cy="92" r="1.8" fill="#e0b458" />

      {/* brows */}
      <path d="M60 76q7-4 14 0" fill="none" stroke="#2b1e17" strokeWidth="2" strokeLinecap="round" />
      <path d="M76 76q7-4 14 0" fill="none" stroke="#2b1e17" strokeWidth="2" strokeLinecap="round" />
      {/* eyes */}
      <path d="M59 84q8-6 16 0q-8 6-16 0z" fill="#f4ece0" stroke="#2b1e17" strokeWidth="1.1" />
      <path d="M75 84q8-6 16 0q-8 6-16 0z" fill="#f4ece0" stroke="#2b1e17" strokeWidth="1.1" />
      <circle cx="67" cy="84" r="2.4" fill="#221c15" />
      <circle cx="83" cy="84" r="2.4" fill="#221c15" />
      {/* tilak */}
      <circle cx="75" cy="69" r="2.2" fill="#a3231c" />
      {/* nose */}
      <path d="M75 88v8q-3 2-5 1" fill="none" stroke="#a9714a" strokeWidth="1.3" strokeLinecap="round" />
      {/* the moustache, the most recognisable thing about him */}
      <path
        d="M75 102c-6-4-14-4-19 1-4 4-4 9-1 12 2-5 6-8 11-8 4 0 7 1 9 3 2-2 5-3 9-3 5 0 9 3 11 8 3-3 3-8-1-12-5-5-13-5-19-1z"
        fill="#241c14"
      />
      {/* mouth and chin */}
      <path d="M70 108q5 3 10 0" fill="none" stroke="#8c4a3a" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M69 115q6 4 12 0" fill="none" stroke="#b9835a" strokeWidth="1.1" />

      {/* ---- the pagdi ---- */}
      <path
        d="M48 74c-3-16 5-29 17-33 15-5 30 1 35 14 2 5 2 10 1 14-8-9-19-13-30-12-10 1-18 8-23 17z"
        fill="#8e2f22"
      />
      <path d="M50 66q12-13 28-13t26 11" fill="none" stroke="#d9b070" strokeWidth="1.6" />
      <path d="M53 58q11-11 24-11t23 9" fill="none" stroke="#c8362a" strokeWidth="3" />
      <path d="M56 50q10-9 20-9t19 8" fill="none" stroke="#8e2f22" strokeWidth="3.5" />
      <path d="M58 44q9-7 17-7t16 6" fill="none" stroke="#c8362a" strokeWidth="3" />
      {/* the sarpech jewel */}
      <ellipse cx="75" cy="58" rx="11" ry="6.5" fill="#e0b458" stroke="#8d6a24" strokeWidth="0.9" />
      <circle cx="75" cy="58" r="2.6" fill="#a3231c" />
      <circle cx="67" cy="58" r="1.7" fill="#7d2b23" />
      <circle cx="83" cy="58" r="1.7" fill="#7d2b23" />
      <path d="M64 64q11 5 22 0" fill="none" stroke="#e0b458" strokeWidth="1.6" />
      {/* turban tail falling behind the shoulder */}
      <path d="M99 68c6 6 8 14 6 22" fill="none" stroke="#8e2f22" strokeWidth="4" strokeLinecap="round" />

      {/* frame */}
      <rect x="4" y="0" width="142" height="200" fill="none" stroke="#3b3a33" strokeWidth="2" />
    </svg>
  );
}
