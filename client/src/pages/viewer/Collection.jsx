import { useState } from 'react';
import { useFetch } from '../../context/Session.jsx';
import {
  Card,
  CardHead,
  Empty,
  ErrorState,
  Loading,
  PageHead,
  Progress,
} from '../../components/ui.jsx';
import { initials, money, periodLabel, periodLabelLong, currentPeriod } from '../../lib/format.js';

function statusChip(row) {
  if (row.due === 0) return <span className="chip chip-exempt">Not contributing</span>;
  if (row.status === 'paid') return <span className="chip chip-paid">Paid</span>;
  if (row.status === 'partial') {
    return <span className="chip chip-partial">{money(row.paid)} of {money(row.due)}</span>;
  }
  return <span className="chip chip-unpaid">Not yet</span>;
}

export default function Collection() {
  const monthsQuery = useFetch('/view/months');
  const [period, setPeriod] = useState(currentPeriod());
  const { data, loading, error, reload } = useFetch(`/view/collection?period=${period}`, [period]);

  const months = monthsQuery.data ? monthsQuery.data.months : [];

  return (
    <>
      <PageHead eyebrow="Monthly collection" title={periodLabelLong(period)} />

      <select
        className="select"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        aria-label="Choose a month"
        style={{ marginBottom: 14 }}
      >
        {[currentPeriod(), ...months.filter((m) => m !== currentPeriod())].map((m) => (
          <option key={m} value={m}>
            {periodLabel(m)}
          </option>
        ))}
      </select>

      {loading ? <Loading rows={5} /> : null}
      <ErrorState error={error} onRetry={reload} />

      {!loading && data ? (
        <>
          <Card className="card-pad" style={{ marginBottom: 14 }}>
            <div className="row-between" style={{ marginBottom: 8 }}>
              <p style={{ fontWeight: 700 }}>
                {data.paidCount} of {data.payableCount} paid
              </p>
              <p className="num" style={{ fontWeight: 700 }}>
                {money(data.collected)}
                <span className="small muted" style={{ fontWeight: 400 }}>
                  {' '}
                  / {money(data.expected)}
                </span>
              </p>
            </div>
            <Progress value={data.collected} max={data.expected} />
          </Card>

          {data.rows.length === 0 ? (
            <Empty title="No members yet" />
          ) : (
            <Card>
              <CardHead title="Everyone" />
              {data.rows.map((row) => (
                <div key={row.memberId} className="list-row">
                  <span
                    className="avatar"
                    aria-hidden="true"
                    style={
                      row.status === 'paid'
                        ? { background: 'var(--credit-soft)', color: 'var(--credit)', borderColor: 'var(--credit)' }
                        : undefined
                    }
                  >
                    {initials(row.name)}
                  </span>

                  <div className="list-body">
                    <p className="list-name">{row.name}</p>
                    <p className="list-meta">
                      {row.due > 0 ? `${money(row.due)} due` : 'Not on the collection list'}
                      {row.pendingCount > 1 ? ` · ${row.pendingCount} months behind` : ''}
                    </p>
                  </div>

                  <div className="list-end">{statusChip(row)}</div>
                </div>
              ))}
            </Card>
          )}
        </>
      ) : null}
    </>
  );
}
