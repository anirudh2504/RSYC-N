import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useFetch } from '../../context/Session.jsx';
import {
  Button,
  Card,
  CardHead,
  Empty,
  ErrorState,
  Loading,
  Notice,
  PageHead,
  useToast,
} from '../../components/ui.jsx';
import { initials, relativeDays } from '../../lib/format.js';

export default function Requests() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/admin/join-requests');

  if (loading) return <Loading rows={4} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const pending = data.requests.filter((r) => r.status === 'pending');
  const handled = data.requests.filter((r) => r.status !== 'pending');

  const approve = async (request) => {
    try {
      const res = await api.post(`/admin/join-requests/${request.id}/approve`);
      // Straight into the add-member form with the details already filled in.
      navigate(
        `/admin/members/new?name=${encodeURIComponent(res.prefill.name)}&phone=${encodeURIComponent(res.prefill.phone)}`,
      );
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  const reject = async (request) => {
    try {
      await api.post(`/admin/join-requests/${request.id}/reject`);
      toast('Request rejected', 'ok');
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  return (
    <>
      <PageHead
        eyebrow="Membership"
        title="Join requests"
        sub={`${pending.length} waiting`}
      />

      {pending.length === 0 ? (
        <Empty title="Nothing waiting">New requests will appear here.</Empty>
      ) : (
        <div className="stack">
          {pending.map((r) => (
            <Card key={r.id} className="card-pad">
              <div style={{ display: 'flex', gap: 12 }}>
                <span className="avatar" aria-hidden="true">
                  {initials(r.name)}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontWeight: 700 }}>{r.name}</p>
                  <p className="small muted num">
                    {r.phone} · {relativeDays(r.createdAt)}
                  </p>
                </div>
              </div>

              {r.message ? (
                <p className="small" style={{ marginTop: 10, color: 'var(--ink-2)' }}>
                  “{r.message}”
                </p>
              ) : null}

              {r.existingMember ? (
                <div style={{ marginTop: 10 }}>
                  <Notice kind="warn">
                    A member with this number already exists. Check before approving.
                  </Notice>
                </div>
              ) : null}

              <div className="btn-row" style={{ marginTop: 12 }}>
                <Button variant="ghost" onClick={() => reject(r)}>
                  Reject
                </Button>
                <Button onClick={() => approve(r)}>Approve &amp; add</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {handled.length ? (
        <div style={{ marginTop: 22 }}>
          <Card>
            <CardHead title="Already dealt with" />
            {handled.map((r) => (
              <div key={r.id} className="list-row">
                <span className="avatar" aria-hidden="true">
                  {initials(r.name)}
                </span>
                <div className="list-body">
                  <p className="list-name">{r.name}</p>
                  <p className="list-meta num">{r.phone}</p>
                </div>
                <div className="list-end">
                  <span className={`chip chip-${r.status === 'approved' ? 'paid' : 'exempt'}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      ) : null}
    </>
  );
}
