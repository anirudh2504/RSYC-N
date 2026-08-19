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
  Rule,
  SecretInput,
  useToast,
} from '../../components/ui.jsx';
import { shortDate, relativeDays } from '../../lib/format.js';

function strengthOf(pin) {
  if (pin.length === 0) return { label: '', pct: 0, kind: '' };
  if (pin.length < 6) return { label: 'Too short', pct: 20, kind: 'error' };
  const words = pin.split(/[-\s_]+/).filter(Boolean).length;
  if (words >= 3 || pin.length >= 14) return { label: 'Strong', pct: 100, kind: 'ok' };
  if (words >= 2 || pin.length >= 10) return { label: 'Good', pct: 70, kind: 'ok' };
  return { label: 'Weak — try two or three words', pct: 40, kind: 'warn' };
}

/**
 * The single control that decides who in the village can see the money.
 * The current PIN is never displayed — it is stored only as a hash.
 */
export default function Pin() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/admin/pin');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  if (loading) return <Loading rows={4} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const strength = strengthOf(pin);

  const save = async () => {
    setBusy(true);
    setFormError('');
    try {
      await api.put('/admin/pin', { pin });
      toast('PIN changed. Everyone has been signed out.', 'ok');
      setPin('');
      setConfirm(false);
      reload();
    } catch (err) {
      setFormError(err.message);
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  const announce = `${'Rav Shekha Ji Yuva Club, Nangla'}\nNew club PIN: ${pin}\nOpen ${window.location.origin} and tap "View fund details".`;

  return (
    <>
      <PageHead
        eyebrow="Master admin"
        title="Group PIN"
        sub="One shared PIN lets any villager see the fund. Nobody needs an account."
      />

      <Card className="card-pad" style={{ marginBottom: 16 }}>
        <dl className="kv">
          <dt>Version</dt>
          <dd className="num">#{data.pinVersion}</dd>
        </dl>
        <dl className="kv">
          <dt>Last changed</dt>
          <dd>{data.pinUpdatedAt ? shortDate(data.pinUpdatedAt) : 'Never'}</dd>
        </dl>
        <dl className="kv">
          <dt>Changed by</dt>
          <dd>{data.pinUpdatedBy || '—'}</dd>
        </dl>
        <dl className="kv">
          <dt>Session length</dt>
          <dd>{data.viewerSessionDays} days</dd>
        </dl>
        <p className="hint" style={{ marginTop: 10 }}>
          The current PIN is never shown here. It is stored only as a hash, so if it is forgotten
          you set a new one rather than looking it up.
        </p>
      </Card>

      <Card className="card-pad">
        <p className="section-title">Change the PIN</p>

        <div className="stack" style={{ marginTop: 12 }}>
          <Notice kind="error">{formError}</Notice>

          <Field
            label="New PIN"
            id="new-pin"
            hint="At least 6 characters. Two or three easy words beats four digits — just as easy to say aloud at a meeting, far harder to guess."
          >
            <SecretInput
              id="new-pin"
              className="input pin-input"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setConfirm(false);
              }}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
              placeholder="nangla-club-2026"
            />
          </Field>

          {pin ? (
            <div>
              <div className="progress" style={{ height: 6 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${strength.pct}%`,
                    background:
                      strength.kind === 'ok'
                        ? 'var(--credit)'
                        : strength.kind === 'warn'
                          ? 'var(--adjust)'
                          : 'var(--debit)',
                  }}
                />
              </div>
              <p className="hint" style={{ marginTop: 5 }}>
                {strength.label}
              </p>
            </div>
          ) : null}

          {!confirm ? (
            <Button block disabled={pin.length < 6} onClick={() => setConfirm(true)}>
              Change the PIN
            </Button>
          ) : (
            <>
              <Notice kind="warn">
                This signs out <strong>everyone in the village</strong> immediately. They will each
                need the new PIN to get back in. Make sure you can tell them.
              </Notice>
              <div className="btn-row">
                <Button variant="ghost" onClick={() => setConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={save} disabled={busy}>
                  {busy ? 'Changing…' : 'Yes, change it'}
                </Button>
              </div>
            </>
          )}

          {pin.length >= 6 ? (
            <a
              href={`https://wa.me/?text=${encodeURIComponent(announce)}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-block"
            >
              Share the new PIN on WhatsApp
            </a>
          ) : null}
        </div>
      </Card>

      <div style={{ margin: '24px 0 12px' }}>
        <Rule label="Failed attempts" />
      </div>

      <Card>
        <CardHead title={`${data.failedAttempts.length} in the last 30 days`} />
        {data.failedAttempts.length === 0 ? (
          <div className="card-pad">
            <p className="muted small">None. Nobody is guessing at the door.</p>
          </div>
        ) : (
          data.failedAttempts.map((a) => (
            <div key={a.id} className="kv" style={{ padding: '10px 14px' }}>
              <dt className="num">{a.ip}</dt>
              <dd className="muted" style={{ fontWeight: 400 }}>
                {relativeDays(a.createdAt)}
              </dd>
            </div>
          ))
        )}
      </Card>

      <p className="tiny muted center" style={{ marginTop: 16 }}>
        A shared PIN cannot be revoked for one person. When someone leaves the club on bad terms,
        change it for everyone — it takes ten seconds.
      </p>
    </>
  );
}
