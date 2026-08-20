import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../../context/Session.jsx';
import { Logo } from '../../components/Ornaments.jsx';
import { Button, Field, Notice } from '../../components/ui.jsx';

export default function Login() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const from = (location.state && location.state.from) || '/admin';

  if (!session.loading && session.isAdmin) return <Navigate to={from} replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await session.login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <div className="gate-inner">
        <Logo className="gate-crest" />
        <h1 className="gate-title">Admin sign in</h1>
        <p className="gate-sub">Only club admins record transactions and manage members.</p>

        <form className="stack" onSubmit={submit}>
          <Notice kind="error">{error}</Notice>

          <Field label="Email" id="email">
            <input
              id="email"
              type="email"
              className="input"
              value={form.email}
              onChange={set('email')}
              autoComplete="username"
              autoCapitalize="none"
              required
            />
          </Field>

          <Field label="Password" id="password">
            <input
              id="password"
              type="password"
              className="input"
              value={form.password}
              onChange={set('password')}
              autoComplete="current-password"
              required
            />
          </Field>

          <Button type="submit" block disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {session.demoHint ? (
          <div className="demo-box">
            <p style={{ fontWeight: 700, color: 'var(--ink)' }}>Demo data — nothing is saved</p>
            <p>
              Master <b>{session.demoHint.email}</b> / <b>{session.demoHint.password}</b>
            </p>
            <p>
              Admin <b>{session.demoHint.adminEmail}</b> / <b>{session.demoHint.adminPassword}</b>
            </p>
          </div>
        ) : null}

        <div className="center" style={{ marginTop: 20, display: 'grid', gap: 10 }}>
          <Link to="/" className="small">
            Back to events
          </Link>
          <Link to="/unlock" className="small muted">
            I only have the club PIN
          </Link>
        </div>
        <p className="tiny muted center" style={{ marginTop: 14 }}>
          Members do not need an account. This is only for the two or three people who record
          money.
        </p>
      </div>
    </div>
  );
}
