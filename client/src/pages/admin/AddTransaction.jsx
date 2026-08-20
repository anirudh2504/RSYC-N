import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useFetch } from '../../context/Session.jsx';
import { Button, Card, CardHead, Field, Loading, Notice, PageHead, useToast } from '../../components/ui.jsx';
import LedgerRow from '../../components/LedgerRow.jsx';
import { amountInWords, money, periodLabel, todayInput } from '../../lib/format.js';

/**
 * One form for both directions.
 *
 * On a credit the month allocation fills itself in from the amount, so the
 * admin usually just confirms it. That single field is what makes "3 months
 * pending" work everywhere else in the app, at no extra effort here.
 */
export default function AddTransaction() {
  const navigate = useNavigate();
  const toast = useToast();
  // Arriving from an event page pre-selects that event and money-out.
  const [params] = useSearchParams();
  const fromEvent = params.get('eventId') || '';

  const membersQuery = useFetch('/admin/members');
  const eventsQuery = useFetch('/admin/events');
  const recentQuery = useFetch('/admin/transactions?limit=5');

  const [direction, setDirection] = useState(fromEvent ? 'debit' : 'credit');
  const [rupees, setRupees] = useState('');
  const [occurredOn, setOccurredOn] = useState(todayInput());
  const [memberId, setMemberId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [allocations, setAllocations] = useState([]);
  const [chosen, setChosen] = useState({});
  const [reason, setReason] = useState('');
  const [eventId, setEventId] = useState(fromEvent);
  const [note, setNote] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const amountPaise = Math.round((Number(rupees) || 0) * 100);
  const members = membersQuery.data ? membersQuery.data.members : [];
  const events = eventsQuery.data ? eventsQuery.data.events : [];

  // Ask the server which months this amount should settle. Debounced, so it
  // does not fire on every keystroke.
  useEffect(() => {
    if (direction !== 'credit' || !memberId || amountPaise <= 0) {
      setAllocations([]);
      setChosen({});
      return undefined;
    }
    const t = setTimeout(() => {
      api
        .get(`/admin/transactions/suggest?memberId=${memberId}&amountPaise=${amountPaise}`)
        .then((data) => {
          setAllocations(data.allocations);
          const next = {};
          data.allocations.forEach((a) => {
            next[a.period] = true;
          });
          setChosen(next);
        })
        .catch(() => {
          setAllocations([]);
          setChosen({});
        });
    }, 300);
    return () => clearTimeout(t);
  }, [direction, memberId, amountPaise]);

  const selected = allocations.filter((a) => chosen[a.period]);
  const allocatedPaise = selected.reduce((s, a) => s + a.amountPaise, 0);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (amountPaise <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }

    setBusy(true);
    try {
      const body = {
        direction,
        amountPaise,
        occurredOn: new Date(`${occurredOn}T06:00:00`).toISOString(),
        note,
      };

      if (direction === 'credit') {
        if (memberId) {
          body.memberId = memberId;
          body.allocations = selected;
        } else {
          body.payerName = payerName;
        }
      } else {
        body.reason = reason;
        body.eventId = eventId || null;
      }

      await api.post('/admin/transactions', body);
      toast(direction === 'credit' ? 'Payment recorded' : 'Expense recorded', 'ok');
      navigate(fromEvent ? `/admin/events/${fromEvent}` : '/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (membersQuery.loading) return <Loading rows={4} />;

  return (
    <>
      <PageHead eyebrow="New entry" title="Add transaction" />

      <Card className="card-pad">
        <form className="stack" onSubmit={submit}>
          <Notice kind="error">{error}</Notice>

          <div className="segmented">
            <button
              type="button"
              className={direction === 'credit' ? 'on-credit' : ''}
              onClick={() => setDirection('credit')}
            >
              Money in
            </button>
            <button
              type="button"
              className={direction === 'debit' ? 'on-debit' : ''}
              onClick={() => setDirection('debit')}
            >
              Money out
            </button>
          </div>

          <Field label="Amount" id="amount">
            <input
              id="amount"
              className="input input-amount num"
              value={rupees}
              onChange={(e) => setRupees(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal"
              placeholder="0"
              autoFocus
              required
            />
          </Field>

          {amountPaise > 0 ? (
            <p className="hint center" style={{ marginTop: -6, textTransform: 'capitalize' }}>
              {amountInWords(amountPaise)}
            </p>
          ) : null}

          <Field
            label="Date"
            id="date"
            hint="Leave it as today unless the money moved earlier. This cannot be changed later."
          >
            <input
              id="date"
              type="date"
              className="input"
              value={occurredOn}
              max={todayInput()}
              onChange={(e) => setOccurredOn(e.target.value)}
            />
          </Field>

          {direction === 'credit' ? (
            <>
              <Field label="Who gave this money" id="member">
                <select
                  id="member"
                  className="select"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                >
                  <option value="">Someone else / donation</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.pendingCount > 0 ? ` — ${m.pendingCount} pending` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              {!memberId ? (
                <Field label="Name of the giver" id="payer">
                  <input
                    id="payer"
                    className="input"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="e.g. Sarpanch ji"
                    required
                  />
                </Field>
              ) : null}

              {memberId && allocations.length ? (
                <div>
                  <p className="label" style={{ marginBottom: 6 }}>
                    Months this covers
                  </p>
                  <div className="card" style={{ overflow: 'hidden' }}>
                    {allocations.map((a) => (
                      <label key={a.period} className={`check-row${chosen[a.period] ? ' is-on' : ''}`}>
                        <input
                          type="checkbox"
                          checked={!!chosen[a.period]}
                          onChange={(e) =>
                            setChosen((c) => ({ ...c, [a.period]: e.target.checked }))
                          }
                        />
                        <span className="check-body">
                          <span className="check-name">{periodLabel(a.period)}</span>
                        </span>
                        <span className="num small muted">{money(a.amountPaise)}</span>
                      </label>
                    ))}
                  </div>
                  <p className="hint" style={{ marginTop: 6 }}>
                    Ticked automatically from the amount. {money(allocatedPaise)} of{' '}
                    {money(amountPaise)} allocated.
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            /* Money out is deliberately just three things: how much, what for,
               and optionally which event it belongs to. */
            <>
              <Field
                label="Reason"
                id="reason"
                hint="At least 10 characters. This is what every member reads on the ledger."
              >
                <textarea
                  id="reason"
                  className="textarea"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Borewell motor repair at the school"
                  required
                />
              </Field>

              <Field label="For an event" id="event" hint="Optional. Links the spend to an event page.">
                <select
                  id="event"
                  className="select"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                >
                  <option value="">Not for an event</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          {direction === 'credit' ? (
            <Field label="Note" id="note" hint="Optional.">
              <input
                id="note"
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          ) : null}

          <Button type="submit" block disabled={busy}>
            {busy ? 'Saving…' : `Record ${direction === 'credit' ? 'money in' : 'money out'}`}
          </Button>

          <p className="hint center">
            You can edit this for 15 minutes. After that it can only be reversed.
          </p>
        </form>
      </Card>

      {recentQuery.data && recentQuery.data.entries.length ? (
        <div style={{ marginTop: 20 }}>
          <Card>
            <CardHead title="Just recorded" />
            {recentQuery.data.entries.slice(0, 5).map((entry) => (
              <LedgerRow key={entry.id} entry={entry} />
            ))}
          </Card>
        </div>
      ) : null}
    </>
  );
}
