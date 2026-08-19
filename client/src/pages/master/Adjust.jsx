import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../context/Session.jsx';
import {
  Button,
  Card,
  CardHead,
  ErrorState,
  Field,
  Loading,
  Notice,
  PageHead,
  useToast,
} from '../../components/ui.jsx';
import LedgerRow from '../../components/LedgerRow.jsx';
import { amountInWords, money } from '../../lib/format.js';

/**
 * There is no "set the balance to X" write anywhere in this codebase. The
 * master admin states what the balance should be, and the system posts an
 * ordinary, visible entry for the difference.
 */
export default function Adjust() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/admin/adjustments');
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  if (loading) return <Loading rows={4} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const targetPaise = Math.round((Number(target) || 0) * 100);
  const deltaPaise = target === '' ? 0 : targetPaise - data.balancePaise;

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      await api.post('/admin/adjustments', { targetPaise, reason });
      toast('Balance corrected', 'ok');
      setTarget('');
      setReason('');
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        eyebrow="Master admin"
        title="Correct the balance"
        sub="Nothing is overwritten. The difference is posted as its own visible entry."
      />

      <Card className="card-pad">
        <form className="stack" onSubmit={submit}>
          <Notice kind="error">{formError}</Notice>

          <div className="row-between">
            <span className="label">Balance right now</span>
            <span className="num" style={{ fontWeight: 700, fontSize: 'var(--t-md)' }}>
              {money(data.balancePaise)}
            </span>
          </div>

          <Field label="What the balance should actually be" id="adj-target">
            <input
              id="adj-target"
              className="input input-amount num"
              value={target}
              onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal"
              placeholder="0"
              required
            />
          </Field>

          {targetPaise > 0 ? (
            <p className="hint center" style={{ marginTop: -6, textTransform: 'capitalize' }}>
              {amountInWords(targetPaise)}
            </p>
          ) : null}

          {deltaPaise !== 0 && target !== '' ? (
            <Notice kind="warn">
              This will post a {deltaPaise > 0 ? 'credit' : 'debit'} of{' '}
              <strong>{money(Math.abs(deltaPaise))}</strong> as a balance correction. It appears in
              the ledger everyone reads.
            </Notice>
          ) : null}

          <Field
            label="Reason"
            id="adj-reason"
            hint="At least 10 characters. Every member will read this."
          >
            <textarea
              id="adj-reason"
              className="textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Cash counted short against the register during the monthly check"
              required
            />
          </Field>

          <Button
            type="submit"
            variant="danger"
            block
            disabled={busy || deltaPaise === 0 || reason.trim().length < 10}
          >
            {busy ? 'Posting…' : 'Post the correction'}
          </Button>
        </form>
      </Card>

      <div style={{ marginTop: 20 }}>
        <Card>
          <CardHead title={`${data.entries.length} past corrections`} />
          {data.entries.length === 0 ? (
            <div className="card-pad">
              <p className="muted small">None yet. That is the healthy state.</p>
            </div>
          ) : (
            data.entries.map((entry) => <LedgerRow key={entry.id} entry={entry} />)
          )}
        </Card>
      </div>

      <p className="tiny muted center" style={{ marginTop: 16 }}>
        If corrections start appearing every month, something upstream is being recorded wrong.
      </p>
    </>
  );
}
