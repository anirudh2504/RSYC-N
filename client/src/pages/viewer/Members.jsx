import { useState } from 'react';
import { useFetch } from '../../context/Session.jsx';
import { Icon } from '../../components/Ornaments.jsx';
import { Card, CardHead, Empty, ErrorState, Loading, PageHead } from '../../components/ui.jsx';
import { initials, money, periodLabel } from '../../lib/format.js';

/**
 * Behind the PIN this doubles as the village directory, which for a club like
 * this is half the reason people open the app.
 */
export default function Members() {
  const { data, loading, error, reload } = useFetch('/view/members');
  const [q, setQ] = useState('');

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const needle = q.trim().toLowerCase();
  const list = needle
    ? data.members.filter(
        (m) => m.name.toLowerCase().includes(needle) || m.phone.includes(needle),
      )
    : data.members;

  return (
    <>
      <PageHead
        eyebrow="Club directory"
        title="Members"
        sub={`${data.totalCount} members · ${data.contributingCount} on the monthly collection`}
      />

      <input
        className="input"
        placeholder="Search by name or number"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 14 }}
        aria-label="Search members"
      />

      {list.length === 0 ? (
        <Empty title="No one found">Try a different name.</Empty>
      ) : (
        <Card>
          <CardHead title={`${list.length} shown`} />
          {list.map((m) => (
            <div key={m.id} className="list-row">
              <span className="avatar" aria-hidden="true">
                {initials(m.name)}
              </span>

              <div className="list-body">
                <p className="list-name">{m.name}</p>
                <p className="list-meta">
                  {m.isEnabled ? `${money(m.monthlyAmountPaise)} a month` : 'Not contributing'}
                  {' · since '}
                  {periodLabel(m.joinedPeriod)}
                </p>
              </div>

              <div className="list-end">
                {m.pendingCount > 0 ? (
                  <span className="chip chip-unpaid">
                    {m.pendingCount} {m.pendingCount === 1 ? 'month' : 'months'}
                  </span>
                ) : m.isEnabled ? (
                  <span className="chip chip-paid">Up to date</span>
                ) : (
                  <span className="chip chip-exempt">Member</span>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                  <a
                    href={`tel:+91${m.phone}`}
                    className="btn btn-ghost btn-sm"
                    aria-label={`Call ${m.name}`}
                  >
                    <Icon.phone />
                  </a>
                  <a
                    href={`https://wa.me/91${m.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm"
                    aria-label={`WhatsApp ${m.name}`}
                  >
                    <Icon.whatsapp />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <p className="tiny muted center" style={{ marginTop: 18 }}>
        Members marked “Not contributing” are full members of the club who are not on the monthly
        collection list.
      </p>
    </>
  );
}
