import { useFetch } from '../../context/Session.jsx';
import { Card, CardHead, ErrorState, Loading, Rule } from '../../components/ui.jsx';
import { Crest, FounderPortrait } from '../../components/Ornaments.jsx';

export default function About() {
  const { data, loading, error, reload } = useFetch('/open/about');

  if (loading) return <Loading rows={4} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const founder = data.founder || {};

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <Crest className="crest-large" />
        <h1 className="page-title" style={{ fontSize: 'var(--t-xl)', marginTop: 12 }}>
          {data.groupName}
        </h1>
        <p className="devanagari muted">{data.groupNameHi}</p>
        <p className="eyebrow" style={{ marginTop: 8 }}>
          {data.village} &middot; {data.villageHi}
        </p>
      </div>

      <div className="prose">
        {String(data.about || '')
          .split('\n\n')
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
      </div>

      {founder.name ? (
        <>
          <div style={{ margin: '30px 0 14px' }}>
            <Rule label="The name we carry" />
          </div>

          <Card className="card-pad">
            <div className="portrait">
              <div className="portrait-frame">
                <FounderPortrait />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 className="section-title">{founder.name}</h2>
                {founder.nameHi ? (
                  <p className="devanagari muted" style={{ fontSize: 'var(--t-md)' }}>
                    {founder.nameHi}
                  </p>
                ) : null}
                {founder.years ? (
                  <p className="eyebrow" style={{ marginTop: 8 }}>
                    {founder.years}
                  </p>
                ) : null}
                <p className="tiny muted" style={{ marginTop: 10 }}>
                  Illustrated portrait — no likeness survives from his lifetime.
                </p>
              </div>
            </div>

            {founder.about ? (
              <div className="prose" style={{ marginTop: 18 }}>
                {String(founder.about)
                  .split('\n\n')
                  .map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
              </div>
            ) : null}
          </Card>
        </>
      ) : null}

      {data.rules && data.rules.length ? (
        <>
          <div style={{ margin: '30px 0 14px' }}>
            <Rule label="How the fund works" />
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
        <Rule label="Who runs it" />
      </div>
      <Card>
        <CardHead title="Club admins" />
        <div className="card-pad">
          <div className="wrap">
            {data.admins.map((a, i) => (
              <span key={i} className={`chip chip-${a.role === 'master' ? 'royal' : 'outline'}`}>
                {a.name}
                {a.role === 'master' ? ' · president' : ''}
              </span>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Phone numbers are not shown here. Members with the club PIN can see the full directory.
          </p>
        </div>
      </Card>
    </>
  );
}
