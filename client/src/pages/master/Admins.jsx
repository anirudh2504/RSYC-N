import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../context/Session.jsx';
import { Icon } from '../../components/Ornaments.jsx';
import {
  Button,
  Card,
  CardHead,
  ErrorState,
  Field,
  Loading,
  Notice,
  PageHead,
  Sheet,
  useToast,
} from '../../components/ui.jsx';
import { initials, relativeDays } from '../../lib/format.js';

const BLANK = { name: '', email: '', phone: '', password: '' };

export default function Admins() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/admin/admins');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  if (loading) return <Loading rows={4} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    setFormError('');
    try {
      await api.post('/admin/admins', form);
      toast('Admin added', 'ok');
      setAdding(false);
      setForm(BLANK);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (admin) => {
    try {
      await api.del(`/admin/admins/${admin.id}`);
      toast(`${admin.name} removed`, 'ok');
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  return (
    <>
      <PageHead
        eyebrow="Master admin"
        title="Club admins"
        sub="Admins record transactions and manage members. They cannot change the PIN or the balance."
      />

      <Button
        block
        style={{ marginBottom: 16 }}
        onClick={() => {
          setForm(BLANK);
          setFormError('');
          setAdding(true);
        }}
      >
        <Icon.plus />
        Add an admin
      </Button>

      <Card>
        <CardHead title={`${data.admins.length} accounts`} />
        {data.admins.map((a) => (
          <div key={a.id} className="list-row">
            <span
              className="avatar"
              aria-hidden="true"
              style={
                a.role === 'master'
                  ? { background: 'var(--royal)', color: '#fdf6e8', borderColor: 'var(--royal)' }
                  : undefined
              }
            >
              {initials(a.name)}
            </span>

            <div className="list-body">
              <p className="list-name">
                {a.name}
                {a.role === 'master' ? <span className="mini-tag mini-royal">Master</span> : null}
              </p>
              <p className="list-meta">{a.email}</p>
              <p className="tiny muted">
                {a.lastLoginAt ? `Signed in ${relativeDays(a.lastLoginAt)}` : 'Never signed in'}
              </p>
            </div>

            <div className="list-end">
              {a.canRemove ? (
                <Button variant="danger" size="sm" onClick={() => remove(a)}>
                  Remove
                </Button>
              ) : (
                <span className="chip chip-outline">
                  <Icon.lock />
                </span>
              )}
            </div>
          </div>
        ))}
      </Card>

      <p className="tiny muted center" style={{ marginTop: 16 }}>
        The master account cannot be removed or demoted by anyone, including itself. Everything an
        admin recorded stays attributed to their name in the ledger forever.
      </p>

      <Sheet open={adding} title="New admin" onClose={() => setAdding(false)}>
        <div className="sheet-pad stack">
          <Notice kind="error">{formError}</Notice>

          <Field label="Full name" id="a-name">
            <input id="a-name" className="input" value={form.name} onChange={set('name')} />
          </Field>

          <Field label="Email" id="a-email">
            <input
              id="a-email"
              type="email"
              className="input"
              value={form.email}
              onChange={set('email')}
              autoCapitalize="none"
            />
          </Field>

          <Field label="Mobile number" id="a-phone">
            <input
              id="a-phone"
              className="input num"
              value={form.phone}
              onChange={set('phone')}
              inputMode="numeric"
              maxLength={10}
            />
          </Field>

          <Field
            label="Temporary password"
            id="a-pass"
            hint="At least 8 characters. Ask them to change it after their first sign in."
          >
            <input id="a-pass" className="input" value={form.password} onChange={set('password')} />
          </Field>

          <div className="btn-row">
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? 'Adding…' : 'Add admin'}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
