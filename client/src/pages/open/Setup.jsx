import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSession } from '../../context/Session.jsx';
import { Logo } from '../../components/Ornaments.jsx';
import { Button, Field, Notice, SecretInput } from '../../components/ui.jsx';

/**
 * Founding the club. This screen exists once and then never again.
 *
 * The database starts with nothing but the club's own details, so there is no
 * admin to sign in as. Whoever fills this in becomes the master admin — the
 * one account that can never be removed — and chooses the PIN the village will
 * use to see the fund. The moment it is saved the route closes for good.
 */
export default function Setup() {
  const session = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', pin: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Already claimed, or already signed in. Nothing to do here.
  if (!session.loading && !session.setupNeeded) {
    return <Navigate to={session.isAdmin ? '/admin' : '/login'} replace />;
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('The two passwords are not the same.');
      return;
    }

    setBusy(true);
    try {
      await session.setup({
        name: form.name,
        email: form.email,
        password: form.password,
        pin: form.pin,
      });
      navigate('/admin', { replace: true });
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
        <h1 className="gate-title">Set up the club</h1>
        <p className="gate-sub">
          Nobody runs this club yet. Fill this in and you become the master admin — the account
          that manages the fund, the members and every other admin.
        </p>

        <Notice kind="warn">
          This page works only once, and only while the club has no admin. Do it now, on your own
          device, before you give the address to anyone.
        </Notice>

        <form className="stack" onSubmit={submit}>
          <Notice kind="error">{error}</Notice>

          <Field label="Your name" id="name" hint="Shown on the entries you record.">
            <input
              id="name"
              className="input"
              value={form.name}
              onChange={set('name')}
              autoComplete="name"
              required
              autoFocus
            />
          </Field>

          <Field label="Email" id="email" hint="You will sign in with this.">
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

          <Field label="Password" id="password" hint="At least 8 characters.">
            <input
              id="password"
              type="password"
              className="input"
              value={form.password}
              onChange={set('password')}
              autoComplete="new-password"
              required
            />
          </Field>

          <Field label="Password again" id="confirm">
            <input
              id="confirm"
              type="password"
              className="input"
              value={form.confirm}
              onChange={set('confirm')}
              autoComplete="new-password"
              required
            />
          </Field>

          <Field
            label="Club PIN"
            id="pin"
            hint="The one PIN the whole village shares to see the balance and members. At least 6 characters — two or three words beat four digits. You can change it later."
          >
            <SecretInput
              id="pin"
              className="input pin-input"
              value={form.pin}
              onChange={set('pin')}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
              required
            />
          </Field>

          <Button type="submit" block disabled={busy}>
            {busy ? 'Setting up…' : 'Create the club'}
          </Button>
        </form>

        <p className="tiny muted center" style={{ marginTop: 14 }}>
          Everything else — the opening balance, members, events — you add afterwards from the
          admin screens.
        </p>
      </div>
    </div>
  );
}
