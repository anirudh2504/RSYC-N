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

/* --------------------------------------------------- founder portrait ----- */

/**
 * Rao Shekha Ji died in 1488, four centuries before photography. This is an
 * illustrated portrait in the Rajasthani miniature idiom — a profile against a
 * jali ground — not a photograph, and it is drawn rather than sourced so the
 * app carries no image files and makes no external requests.
 */
export function FounderPortrait({ className }) {
  return (
    <svg className={className} viewBox="0 0 150 200" role="img" aria-label="Illustrated portrait of Rao Shekha Ji">
      <defs>
        <linearGradient id="fpGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#25368a" />
          <stop offset="100%" stopColor="#141f52" />
        </linearGradient>
        <pattern id="fpJali" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M8 1l7 7-7 7-7-7z" fill="none" stroke="#e3b45c" strokeWidth="0.45" opacity="0.4" />
        </pattern>
        <clipPath id="fpArch">
          <path d="M14 196V64c0-28 22-48 61-48s61 20 61 48v132z" />
        </clipPath>
      </defs>

      <rect width="150" height="200" fill="url(#fpGround)" />
      <rect width="150" height="200" fill="url(#fpJali)" />

      <g clipPath="url(#fpArch)">
        <rect x="14" y="4" width="122" height="192" fill="#1d2a6d" />
        {/* halo */}
        <circle cx="75" cy="86" r="42" fill="#e8b75f" opacity="0.18" />
        <circle cx="75" cy="86" r="42" fill="none" stroke="#e8b75f" strokeWidth="0.8" opacity="0.5" />

        {/* shoulders and jama */}
        <path d="M30 196v-24c0-17 18-28 45-28s45 11 45 28v24z" fill="#f2e6cf" />
        <path d="M75 144v52" stroke="#c9a65a" strokeWidth="1.2" opacity="0.8" />
        <path d="M52 152c8 12 12 26 12 44M98 152c-8 12-12 26-12 44" fill="none" stroke="#d8c49a" strokeWidth="1" />
        {/* patka sash */}
        <path d="M40 178h70v8H40z" fill="#a33421" opacity="0.9" />

        {/* head, in profile */}
        <path
          d="M84 60c11 4 17 14 16 26-1 10-5 18-10 24-4 5-9 8-15 8-9 0-16-5-19-14-2-6-3-13-2-20 2-14 11-25 24-26 2 0 4 1 6 2z"
          fill="#d8a778"
        />
        {/* beard */}
        <path
          d="M60 92c-1 9 1 17 6 22 4 4 9 6 14 6 4 0 8-2 11-5-6 2-13 1-18-3-6-5-9-12-9-20z"
          fill="#3a2a20"
        />
        <path d="M63 100c3 9 9 15 17 16" fill="none" stroke="#2b1e17" strokeWidth="1.4" />
        {/* moustache */}
        <path d="M62 86c5-3 11-3 15 0" fill="none" stroke="#2b1e17" strokeWidth="2.2" strokeLinecap="round" />
        {/* eye */}
        <path d="M66 76c3-2 7-2 9 0" fill="none" stroke="#2b1e17" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="70" cy="78" r="1.7" fill="#2b1e17" />
        {/* tilak */}
        <path d="M76 64v9" stroke="#a33421" strokeWidth="1.8" strokeLinecap="round" />

        {/* pagdi */}
        <path
          d="M55 62c-2-13 6-24 20-27 14-3 27 4 30 16 1 5 0 9-2 12-6-7-15-11-25-10-10 1-18 5-23 9z"
          fill="#e0912a"
        />
        <path d="M57 56c7-6 16-9 26-9s18 3 23 8" fill="none" stroke="#f6d78a" strokeWidth="1.2" />
        <path d="M60 48c6-5 14-8 22-8s16 2 21 6" fill="none" stroke="#f6d78a" strokeWidth="1" opacity="0.8" />
        {/* turban jewel and plume */}
        <circle cx="99" cy="47" r="3.4" fill="#f6d78a" />
        <path d="M99 44c2-7 5-11 9-13-2 5-3 10-2 15z" fill="#e8e2d2" />

        {/* sword hilt at the shoulder */}
        <path d="M112 168l16 22" stroke="#c9a65a" strokeWidth="3" strokeLinecap="round" />
        <circle cx="111" cy="166" r="3.6" fill="#e8b75f" />
      </g>

      {/* arch frame */}
      <path
        d="M14 196V64c0-28 22-48 61-48s61 20 61 48v132"
        fill="none"
        stroke="#e3b45c"
        strokeWidth="2"
      />
      <path
        d="M22 196V66c0-24 19-42 53-42s53 18 53 42v130"
        fill="none"
        stroke="#e3b45c"
        strokeWidth="0.8"
        opacity="0.6"
      />
      <rect x="10" y="192" width="130" height="4" rx="2" fill="#e3b45c" />
    </svg>
  );
}
