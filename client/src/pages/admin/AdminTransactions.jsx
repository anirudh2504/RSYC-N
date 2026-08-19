import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import {
  Button,
  Card,
  CardHead,
  Empty,
  ErrorState,
  Field,
  Loading,
  Notice,
  PageHead,
  Sheet,
  useToast,
} from '../../components/ui.jsx';
import LedgerRow from '../../components/LedgerRow.jsx';
import { money } from '../../lib/format.js';

export default function AdminTransactions() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [state, setState] = useState({ loading: true, entries: [], total: 0, hasMore: false, balancePaise: 0 });
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);
  const [reversing, setReversing] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    setError(null);
    const t = setTimeout(() => {
      api
        .get(`/admin/transactions?limit=25&offset=0&q=${encodeURIComponent(q)}`)
        .then((data) => {
          if (!alive) return;
          setState({ loading: false, ...data });
          setOffset(data.entries.length);
        })
        .catch((err) => {
          if (alive) {
            setError(err);
            setState((s) => ({ ...s, loading: false }));
          }
        });
    }, q ? 300 : 0);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, nonce]);

  const loadMore = async () => {
    const data = await api.get(
      `/admin/transactions?limit=25&offset=${offset}&q=${encodeURIComponent(q)}`,
    );
    setState((s) => ({ ...data, loading: false, entries: [...s.entries, ...data.entries] }));
    setOffset((o) => o + data.entries.length);
  };

  const doReverse = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/transactions/${reversing.id}/reverse`, { reason });
      toast('Entry reversed', 'ok');
      setReversing(null);
      setReason('');
      setNonce((n) => n + 1);
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        eyebrow="Ledger"
        title="All transactions"
        sub="Entries lock 15 minutes after they are recorded. After that, reverse instead of edit."
      />

      <input
        className="input"
        placeholder="Search reason, member or amount"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 14 }}
        aria-label="Search transactions"
      />

      <ErrorState error={error} />

      {state.loading ? (
        <Loading rows={5} />
      ) : state.entries.length === 0 ? (
        <Empty title="Nothing found">Try a different search.</Empty>
      ) : (
        <>
          <Card>
            <CardHead
              title={`${state.total} entries`}
              action={<span className="small muted num">Balance {money(state.balancePaise)}</span>}
            />
            {state.entries.map((entry) => (
              <LedgerRow
                key={entry.id}
                entry={entry}
                footer={
                  entry.canReverse ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 8 }}
                      onClick={() => {
                        setReversing(entry);
                        setReason('');
                      }}
                    >
                      Reverse this
                    </button>
                  ) : entry.canEdit ? (
                    <p className="ledger-meta" style={{ color: 'var(--saffron)', fontWeight: 600 }}>
                      Editable for a few more minutes
                    </p>
                  ) : null
                }
              />
            ))}
          </Card>

          {state.hasMore ? (
            <Button variant="ghost" block style={{ marginTop: 14 }} onClick={loadMore}>
              Load older entries
            </Button>
          ) : null}
        </>
      )}

      <Sheet open={!!reversing} title="Reverse this entry" onClose={() => setReversing(null)}>
        <div className="sheet-pad stack">
          <Notice kind="warn">
            The original stays in the ledger, struck through. A matching opposite entry cancels it
            out. Nothing is deleted.
          </Notice>

          {reversing ? (
            <Card>
              <LedgerRow entry={reversing} />
            </Card>
          ) : null}

          <Field label="Why is this being reversed?" id="rev-reason">
            <textarea
              id="rev-reason"
              className="textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Amount typed as 2000 instead of 200"
            />
          </Field>

          <div className="btn-row">
            <Button variant="ghost" onClick={() => setReversing(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={doReverse} disabled={busy || reason.trim().length < 5}>
              {busy ? 'Reversing…' : 'Reverse'}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
