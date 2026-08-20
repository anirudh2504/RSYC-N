import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../../context/Session.jsx';
import { Logo } from '../../components/Ornaments.jsx';
import { Button, Field, Notice, SecretInput } from '../../components/ui.jsx';

/**
 * One field, one button. There is no username here because there are no
 * usernames — the PIN is the whole identity.
 */
export default function Unlock() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const from = (location.state && location.state.from) || '/fund';

  if (!session.loading && session.viewer) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await session.unlock(pin);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <div className="gate-inner">
        <Logo className="gate-crest" />
        <h1 className="gate-title">Club fund</h1>
        <p className="gate-sub">
          Enter the club PIN to see the balance, every transaction and the member list.
        </p>

        <form className="stack" onSubmit={submit}>
          <Notice kind="error">{error}</Notice>

          <Field label="Club PIN" id="pin" hint="Ask any member or an admin for it.">
            {/* Masked by default, with a reveal toggle — the same treatment a
                password gets, so it cannot be read over a shoulder. */}
            <SecretInput
              id="pin"
              className="input pin-input"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
              autoFocus
              required
            />
          </Field>

          <Button type="submit" block disabled={busy || pin.length === 0}>
            {busy ? 'Checking…' : 'Unlock'}
          </Button>
        </form>

        {session.demoHint ? (
          <div className="demo-box">
            <p style={{ fontWeight: 700, color: 'var(--ink)' }}>Demo data — nothing is saved</p>
            <p>
              Club PIN <b>{session.demoHint.pin}</b>
            </p>
            <p>
              Master admin <b>{session.demoHint.email}</b> / <b>{session.demoHint.password}</b>
            </p>
          </div>
        ) : null}

        {/* No admin sign-in link here on purpose. This screen is for ordinary
            members; admins reach their own sign-in from the menu. */}
        <div className="center" style={{ marginTop: 20 }}>
          <Link to="/" className="small">
            Back to the club site
          </Link>
        </div>
      </div>
    </div>
  );
}
