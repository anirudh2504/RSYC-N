import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { Button, Card, Field, Notice, PageHead } from '../../components/ui.jsx';

export default function Join() {
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/open/join-request', form);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <>
        <PageHead eyebrow="Request sent" title="Thank you" />
        <Card className="card-pad">
          <p>
            Your request has reached the club admins. Someone will speak to you before adding you to
            the members list.
          </p>
          <Link to="/" style={{ display: 'block', marginTop: 16 }}>
            <Button variant="ghost" block>
              Back to events
            </Button>
          </Link>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHead
        eyebrow="Membership"
        title="Request to join"
        sub="Leave your name and number. An admin will get in touch."
      />

      <Card className="card-pad">
        <form className="stack" onSubmit={submit}>
          <Notice kind="error">{error}</Notice>

          <Field label="Your full name" id="join-name">
            <input
              id="join-name"
              className="input"
              value={form.name}
              onChange={set('name')}
              autoComplete="name"
              required
            />
          </Field>

          <Field label="Mobile number" id="join-phone" hint="10 digits, without +91">
            <input
              id="join-phone"
              className="input num"
              value={form.phone}
              onChange={set('phone')}
              inputMode="numeric"
              maxLength={10}
              autoComplete="tel"
              required
            />
          </Field>

          <Field label="Anything you want to add" id="join-msg">
            <textarea
              id="join-msg"
              className="textarea"
              value={form.message}
              onChange={set('message')}
              maxLength={500}
              placeholder="Optional"
            />
          </Field>

          <Button type="submit" block disabled={busy}>
            {busy ? 'Sending…' : 'Send request'}
          </Button>

          <p className="hint center">
            Nothing is shared publicly. Only the club admins see this.
          </p>
        </form>
      </Card>
    </>
  );
}
