import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useFetch } from '../../context/Session.jsx';
import { BackLink } from '../../components/Layout.jsx';
import { Icon } from '../../components/Ornaments.jsx';
import {
  Button,
  Card,
  CardHead,
  ErrorState,
  Field,
  Loading,
  Notice,
  Rule,
  Sheet,
  Stat,
  useToast,
} from '../../components/ui.jsx';
import LedgerRow from '../../components/LedgerRow.jsx';
import { initials, money, periodLabel, periodShort, relativeDays, shortDate } from '../../lib/format.js';

export default function MemberDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/admin/members/${id}`, [id]);

  const [planOpen, setPlanOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const m = data.member;

  const openPlan = () => {
    setAmount(String(m.monthlyAmountPaise / 100));
    setEnabled(m.isEnabled);
    setFormError('');
    setPlanOpen(true);
  };

  const savePlan = async () => {
    setBusy(true);
    setFormError('');
    try {
      await api.put(`/admin/members/${id}/plan`, {
        isEnabled: enabled,
        amountPaise: Math.round((Number(amount) || 0) * 100),
      });
      toast('Contribution updated', 'ok');
      setPlanOpen(false);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remind = async () => {
    try {
      const res = await api.post('/admin/reminders', { memberId: id });
      window.open(res.whatsappUrl, '_blank', 'noopener');
      toast('WhatsApp opened', 'ok');
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  return (
    <>
      <BackLink to="/admin/members">All members</BackLink>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
        <span className="avatar" style={{ width: 54, height: 54, fontSize: 20 }} aria-hidden="true">
          {initials(m.name)}
        </span>
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title" style={{ fontSize: 'var(--t-xl)' }}>
            {m.name}
          </h1>
          {m.fatherName ? <p className="small muted">S/o {m.fatherName}</p> : null}
          <p className="small muted num">
            {m.phone} · member since {periodLabel(m.joinedPeriod)}
          </p>
        </div>
      </div>

      <div className="btn-row" style={{ marginBottom: 16 }}>
        <a href={`tel:+91${m.phone}`} className="btn btn-ghost">
          <Icon.phone />
          Call
        </a>
        <a
          href={`https://wa.me/91${m.phone}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
        >
          <Icon.whatsapp />
          Chat
        </a>
      </div>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <Stat label="Paid in total" value={money(m.totalPaidPaise)} />
        <Stat label="Monthly" value={m.isEnabled ? money(m.monthlyAmountPaise) : '—'} />
        <Stat label="Months pending" value={m.pendingCount} />
        <Stat label="Outstanding" value={money(m.pendingPaise)} />
      </div>

      {m.pendingCount > 0 ? (
        <Card className="card-pad" style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>
            {m.pendingCount} {m.pendingCount === 1 ? 'month' : 'months'} pending —{' '}
            {money(m.pendingPaise)}
          </p>
          <p className="small muted">
            {m.pendingPeriods.map((p) => periodLabel(p)).join(', ')}
          </p>
          <p className="hint" style={{ marginTop: 6 }}>
            {data.lastRemindedAt
              ? `Last reminded ${relativeDays(data.lastRemindedAt)}`
              : 'Never reminded'}
          </p>
          <Button variant="saffron" block style={{ marginTop: 12 }} onClick={remind}>
            <Icon.whatsapp />
            Send a reminder
          </Button>
        </Card>
      ) : m.advancePaise > 0 ? (
        <Notice kind="ok">Paid {money(m.advancePaise)} in advance. Nothing due.</Notice>
      ) : (
        <Notice kind="ok">Up to date. Nothing pending.</Notice>
      )}

      <div style={{ margin: '22px 0 12px' }}>
        <Rule label="Month by month" />
      </div>

      <div className="month-grid">
        {m.months.map((month) => (
          <div key={month.period} className={`month-cell cell-${month.status}`}>
            <p className="m">{periodShort(month.period)}</p>
            <p className="v">
              {month.status === 'exempt' ? '—' : `₹${Math.round(month.paidPaise / 100)}`}
            </p>
          </div>
        ))}
      </div>

      <div style={{ margin: '22px 0 12px' }}>
        <Rule label="Contribution setting" />
      </div>

      <Card className="card-pad">
        <div className="row-between">
          <div>
            <p style={{ fontWeight: 700 }}>
              {m.isEnabled ? `${money(m.monthlyAmountPaise)} every month` : 'Not on the collection list'}
            </p>
            <p className="small muted">
              {m.isEnabled
                ? 'Dues accrue each month from this amount.'
                : 'Still a full member of the club. No dues accrue.'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={openPlan}>
            Change
          </Button>
        </div>
      </Card>

      {data.plans.length > 1 ? (
        <Card style={{ marginTop: 12 }}>
          <CardHead title="History of changes" />
          {data.plans.map((p) => (
            <div key={p.id} className="kv" style={{ padding: '10px 14px' }}>
              <dt>
                {periodLabel(p.effectiveFrom)}
                {p.effectiveTo ? ` – ${periodLabel(p.effectiveTo)}` : ' – now'}
              </dt>
              <dd>{p.isEnabled ? money(p.amountPaise) : 'Off'}</dd>
            </div>
          ))}
        </Card>
      ) : null}

      <div style={{ margin: '22px 0 12px' }}>
        <Rule label={`${data.entries.length} entries`} />
      </div>

      <Card>
        {data.entries.length === 0 ? (
          <div className="card-pad">
            <p className="muted small">Nothing recorded against this member yet.</p>
          </div>
        ) : (
          data.entries.map((entry) => <LedgerRow key={entry.id} entry={entry} />)
        )}
      </Card>

      <Sheet open={planOpen} title="Monthly contribution" onClose={() => setPlanOpen(false)}>
        <div className="sheet-pad stack">
          <Notice kind="error">{formError}</Notice>
          <Notice kind="info">
            This takes effect from this month forward. Every past month keeps the amount that was
            actually in force at the time.
          </Notice>

          <div className="segmented">
            <button
              type="button"
              className={enabled ? 'on-credit' : ''}
              onClick={() => setEnabled(true)}
            >
              Contributing
            </button>
            <button
              type="button"
              className={!enabled ? 'on-debit' : ''}
              onClick={() => setEnabled(false)}
            >
              Not contributing
            </button>
          </div>

          {enabled ? (
            <Field label="Amount every month" id="plan-amount">
              <input
                id="plan-amount"
                className="input num"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="decimal"
              />
            </Field>
          ) : (
            <p className="hint">
              {m.name} stays in the club and on the members list. No dues will accrue from this
              month onward.
            </p>
          )}

          <div className="btn-row">
            <Button variant="ghost" onClick={() => setPlanOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePlan} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Sheet>

      <p className="tiny muted center" style={{ marginTop: 18 }}>
        Joined {shortDate(m.joinedPeriod ? `${m.joinedPeriod}-01` : null)}
      </p>
    </>
  );
}
