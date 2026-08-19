import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../context/Session.jsx';
import { Icon } from '../../components/Ornaments.jsx';
import { Card, CardHead, Empty, ErrorState, Loading, PageHead } from '../../components/ui.jsx';
import { initials, money, periodLabel } from '../../lib/format.js';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'contributing', label: 'Contributing' },
  { key: 'off', label: 'Not contributing' },
];

export default function AdminMembers() {
  const { data, loading, error, reload } = useFetch('/admin/members');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const needle = q.trim().toLowerCase();
  const list = data.members
    .filter((m) => {
      if (filter === 'pending') return m.pendingCount > 0;
      if (filter === 'contributing') return m.isEnabled;
      if (filter === 'off') return !m.isEnabled;
      return true;
    })
    .filter((m) => !needle || m.name.toLowerCase().includes(needle) || m.phone.includes(needle));

  return (
    <>
      <PageHead eyebrow="Members" title="Manage members" sub="Sorted by who is furthest behind." />

      <Link to="/admin/members/new" style={{ display: 'block', marginBottom: 14 }}>
        <button type="button" className="btn btn-block">
          <Icon.plus />
          Add a member
        </button>
      </Link>

      <input
        className="input"
        placeholder="Search by name or number"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 10 }}
        aria-label="Search members"
      />

      <div className="scroll-x" style={{ marginBottom: 14 }}>
        <div className="scroll-x-inner">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`tag${filter === f.key ? ' tag-on' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <Empty title="No members here">Try another filter.</Empty>
      ) : (
        <Card>
          <CardHead title={`${list.length} shown`} />
          {list.map((m) => (
            <Link key={m.id} to={`/admin/members/${m.id}`} className="list-row">
              <span className="avatar" aria-hidden="true">
                {initials(m.name)}
              </span>

              <div className="list-body">
                <p className="list-name">{m.name}</p>
                <p className="list-meta">
                  {m.phone} ·{' '}
                  {m.isEnabled ? `${money(m.monthlyAmountPaise)}/month` : 'Not contributing'} · since{' '}
                  {periodLabel(m.joinedPeriod)}
                </p>
              </div>

              <div className="list-end">
                {m.pendingCount > 0 ? (
                  <>
                    <span className="chip chip-unpaid">{m.pendingCount}m</span>
                    <p className="tiny muted num" style={{ marginTop: 4 }}>
                      {money(m.pendingPaise)}
                    </p>
                  </>
                ) : m.isEnabled ? (
                  <span className="chip chip-paid">Clear</span>
                ) : (
                  <span className="chip chip-exempt">Off</span>
                )}
              </div>

              <span className="chevron">
                <Icon.chevron />
              </span>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
