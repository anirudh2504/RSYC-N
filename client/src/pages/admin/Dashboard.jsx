import { Link } from 'react-router-dom';
import { useFetch, useSession } from '../../context/Session.jsx';
import { Jali, Icon } from '../../components/Ornaments.jsx';
import { Card, CardHead, ErrorState, Loading, Progress, Rule } from '../../components/ui.jsx';
import LedgerRow from '../../components/LedgerRow.jsx';
import { money, periodLabelLong } from '../../lib/format.js';

/** Not a wall of charts — a to-do list. */
export default function Dashboard() {
  const { data, loading, error, reload } = useFetch('/admin/dashboard');
  const session = useSession();

  if (loading) return <Loading rows={4} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const { collection } = data;

  return (
    <>
      <p className="eyebrow" style={{ marginBottom: 10 }}>
        {session.isMaster ? 'Master admin' : 'Admin'} &middot; {data.me.name.split(' ')[0]}
      </p>

      <section className="balance">
        <Jali className="balance-jali" />
        <div className="balance-body">
          <p className="balance-label">Club fund balance</p>
          <p className="balance-figure num">{money(data.balance)}</p>
          <p className="balance-note">
            {data.memberCount} members &middot; {periodLabelLong(data.period)}
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

      <div className="btn-row" style={{ marginTop: 14 }}>
        <Link to="/admin/new" className="btn">
          <Icon.plus />
          Add entry
        </Link>
        <Link to="/admin/collect" className="btn btn-soft">
          <Icon.board />
          Collect
        </Link>
      </div>

      <div style={{ margin: '24px 0 12px' }}>
        <Rule label="Needs attention" />
      </div>

      <div className="stack-sm">
        <Link to="/admin/pending">
          <Card className="card-pad">
            <div className="row-between">
              <div>
                <p style={{ fontWeight: 700 }}>
                  {data.pendingCount} {data.pendingCount === 1 ? 'member' : 'members'} pending
                </p>
                <p className="small muted">{money(data.pending)} outstanding in total</p>
              </div>
              <span className="chevron">
                <Icon.chevron />
              </span>
            </div>
          </Card>
        </Link>

        <Link to="/admin/requests">
          <Card className="card-pad">
            <div className="row-between">
              <div>
                <p style={{ fontWeight: 700 }}>
                  {data.joinRequestCount} join{' '}
                  {data.joinRequestCount === 1 ? 'request' : 'requests'} waiting
                </p>
                <p className="small muted">Approve or reject from the queue</p>
              </div>
              <span className="chevron">
                <Icon.chevron />
              </span>
            </div>
          </Card>
        </Link>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card className="card-pad">
          <div className="row-between" style={{ marginBottom: 8 }}>
            <div>
              <p style={{ fontWeight: 700 }}>{periodLabelLong(data.period)} collection</p>
              <p className="small muted">
                {collection.paidCount} of {collection.payableCount} paid
              </p>
            </div>
            <p className="num" style={{ fontWeight: 700 }}>
              {money(collection.collected)}
            </p>
          </div>
          <Progress value={collection.collected} max={collection.expected} />
        </Card>
      </div>

      <div style={{ margin: '24px 0 12px' }}>
        <Rule label="Just recorded" />
      </div>

      <Card>
        <CardHead
          title="Last five entries"
          action={
            <Link to="/admin/transactions" className="small">
              All
            </Link>
          }
        />
        {data.recent.map((entry) => (
          <LedgerRow key={entry.id} entry={entry} />
        ))}
      </Card>

      <p className="tiny muted center" style={{ marginTop: 16 }}>
        Check these five before you leave the page. A mistyped amount is easiest to catch now.
      </p>
    </>
  );
}
