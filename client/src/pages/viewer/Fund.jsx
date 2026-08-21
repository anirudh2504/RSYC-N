import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../context/Session.jsx';
import { Jali, Icon } from '../../components/Ornaments.jsx';
import {
  Card,
  CardHead,
  ErrorState,
  Loading,
  Progress,
  Rule,
  useToast,
} from '../../components/ui.jsx';
import LedgerRow from '../../components/LedgerRow.jsx';
import { money, moneyShort, periodLabelLong } from '../../lib/format.js';
import { copyText, isMobileDevice } from '../../lib/device.js';

export default function Fund() {
  const { data, loading, error, reload } = useFetch('/view/summary');
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  // A upi:// link only ever opens something on a phone.
  const onMobile = isMobileDevice();

  const copy = async (text) => {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } else {
      // Never fail silently — tell them what to do instead.
      toast('Could not copy. Press and hold the ID above to select it.', 'bad');
    }
  };

  if (loading) return <Loading rows={4} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const { collection } = data;
  const upiLink = data.upiId
    ? `upi://pay?pa=${encodeURIComponent(data.upiId)}&pn=${encodeURIComponent('Rav Shekha Ji Yuva Club')}&cu=INR`
    : null;

  return (
    <>
      <section className="balance">
        <Jali className="balance-jali" />
        <div className="balance-body">
          <p className="balance-label">Club fund balance</p>
          <p className="balance-figure num">{money(data.balance)}</p>
          <p className="balance-note">
            {moneyShort(data.balance)} &middot; as of today &middot; {data.memberCount} members
          </p>

          <dl className="balance-split">
            <div>
              <dt>In this month</dt>
              <dd className="num in-figure">{money(data.month.credit)}</dd>
            </div>
            <div>
              <dt>Out this month</dt>
              <dd className="num out-figure">{money(data.month.debit)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {data.notice ? (
        <div className="notice-box notice-warn" style={{ marginTop: 14 }}>
          {data.notice}
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <Card className="card-pad">
          <div className="row-between" style={{ marginBottom: 8 }}>
            <div>
              <p style={{ fontWeight: 700 }}>{periodLabelLong(data.period)} collection</p>
              <p className="small muted">
                {collection.paidCount} of {collection.payableCount} members paid
              </p>
            </div>
            <p className="num" style={{ fontWeight: 700, textAlign: 'right' }}>
              {money(collection.collected)}
              <span className="small muted" style={{ display: 'block', fontWeight: 400 }}>
                of {money(collection.expected)}
              </span>
            </p>
          </div>
          <Progress value={collection.collected} max={collection.expected} />
          <Link to="/fund/collection" className="small" style={{ display: 'inline-block', marginTop: 10 }}>
            See who has paid →
          </Link>
        </Card>
      </div>

      <div style={{ margin: '24px 0 12px' }}>
        <Rule label="Recent activity" />
      </div>

      <Card>
        <CardHead
          title="Latest entries"
          action={<span className="small muted">last {data.recent.length}</span>}
        />
        {data.recent.length === 0 ? (
          <div className="card-pad">
            <p className="muted small">Nothing recorded yet.</p>
          </div>
        ) : (
          data.recent.map((entry) => <LedgerRow key={entry.id} entry={entry} />)
        )}

        {/* The main way into the ledger, now that it is not a tab. */}
        {data.recent.length ? (
          <div style={{ padding: 12, borderTop: '1px solid var(--line-soft)' }}>
            <Link to="/fund/transactions" className="btn btn-soft btn-block btn-slim">
              <Icon.ledger />
              View all transactions
            </Link>
          </div>
        ) : null}
      </Card>

      {data.upiId || data.paymentPhone ? (
        <>
          <div style={{ margin: '24px 0 12px' }}>
            <Rule label="Paying your contribution" />
          </div>
          <Card className="card-pad">
            {data.upiId ? (
              <dl className="kv">
                <dt>UPI ID</dt>
                <dd className="num">{data.upiId}</dd>
              </dl>
            ) : null}

            {data.paymentPhone ? (
              <dl className="kv">
                <dt>Phone number</dt>
                <dd className="num">{data.paymentPhone}</dd>
              </dl>
            ) : null}

            {/* The UPI button only appears on a phone. On a laptop no app
                handles upi://, so it would be a button that does nothing. */}
            <div className="btn-row" style={{ marginTop: 14 }}>
              {data.upiId && onMobile ? (
                <a href={upiLink} className="btn btn-saffron">
                  <Icon.phone />
                  Pay by UPI
                </a>
              ) : null}
              <button
                type="button"
                className={`btn ${data.upiId && onMobile ? 'btn-ghost' : 'btn-saffron btn-block'}`}
                onClick={() => copy(data.upiId || data.paymentPhone)}
              >
                {copied ? 'Copied ✓' : `Copy ${data.upiId ? 'UPI ID' : 'number'}`}
              </button>
            </div>

            {!onMobile ? (
              <p className="hint" style={{ marginTop: 8 }}>
                Open this page on your phone to pay straight from a UPI app, or copy the ID and
                paste it there.
              </p>
            ) : null}

            {/* The step everyone forgets, said plainly. */}
            <div className="notice-box notice-info" style={{ marginTop: 14 }}>
              <strong>After you pay, send the screenshot to the club WhatsApp group.</strong> An
              admin records it against your name from there.
            </div>

            {data.whatsappGroupUrl ? (
              <a
                href={data.whatsappGroupUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-block"
                style={{ marginTop: 10 }}
              >
                <Icon.whatsapp />
                Open the club WhatsApp group
              </a>
            ) : null}
          </Card>
        </>
      ) : null}
    </>
  );
}
