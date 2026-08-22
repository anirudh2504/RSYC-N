import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useFetch } from '../../context/Session.jsx';
import { Icon } from '../../components/Ornaments.jsx';
import MemberFace from '../../components/MemberFace.jsx';
import ReorderList from '../../components/ReorderList.jsx';
import { Button, Card, CardHead, Empty, ErrorState, Loading, Notice, PageHead, useToast } from '../../components/ui.jsx';
import { money, periodLabel } from '../../lib/format.js';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'contributing', label: 'Contributing' },
  { key: 'off', label: 'Not contributing' },
];

/** The part of a row that is the same whether or not the board is being arranged. */
function MemberRow({ m }) {
  return (
    <Link to={`/admin/members/${m.id}`} className="list-row">
      <MemberFace member={m} />

      <div className="list-body">
        <p className="list-name">{m.name}</p>
        {m.fatherName ? <p className="list-meta">S/o {m.fatherName}</p> : null}
        <p className="list-meta">
          {m.phone} · {m.isEnabled ? `${money(m.monthlyAmount)}/month` : 'Not contributing'} · since{' '}
          {periodLabel(m.joinedPeriod)}
        </p>
      </div>

      <div className="list-end">
        {m.pendingCount > 0 ? (
          <>
            <span className="chip chip-unpaid">{m.pendingCount}m</span>
            <p className="tiny muted num" style={{ marginTop: 4 }}>
              {money(m.pending)}
            </p>
          </>
        ) : m.isEnabled ? (
          <span className="chip chip-paid">Clear</span>
        ) : (
          <span className="chip chip-exempt">Off</span>
        )}
      </div>

      <span className="chevron">
        <Icon.chevron />
      </span>
    </Link>
  );
}

export default function AdminMembers() {
  const { data, loading, error, reload } = useFetch('/admin/members');
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [arranging, setArranging] = useState(false);

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const needle = q.trim().toLowerCase();
  const list = data.members
    .filter((m) => {
      if (filter === 'pending') return m.pendingCount > 0;
      if (filter === 'contributing') return m.isEnabled;
      if (filter === 'off') return !m.isEnabled;
      return true;
    })
    .filter((m) => !needle || m.name.toLowerCase().includes(needle) || m.phone.includes(needle));

  /**
   * Rearranging is only offered on the full board. The whole order is sent when
   * it is saved, so dragging inside a filtered or searched list would be
   * setting positions for people who are not on screen.
   */
  const canArrange = data.members.length > 1 && filter === 'all' && needle === '';

  /**
   * Save the new order.
   *
   * The whole board is sent, not the visible slice — which is why arranging is
   * only offered on the complete list. Dragging inside a filtered view would
   * decide positions for people who were not on screen.
   */
  const saveOrder = async (ordered) => {
    try {
      await api.put('/admin/members/order', { ids: ordered.map((m) => m.id) });
      // Deliberately no reload. The list on screen is already the order that
      // was just saved, and refetching would re-render mid-arrangement — which
      // on the keyboard path throws away the focus the admin was moving with.
    } catch (err) {
      toast(err.message, 'bad');
      reload();
    }
  };

  return (
    <>
      <PageHead
        eyebrow="Members"
        title="Manage members"
        sub={arranging ? 'Drag a name to move it up or down the board.' : 'In the order the village sees them.'}
      />

      {arranging ? (
        <>
          <Notice kind="info">
            This is the order everyone sees on the members page. Drag by the handle on the left, or
            focus a handle and use the arrow keys. Saved as you go.
          </Notice>
          <div className="row-between" style={{ margin: '10px 0 14px' }}>
            <p className="small muted">{data.members.length} members</p>
            <Button size="sm" onClick={() => setArranging(false)}>
              Done
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="row-between" style={{ marginBottom: 10, gap: 8 }}>
            <input
              className="input"
              placeholder="Search by name or number"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search members"
            />
            <Link to="/admin/members/new" className="btn btn-sm" style={{ flex: 'none' }}>
              <Icon.plus />
              Add
            </Link>
          </div>

          <div className="scroll-x" style={{ marginBottom: 14 }}>
            <div className="scroll-x-inner">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`tag${filter === f.key ? ' tag-on' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {list.length === 0 ? (
        <Empty title="No members here">Try another filter.</Empty>
      ) : (
        <Card>
          {/* No running count in here — it said the same thing as the list
              underneath it. The one control that belongs at the top of the
              board is the one that rearranges it. */}
          {!arranging && canArrange ? (
            <CardHead
              action={
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setArranging(true)}
                  title="Change the order members appear in"
                  aria-label="Rearrange the member board"
                >
                  <Icon.grip />
                </button>
              }
            />
          ) : null}
          {arranging ? (
            <ReorderList
              items={data.members}
              getKey={(m) => m.id}
              onReorder={saveOrder}
              renderItem={(m) => <MemberRow m={m} />}
            />
          ) : (
            list.map((m) => <MemberRow key={m.id} m={m} />)
          )}
        </Card>
      )}
    </>
  );
}
