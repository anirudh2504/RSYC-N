import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { Button, Card, Field, Notice } from '../../components/ui.jsx';
import { Logo, Icon } from '../../components/Ornaments.jsx';

/**
 * Request to join the club. Open to anyone — someone who wants in will not
 * have the club PIN yet, so this cannot sit behind it.
 */
export default function Join() {
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [waUrl, setWaUrl] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.post('/open/join-request', form);
      setWaUrl(res.whatsappUrl || null);
      setSentTo(form.phone);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 20 }}>
        <Logo className="crest-large" />
        <h1 className="page-title" style={{ fontSize: 'var(--t-xl)', marginTop: 14 }}>
          Request submitted
        </h1>
        <p className="devanagari muted" style={{ marginTop: 4 }}>
          आपका अनुरोध भेज दिया गया है
        </p>

        <Card className="card-pad" style={{ marginTop: 20, textAlign: 'left' }}>
          <p style={{ color: 'var(--ink-2)', lineHeight: 1.6 }}>
            Someone from the club will contact you on the number you have given —{' '}
            <strong className="num">+91 {sentTo}</strong>.
          </p>
          <p className="devanagari" style={{ color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.7 }}>
            क्लब की ओर से कोई सदस्य आपके दिए गए नंबर पर आपसे संपर्क करेगा।
          </p>
        </Card>

        {/* Optional, and the fastest way to actually reach an admin today. */}
        {waUrl ? (
          <div style={{ marginTop: 16, textAlign: 'left' }}>
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-saffron btn-block btn-slim"
            >
              <Icon.whatsapp />
              Also tell the club on WhatsApp
            </a>
            <p className="hint center" style={{ marginTop: 8 }}>
              Optional — this opens WhatsApp with your details ready to send, so an admin sees it
              immediately.
            </p>
          </div>
        ) : null}

        <div className="btn-row" style={{ marginTop: 18 }}>
          <Link to="/" className="btn btn-ghost btn-slim">
            Events
          </Link>
          <Link to="/members" className="btn btn-soft btn-slim">
            Members
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* The ask, before the form. */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p className="eyebrow">सदस्यता · Membership</p>
        <h1 className="page-title" style={{ marginTop: 6 }}>
          Contribute to the work
          <br />
          and the events
        </h1>
        <p className="devanagari" style={{ color: 'var(--ink-2)', marginTop: 10, fontSize: 'var(--t-md)' }}>
          क्लब के काम और कार्यक्रमों में सहयोग कीजिए — अनुरोध भेजिए या क्लब से जुड़िए।
        </p>
        <p className="small muted" style={{ marginTop: 8, maxWidth: '52ch', margin: '8px auto 0' }}>
          Submit your request or join the club. Anyone from the village is welcome.
        </p>
      </div>

      <Card className="card-pad">
        <form className="stack" onSubmit={submit}>
          <Notice kind="error">{error}</Notice>

          <Field label="Your full name · आपका नाम" id="join-name">
            <input
              id="join-name"
              className="input"
              value={form.name}
              onChange={set('name')}
              autoComplete="name"
              required
            />
          </Field>

          <Field
            label="Mobile number · मोबाइल नंबर"
            id="join-phone"
            hint="10 digits, without +91. The club will call you on this number."
          >
            <input
              id="join-phone"
              className="input num"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/[^0-9]/g, '') }))}
              inputMode="numeric"
              maxLength={10}
              autoComplete="tel"
              required
            />
          </Field>

          <Field label="Anything you want to add" id="join-msg" hint="Optional.">
            <textarea
              id="join-msg"
              className="textarea"
              value={form.message}
              onChange={set('message')}
              maxLength={500}
              placeholder="e.g. I want to help with the sports events"
            />
          </Field>

          <Button
            type="submit"
            block
            className="btn-slim"
            disabled={busy || form.phone.length !== 10}
          >
            {busy ? 'Sending…' : 'Send request'}
          </Button>

          <p className="hint center">
            Nothing is shown publicly. Only the club admins see this.
          </p>
        </form>
      </Card>
    </>
  );
}
