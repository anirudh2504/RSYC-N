import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch, useSession } from '../../context/Session.jsx';
import { Card, CardHead, ErrorState, Loading, Rule } from '../../components/ui.jsx';
import { Logo, Icon } from '../../components/Ornaments.jsx';

const COPY = {
  hi: {
    purposeRule: 'क्लब का उद्देश्य',
    purposeTitle: 'हम क्या करते हैं',
    founderRule: 'जिनका नाम हम धारण करते हैं',
    contributionRule: 'राव शेखा जी का योगदान',
    contributionTitle: 'इतिहास से कुछ बातें',
    rulesRule: 'कोष कैसे चलता है',
    runsRule: 'क्लब कौन चलाता है',
    runsTitle: 'गाँव के लोग',
    runsBody:
      'यह क्लब किसी एक व्यक्ति का नहीं है। इसे गाँव के लोग मिलकर चलाते हैं। हर महीने का हिसाब सबके सामने रहता है और कोई भी सदस्य कभी भी पूरा ब्यौरा देख सकता है।',
    joinCta: 'क्लब से जुड़िए',
    aboutClubRule: 'क्लब के बारे में',
    photoMissing: 'चित्र अभी जोड़ा नहीं गया',
  },
  en: {
    purposeRule: 'Why the club exists',
    purposeTitle: 'What we do',
    founderRule: 'The name we carry',
    contributionRule: 'Contribution of Rao Shekha Ji',
    contributionTitle: 'A few lines from history',
    rulesRule: 'How the fund works',
    runsRule: 'Who runs the club',
    runsTitle: 'The people of the village',
    runsBody:
      'The club belongs to no one person. It is run by the people of the village together. The accounts are open every month, and any member can see the whole record at any time.',
    joinCta: 'Join the club',
    aboutClubRule: 'About the club',
    photoMissing: 'Portrait not added yet',
  },
};

function Paragraphs({ text, className }) {
  if (!text) return null;
  return (
    <div className={`prose ${className || ''}`}>
      {String(text)
        .split('\n\n')
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </div>
  );
}

/** A numbered list card, used for the purpose points and the history lines. */
function PointList({ items, hindi }) {
  if (!items || !items.length) return null;
  return (
    <Card>
      {items.map((item, i) => (
        <div key={i} className="ledger-row">
          <span className="ledger-icon icon-opening" aria-hidden="true">
            {i + 1}
          </span>
          <div className="ledger-body">
            <p className={hindi ? 'devanagari' : ''} style={{ lineHeight: 1.6 }}>
              {item}
            </p>
          </div>
        </div>
      ))}
    </Card>
  );
}

export default function About() {
  const { data, loading, error, reload } = useFetch('/open/about');
  const session = useSession();
  // Hindi is the default — it is the language the village actually reads.
  const [lang, setLang] = useState('hi');
  const [photoFailed, setPhotoFailed] = useState(false);

  if (loading) return <Loading rows={4} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const t = COPY[lang];
  const hi = lang === 'hi';
  const founder = data.founder || {};

  const clubText = hi ? data.aboutHi || data.about : data.about;
  const purposeText = hi ? data.purposeHi || data.purpose : data.purpose;
  const purposePoints = hi ? data.purposePointsHi || data.purposePoints : data.purposePoints;
  const founderText = hi ? founder.aboutHi || founder.about : founder.about;
  const contribution = hi ? founder.contributionHi || founder.contribution : founder.contribution;
  const showPhoto = founder.photoUrl && !photoFailed;

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <Logo className="crest-large" />
        <h1 className="page-title" style={{ fontSize: 'var(--t-xl)', marginTop: 12 }}>
          {hi ? data.groupNameHi || data.groupName : data.groupName}
        </h1>
        <p className={hi ? 'muted' : 'devanagari muted'}>{hi ? data.groupName : data.groupNameHi}</p>
        <p className="eyebrow" style={{ marginTop: 8 }}>
          {hi ? data.villageHi || data.village : data.village}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
        <div className="lang-switch" role="group" aria-label="Language">
          <button type="button" className={hi ? 'on' : ''} onClick={() => setLang('hi')}>
            हिंदी
          </button>
          <button type="button" className={!hi ? 'on' : ''} onClick={() => setLang('en')}>
            English
          </button>
        </div>
      </div>

      {/* ================= Rao Shekha Ji comes first ================= */}
      {founder.name ? (
        <>
          <div style={{ margin: '4px 0 16px' }}>
            <Rule label={t.founderRule} />
          </div>

          <div className="founder">
            <div className="founder-art">
              <div className="portrait-frame" style={{ aspectRatio: '3 / 4' }}>
                {showPhoto ? (
                  <img
                    src={founder.photoUrl}
                    alt={hi ? founder.nameHi || founder.name : founder.name}
                    onError={() => setPhotoFailed(true)}
                  />
                ) : (
                  /* No stand-in drawing. An empty frame that says what to do. */
                  <div className="photo-missing">
                    <p className={`small ${hi ? 'devanagari' : ''}`} style={{ fontWeight: 600 }}>
                      {t.photoMissing}
                    </p>
                    <code>client/public/images/</code>
                    <code>rao-shekha-ji.jpg</code>
                  </div>
                )}
              </div>
            </div>

            <div className="founder-text">
              <h2 className={`section-title ${hi ? 'devanagari' : ''}`}>
                {hi ? founder.nameHi || founder.name : founder.name}
              </h2>
              <p className={hi ? 'muted small' : 'devanagari muted small'}>
                {hi ? founder.name : founder.nameHi}
              </p>
              {founder.years ? (
                <p className="eyebrow" style={{ marginTop: 8 }}>
                  {founder.years}
                </p>
              ) : null}

              <div style={{ marginTop: 14 }}>
                <Paragraphs text={founderText} className={hi ? 'devanagari' : ''} />
              </div>
            </div>
          </div>

          {/* ---- his contribution ---- */}
          {contribution && contribution.length ? (
            <>
              <div style={{ margin: '30px 0 14px' }}>
                <Rule label={t.contributionRule} />
              </div>
              <p className={`eyebrow ${hi ? 'devanagari' : ''}`} style={{ marginBottom: 8 }}>
                {t.contributionTitle}
              </p>
              <PointList items={contribution} hindi={hi} />
            </>
          ) : null}
        </>
      ) : null}

      {/* ================= then the club itself ================= */}
      {clubText ? (
        <>
          <div style={{ margin: '30px 0 14px' }}>
            <Rule label={t.aboutClubRule} />
          </div>
          <Paragraphs text={clubText} className={hi ? 'devanagari' : ''} />
        </>
      ) : null}

      {/* ---- purpose of the club ---- */}
      {purposeText || (purposePoints && purposePoints.length) ? (
        <>
          <div style={{ margin: '30px 0 14px' }}>
            <Rule label={t.purposeRule} />
          </div>

          {purposeText ? (
            <Card className="card-pad" style={{ marginBottom: 14 }}>
              <p
                className={hi ? 'devanagari' : ''}
                style={{ fontSize: 'var(--t-md)', lineHeight: 1.7, color: 'var(--ink-2)' }}
              >
                {purposeText}
              </p>
            </Card>
          ) : null}

          <p className={`eyebrow ${hi ? 'devanagari' : ''}`} style={{ marginBottom: 8 }}>
            {t.purposeTitle}
          </p>
          <PointList items={purposePoints} hindi={hi} />
        </>
      ) : null}

      {/* ---- how the fund works ---- */}
      {data.rules && data.rules.length && !hi ? (
        <>
          <div style={{ margin: '30px 0 14px' }}>
            <Rule label={t.rulesRule} />
          </div>
          <PointList items={data.rules} />
        </>
      ) : null}

      {/* ---- who runs it: no names ---- */}
      <div style={{ margin: '30px 0 14px' }}>
        <Rule label={t.runsRule} />
      </div>
      <Card>
        <CardHead title={t.runsTitle} />
        <div className="card-pad">
          <p className={hi ? 'devanagari' : ''} style={{ color: 'var(--ink-2)', lineHeight: 1.7 }}>
            {t.runsBody}
          </p>
        </div>
      </Card>

      {/* ---- join ----
           Only for someone who is not signed in. Anyone holding the club PIN,
           and any admin, has no use for an invitation to join. */}
      {!session.viewer && !session.isAdmin ? (
        <Link to="/join" style={{ display: 'block', marginTop: 22 }}>
          <div className="join-card">
            <p className={`section-title ${hi ? 'devanagari' : ''}`}>{t.joinCta}</p>
            <p className="small muted" style={{ marginTop: 6 }}>
              Contribute to the work and the events
            </p>
            <span
              className="btn btn-saffron btn-sm"
              style={{ marginTop: 12, display: 'inline-flex' }}
            >
              <Icon.people />
              Send a request
            </span>
          </div>
        </Link>
      ) : null}
    </>
  );
}
