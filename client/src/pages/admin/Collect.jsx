import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import {
  Card,
  CardHead,
  Confirm,
  Empty,
  ErrorState,
  Loading,
  PageHead,
  Progress,
  useToast,
} from '../../components/ui.jsx';
import { money, periodLabel, periodLabelLong, currentPeriod } from '../../lib/format.js';

/**
 * The most-used screen in the club.
 *
 * Every contributing member is listed. Ticking one asks yes or no, and on yes
 * the payment is recorded straight away — the balance moves, the member shows
 * as paid everywhere, and a proper transaction appears in the ledger reading
 * "contribution for <month>".
 */
export default function Collect() {
  const toast = useToast();
  const [period, setPeriod] = useState(currentPeriod());
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [asking, setAsking] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/admin/collect?period=${period}`)
      .then(setBoard)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = board ? board.rows.filter((r) => r.duePaise > 0) : [];
  const exemptCount = board ? board.rows.length - rows.length : 0;

  const record = async () => {
    setBusy(true);
    try {
      const res = await api.post('/admin/collect', {
        period,
        payments: [{ memberId: asking.memberId, amountPaise: asking.owedPaise }],
      });
      // The server hands back the recalculated board, so the list, the totals
      // and the progress bar all move together with no second request.
      if (res.board) setBoard(res.board);
      else load();
      toast(`${money(asking.owedPaise)} recorded for ${asking.name}`, 'ok');
      setAsking(null);
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const months = [];
  for (let i = 0; i < 4; i += 1) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <>
      <PageHead eyebrow="Monthly contribution" title={periodLabelLong(period)} />

      <select
        className="select"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        aria-label="Choose a month"
        style={{ marginBottom: 14 }}
      >
        {months.map((p) => (
          <option key={p} value={p}>
            {periodLabel(p)}
          </option>
        ))}
      </select>

      <ErrorState error={error} onRetry={load} />

      {loading ? (
        <Loading rows={5} />
      ) : board ? (
        <>
          <Card className="card-pad" style={{ marginBottom: 14 }}>
            <div className="row-between" style={{ marginBottom: 8 }}>
              <p style={{ fontWeight: 700 }}>
                {board.paidCount} of {board.payableCount} paid
              </p>
              <p className="num" style={{ fontWeight: 700 }}>
                {money(board.collectedPaise)}
                <span className="small muted" style={{ fontWeight: 400 }}>
                  {' '}
                  / {money(board.expectedPaise)}
                </span>
              </p>
            </div>
            <Progress value={board.collectedPaise} max={board.expectedPaise} />
          </Card>

          {rows.length === 0 ? (
            <Empty title="Nobody is on the collection list">
              Add members, or switch their monthly contribution on.
            </Empty>
          ) : (
            <Card>
              <CardHead title="All contributing members" />
              {rows.map((r) => {
                const owed = Math.max(r.duePaise - r.paidPaise, 0);
                const done = r.status === 'paid';
                return (
                  <div key={r.memberId} className={`check-row${done ? ' is-done' : ''}`}>
                    <input
                      id={`tick-${r.memberId}`}
                      type="checkbox"
                      checked={done}
                      disabled={done || busy}
                      onChange={() =>
                        setAsking({
                          memberId: r.memberId,
                          name: r.name,
                          owedPaise: owed,
                          duePaise: r.duePaise,
                          paidPaise: r.paidPaise,
                        })
                      }
                    />
                    <label className="check-body" htmlFor={`tick-${r.memberId}`}>
                      <span className="check-name">{r.name}</span>
                      <span className="list-meta" style={{ display: 'block' }}>
                        {done
                          ? `${money(r.paidPaise)} received`
                          : `${money(owed)} due${
                              r.paidPaise > 0 ? ` · ${money(r.paidPaise)} part paid` : ''
                            }`}
                        {r.pendingCount > 1 ? ` · ${r.pendingCount} months behind` : ''}
                      </span>
                    </label>
                    <span className={`chip chip-${done ? 'paid' : r.status === 'partial' ? 'partial' : 'unpaid'}`}>
                      {done ? 'Paid' : r.status === 'partial' ? 'Part' : 'Not yet'}
                    </span>
                  </div>
                );
              })}
            </Card>
          )}

          {exemptCount ? (
            <p className="tiny muted center" style={{ marginTop: 18 }}>
              {exemptCount} {exemptCount === 1 ? 'member is' : 'members are'} not on the monthly
              collection list and are not shown here.
            </p>
          ) : null}
        </>
      ) : null}

      <Confirm
        open={!!asking}
        title="Record this payment?"
        busy={busy}
        confirmLabel="Yes, record it"
        onCancel={() => setAsking(null)}
        onConfirm={record}
      >
        {asking ? (
          <>
            <p className="confirm-figure num">{money(asking.owedPaise)}</p>
            <p style={{ color: 'var(--ink-2)' }}>
              from <strong>{asking.name}</strong>, as the contribution for{' '}
              <strong>{periodLabelLong(period)}</strong>.
            </p>
            <p className="hint" style={{ marginTop: 10 }}>
              This adds to the club balance immediately, marks them paid everywhere, and puts a
              transaction in the ledger that every member can see.
            </p>
          </>
        ) : null}
      </Confirm>
    </>
  );
}
