import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useFetch } from '../../context/Session.jsx';
import { Icon } from '../../components/Ornaments.jsx';
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
import { initials, money, periodLabel, relativeDays } from '../../lib/format.js';

/**
 * Reminders go out over a wa.me link — free, no Meta approval, no per-message
 * cost. The admin taps, WhatsApp opens with the message ready, they send it.
 */
export default function Pending() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/admin/pending');
  const [target, setTarget] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const openReminder = (member) => {
    setTarget(member);
    setMessage(
      `Namaste ${member.name} ji.\n${data.groupName} — ₹${member.pendingPaise / 100} pending (${member.pendingPeriods
        .map((p) => periodLabel(p))
        .join(', ')}).\nUPI: ${data.upiId}\nDhanyavaad.`,
    );
  };

  const send = async () => {
    setBusy(true);
    try {
      const res = await api.post('/admin/reminders', {
        memberId: target.memberId,
        messageText: message,
      });
      window.open(res.whatsappUrl, '_blank', 'noopener');
      toast('WhatsApp opened', 'ok');
      setTarget(null);
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const totalPaise = data.members.reduce((s, m) => s + m.pendingPaise, 0);

  return (
    <>
      <PageHead
        eyebrow="Collection"
        title="Pending members"
        sub={`${data.members.length} behind · ${money(totalPaise)} outstanding`}
      />

      {data.members.length === 0 ? (
        <Empty title="Everyone is up to date">Nothing to chase this month.</Empty>
      ) : (
        <Card>
          <CardHead title="Furthest behind first" />
          {data.members.map((m) => (
            <div key={m.memberId} className="list-row">
              <span className="avatar" aria-hidden="true">
                {initials(m.name)}
              </span>

              <div className="list-body">
                <Link to={`/admin/members/${m.memberId}`} className="list-name" style={{ color: 'inherit' }}>
                  {m.name}
                </Link>
                <p className="list-meta">
                  {m.pendingCount} {m.pendingCount === 1 ? 'month' : 'months'} ·{' '}
                  {money(m.pendingPaise)}
                </p>
                <p className="tiny muted">
                  {m.lastRemindedAt ? `Reminded ${relativeDays(m.lastRemindedAt)}` : 'Never reminded'}
                </p>
              </div>

              <div className="list-end">
                <Button variant="saffron" size="sm" onClick={() => openReminder(m)}>
                  <Icon.whatsapp />
                  Remind
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Sheet open={!!target} title="Send a reminder" onClose={() => setTarget(null)}>
        <div className="sheet-pad stack">
          {target ? (
            <Notice kind="info">
              {target.name} · {target.phone} · {money(target.pendingPaise)} pending
            </Notice>
          ) : null}

          <Field label="Message" id="rem-msg" hint="Edit it before sending if you want.">
            <textarea
              id="rem-msg"
              className="textarea"
              style={{ minHeight: 130 }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>

          <Button variant="saffron" block onClick={send} disabled={busy}>
            <Icon.whatsapp />
            {busy ? 'Opening…' : 'Open WhatsApp'}
          </Button>

          <p className="hint center">
            WhatsApp opens with this message ready. You still press send yourself.
          </p>
        </div>
      </Sheet>
    </>
  );
}
