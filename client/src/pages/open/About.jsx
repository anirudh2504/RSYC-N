import { useState } from 'react';
import { useFetch } from '../../context/Session.jsx';
import { Card, CardHead, ErrorState, Loading, Rule } from '../../components/ui.jsx';
import { Crest, FounderPortrait } from '../../components/Ornaments.jsx';

const COPY = {
  hi: {
    founderRule: 'जिनका नाम हम धारण करते हैं',
    rulesRule: 'कोष कैसे चलता है',
    adminsRule: 'क्लब के संचालक',
    adminsTitle: 'संचालक सदस्य',
    adminsNote: 'फ़ोन नंबर यहाँ नहीं दिखाए जाते। क्लब पिन रखने वाले सदस्य पूरी सूची देख सकते हैं।',
    portraitNote: 'चित्रित प्रतिकृति — उनके जीवनकाल का कोई चित्र उपलब्ध नहीं है।',
  },
  en: {
    founderRule: 'The name we carry',
    rulesRule: 'How the fund works',
    adminsRule: 'Who runs it',
    adminsTitle: 'Club members who run it',
    adminsNote:
      'Phone numbers are not shown here. Members with the club PIN can see the full directory.',
    portraitNote: 'Illustrated portrait — no likeness survives from his lifetime.',
  },
};

/** Splits on blank lines so the stored text keeps its paragraphs. */
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

export default function About() {
  const { data, loading, error, reload } = useFetch('/open/about');
  // Hindi is the default here — it is the language the village actually reads.
  const [lang, setLang] = useState('hi');
  const [photoFailed, setPhotoFailed] = useState(false);

  if (loading) return <Loading rows={4} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const t = COPY[lang];
  const hi = lang === 'hi';
  const founder = data.founder || {};

  const clubText = hi ? data.aboutHi || data.about : data.about;
  const founderText = hi ? founder.aboutHi || founder.about : founder.about;
  const showPhoto = founder.photoUrl && !photoFailed;

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <Crest className="crest-large" />
        <h1 className="page-title" style={{ fontSize: 'var(--t-xl)', marginTop: 12 }}>
          {hi ? data.groupNameHi || data.groupName : data.groupName}
        </h1>
        <p className={hi ? 'muted' : 'devanagari muted'}>
          {hi ? data.groupName : data.groupNameHi}
        </p>
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

      <Paragraphs text={clubText} className={hi ? 'devanagari' : ''} />

      {founder.name ? (
        <>
          <div style={{ margin: '30px 0 16px' }}>
            <Rule label={t.founderRule} />
          </div>

          <div className="founder">
            {/* Portrait first in the markup so it leads on a phone; on wider
                screens the CSS moves it into the right-hand column. */}
            <div className="founder-art">
              <div className="portrait-frame" style={{ aspectRatio: showPhoto ? '3 / 4' : '3 / 4' }}>
                {showPhoto ? (
                  <img
                    src={founder.photoUrl}
                    alt={hi ? founder.nameHi || founder.name : founder.name}
                    onError={() => setPhotoFailed(true)}
                  />
                ) : (
                  <FounderPortrait />
                )}
              </div>
              {!showPhoto ? <p className="portrait-caption">{t.portraitNote}</p> : null}
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
        </>
      ) : null}

      {data.rules && data.rules.length && !hi ? (
        <>
          <div style={{ margin: '30px 0 14px' }}>
            <Rule label={t.rulesRule} />
          </div>
          <Card>
            {data.rules.map((rule, i) => (
              <div key={i} className="ledger-row">
                <span className="ledger-icon icon-opening" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="ledger-body">
                  <p style={{ lineHeight: 1.5 }}>{rule}</p>
                </div>
              </div>
            ))}
          </Card>
        </>
      ) : null}

      <div style={{ margin: '30px 0 14px' }}>
        <Rule label={t.adminsRule} />
      </div>
      <Card>
        <CardHead title={t.adminsTitle} />
        <div className="card-pad">
          <div className="wrap">
            {data.admins.map((a, i) => (
              <span key={i} className="chip chip-royal">
                {a.name}
              </span>
            ))}
          </div>
          <p className={`hint ${hi ? 'devanagari' : ''}`} style={{ marginTop: 10 }}>
            {t.adminsNote}
          </p>
        </div>
      </Card>
    </>
  );
}
