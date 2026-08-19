import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../context/Session.jsx';
import { Button, Card, CardHead, Empty, ErrorState, Loading, PageHead } from '../../components/ui.jsx';
import LedgerRow from '../../components/LedgerRow.jsx';
import { money, periodLabel, currentPeriod } from '../../lib/format.js';

const PAGE = 20;

export default function Transactions() {
  const monthsQuery = useFetch('/view/months');
  const [month, setMonth] = useState('');
  const [type, setType] = useState('');
  const [entries, setEntries] = useState([]);
  const [meta, setMeta] = useState({ total: 0, hasMore: false, month: null, balancePaise: 0 });
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (month) p.set('month', month);
    if (type) p.set('type', type);
    p.set('limit', String(PAGE));
    return p;
  }, [month, type]);

  // Reload from the top whenever a filter changes.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const p = new URLSearchParams(query);
    p.set('offset', '0');

    api
      .get(`/view/transactions?${p.toString()}`)
      .then((data) => {
        if (!alive) return;
        setEntries(data.entries);
        setMeta(data);
        setOffset(data.entries.length);
      })
      .catch((err) => {
        if (alive) setError(err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [query]);

  const loadMore = async () => {
    setMore(true);
    try {
      const p = new URLSearchParams(query);
      p.set('offset', String(offset));
      const data = await api.get(`/view/transactions?${p.toString()}`);
      setEntries((list) => [...list, ...data.entries]);
      setMeta(data);
      setOffset((o) => o + data.entries.length);
    } catch (err) {
      setError(err);
    } finally {
      setMore(false);
    }
  };

  const months = monthsQuery.data ? monthsQuery.data.months : [];
  // The running balance is only meaningful on the current month, because a
  // backdated entry shifts every row that follows it.
  const showRunning = month === currentPeriod();

  let running = meta.balancePaise;

  return (
    <>
      <PageHead
        eyebrow="Club fund"
        title="Every transaction"
        sub="Nothing is ever deleted. Corrections appear as their own entry."
      />

      <div className="stack-sm" style={{ marginBottom: 14 }}>
        <div className="segmented">
          <button
            type="button"
            className={type === '' ? 'on-credit' : ''}
            style={type === '' ? { background: 'var(--royal)', color: '#fdf6e8' } : undefined}
            onClick={() => setType('')}
          >
            All
          </button>
          <button
            type="button"
            className={type === 'credit' ? 'on-credit' : ''}
            onClick={() => setType('credit')}
          >
            Money in
          </button>
          <button
            type="button"
            className={type === 'debit' ? 'on-debit' : ''}
            onClick={() => setType('debit')}
          >
            Money out
          </button>
        </div>

        <select
          className="select"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-label="Filter by month"
        >
          <option value="">All months</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {periodLabel(m)}
            </option>
          ))}
        </select>
      </div>

      {meta.month ? (
        <Card className="card-pad" style={{ marginBottom: 14 }}>
          <div className="row-between">
            <div>
              <p className="stat-k">In</p>
              <p className="num" style={{ fontWeight: 700, color: 'var(--credit)' }}>
                {money(meta.month.creditPaise)}
              </p>
            </div>
            <div>
              <p className="stat-k">Out</p>
              <p className="num" style={{ fontWeight: 700, color: 'var(--debit)' }}>
                {money(meta.month.debitPaise)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="stat-k">Net</p>
              <p className="num" style={{ fontWeight: 700 }}>
                {money(meta.month.netPaise, true)}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <ErrorState error={error} />

      {loading ? (
        <Loading rows={5} />
      ) : entries.length === 0 ? (
        <Empty title="Nothing here">No entries match this filter.</Empty>
      ) : (
        <>
          <Card>
            <CardHead
              title={`${meta.total} ${meta.total === 1 ? 'entry' : 'entries'}`}
              action={
                <span className="small muted num">Balance {money(meta.balancePaise)}</span>
              }
            />
            {entries.map((entry) => {
              let rowFooter = null;
              if (showRunning) {
                rowFooter = <p className="ledger-meta num">Balance after: {money(running)}</p>;
                // Every entry counts here, reversed ones included — a reversed
                // entry and its reversal cancel each other out in the running
                // total exactly as they do in the balance.
                running -= entry.direction === 'credit' ? entry.amountPaise : -entry.amountPaise;
              }
              return <LedgerRow key={entry.id} entry={entry} footer={rowFooter} />;
            })}
          </Card>

          {meta.hasMore ? (
            <Button variant="ghost" block style={{ marginTop: 14 }} onClick={loadMore} disabled={more}>
              {more ? 'Loading…' : 'Load older entries'}
            </Button>
          ) : (
            <p className="tiny muted center" style={{ marginTop: 18 }}>
              That is the whole record.
            </p>
          )}
        </>
      )}
    </>
  );
}
