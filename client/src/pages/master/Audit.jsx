import { useMemo, useState } from 'react';
import { useFetch } from '../../context/Session.jsx';
import { Card, CardHead, Empty, ErrorState, Loading, PageHead } from '../../components/ui.jsx';
import { relativeDays, shortDate } from '../../lib/format.js';

/**
 * The filter is built from the categories actually present in the log, so it
 * never offers a choice that would return an empty screen.
 */
const CATEGORIES = [
  { key: 'money-in', label: 'Money in', chip: 'paid' },
  { key: 'money-out', label: 'Money out', chip: 'unpaid' },
  { key: 'correction', label: 'Corrections', chip: 'partial' },
  { key: 'member', label: 'Members', chip: 'royal' },
  { key: 'event', label: 'Events', chip: 'saffron' },
  { key: 'join-request', label: 'Join requests', chip: 'royal' },
  { key: 'reminder', label: 'Reminders', chip: 'saffron' },
  { key: 'admin', label: 'Admins', chip: 'royal' },
  { key: 'settings', label: 'Settings', chip: 'partial' },
  { key: 'access', label: 'Failed unlocks', chip: 'unpaid' },
  { key: 'sign-in', label: 'Sign ins', chip: 'exempt' },
  { key: 'other', label: 'Other', chip: 'exempt' },
];

const META = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

export default function Audit() {
  const { data, loading, error, reload } = useFetch('/admin/audit?limit=200');
  const [filter, setFilter] = useState('');

  const logs = data ? data.logs : [];

  // Only the categories that have at least one entry get a button.
  const available = useMemo(() => {
    const counts = {};
    logs.forEach((l) => {
      const key = l.category || 'other';
      counts[key] = (counts[key] || 0) + 1;
    });
    return CATEGORIES.filter((c) => counts[c.key]).map((c) => ({ ...c, count: counts[c.key] }));
  }, [logs]);

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const shown = filter ? logs.filter((l) => (l.category || 'other') === filter) : logs;

  return (
    <>
      <PageHead
        eyebrow="Master admin"
        title="Audit log"
        sub="Every write in the system, with who did it and when. Append only."
      />

      <div className="scroll-x" style={{ marginBottom: 14 }}>
        <div className="scroll-x-inner">
          <button
            type="button"
            className={`tag${filter === '' ? ' tag-on' : ''}`}
            onClick={() => setFilter('')}
          >
            Everything ({logs.length})
          </button>
          {available.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`tag${filter === c.key ? ' tag-on' : ''}`}
              onClick={() => setFilter(c.key)}
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty title="Nothing logged" />
      ) : (
        <Card>
          <CardHead title={`${shown.length} ${shown.length === 1 ? 'entry' : 'entries'}`} />
          {shown.map((log) => {
            const meta = META[log.category] || META.other;
            return (
              <div key={log.id} className="ledger-row">
                <span
                  className={`ledger-icon icon-${
                    log.category === 'money-in'
                      ? 'credit'
                      : log.category === 'money-out' || log.category === 'access'
                        ? 'debit'
                        : log.category === 'correction'
                          ? 'adjust'
                          : 'opening'
                  }`}
                  aria-hidden="true"
                >
                  {log.category === 'money-in' ? '↓' : log.category === 'money-out' ? '↑' : '◦'}
                </span>

                <div className="ledger-body">
                  <p className="ledger-title">{log.summary || log.action}</p>
                  <p className="ledger-meta">
                    {log.actorName} · {shortDate(log.createdAt)} · {relativeDays(log.createdAt)}
                    {log.ip ? ` · ${log.ip}` : ''}
                  </p>
                </div>

                <span className={`chip chip-${meta.chip}`} style={{ flex: 'none' }}>
                  {meta.label}
                </span>
              </div>
            );
          })}
        </Card>
      )}

      <p className="tiny muted center" style={{ marginTop: 16 }}>
        There is no delete path for this log in any route. Most members will never open it — it
        works by existing.
      </p>
    </>
  );
}
