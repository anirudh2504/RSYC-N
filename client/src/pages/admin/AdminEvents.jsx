import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useFetch } from '../../context/Session.jsx';
import { Icon } from '../../components/Ornaments.jsx';
import EventCover from '../../components/EventCover.jsx';
import {
  Button,
  Confirm,
  Empty,
  ErrorState,
  Field,
  Loading,
  Notice,
  PageHead,
  Sheet,
  useToast,
} from '../../components/ui.jsx';
import { dayMonth, todayInput } from '../../lib/format.js';

/**
 * The events list, laid out as the same tiles the village sees. Everything you
 * can do to one event lives inside that event, on its own page — this screen
 * only creates them and shows what exists.
 */

function EventTile({ event, onDelete }) {
  const date = new Date(event.eventDate);
  const upcoming = date.getTime() > Date.now();

  return (
    // A div, not a Link — the delete button must not sit inside the link, or
    // pressing it would navigate as well.
    <div className="event-card">
      <Link to={`/admin/events/${event.id}`}>
        <div className="event-cover">
          <EventCover event={event} alt={event.title} />
          <div className="event-date-badge">
            <div className="d num">{date.getDate()}</div>
            <div className="m">{dayMonth(event.eventDate).split(' ')[1]}</div>
          </div>
          {!event.isPublished ? (
            <span className="event-flag">Draft</span>
          ) : upcoming ? (
            <span className="event-flag">Upcoming</span>
          ) : null}
        </div>

        <div className="event-body">
          <h3 className="event-title">{event.title}</h3>
          {event.titleHi ? <p className="event-title-hi">{event.titleHi}</p> : null}
          <p className="small muted" style={{ marginTop: 6 }}>
            {event.photoCount} {event.photoCount === 1 ? 'photo' : 'photos'}
            {event.coverUrl ? ' · cover set' : ''}
          </p>
        </div>
      </Link>

      <div className="tile-actions">
        <Button variant="danger" size="sm" onClick={() => onDelete(event)}>
          Delete event
        </Button>
      </div>
    </div>
  );
}

export default function AdminEvents() {
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch('/admin/events');

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(todayInput());
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState(null);

  const removeEvent = async () => {
    setBusy(true);
    try {
      await api.del(`/admin/events/${deleting.id}`);
      toast(`“${deleting.title}” deleted`, 'ok');
      setDeleting(null);
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading rows={4} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const events = data ? data.events : [];

  /** Create it with the bare minimum, then open it to fill in the rest. */
  const create = async () => {
    setBusy(true);
    setFormError('');
    try {
      const res = await api.post('/admin/events', {
        title,
        eventDate: new Date(`${eventDate}T06:00:00`).toISOString(),
        isPublished: false,
      });
      toast('Event created as a draft', 'ok');
      setCreating(false);
      setTitle('');
      navigate(`/admin/events/${res.event.id}`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        eyebrow="Events"
        title="Manage events"
        sub="Open an event to change its photos, details or to delete it."
      />

      <div className="row-between" style={{ marginBottom: 16 }}>
        <p className="small muted">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </p>
        <Button
          size="sm"
          onClick={() => {
            setTitle('');
            setEventDate(todayInput());
            setFormError('');
            setCreating(true);
          }}
        >
          <Icon.plus />
          Create event
        </Button>
      </div>

      {events.length === 0 ? (
        <Empty title="No events yet">Create the first one.</Empty>
      ) : (
        <div className="event-grid">
          {events.map((event) => (
            <EventTile key={event.id} event={event} onDelete={setDeleting} />
          ))}
        </div>
      )}

      <Confirm
        open={!!deleting}
        title={deleting ? `Delete “${deleting.title}”?` : ''}
        busy={busy}
        confirmLabel="Yes, delete"
        onCancel={() => setDeleting(null)}
        onConfirm={removeEvent}
      >
        {deleting ? (
          <>
            <p style={{ color: 'var(--ink-2)', lineHeight: 1.6 }}>
              The event and its {deleting.photoCount}{' '}
              {deleting.photoCount === 1 ? 'photo' : 'photos'} will be gone from the site.
            </p>
            <div className="notice-box notice-info" style={{ marginTop: 12 }}>
              Any money spent on it stays in the ledger and the club balance does not change. Those
              entries simply stop being linked to an event.
            </div>
            <p className="hint" style={{ marginTop: 10 }}>
              This cannot be undone.
            </p>
          </>
        ) : null}
      </Confirm>

      <Sheet open={creating} title="New event" onClose={() => setCreating(false)}>
        <div className="sheet-pad stack">
          <Notice kind="error">{formError}</Notice>
          <Notice kind="info">
            It starts as a draft, so the village will not see it until you publish.
          </Notice>

          <Field label="Title" id="new-title">
            <input
              id="new-title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kabaddi Pratiyogita"
              autoFocus
            />
          </Field>

          <Field label="Date" id="new-date">
            <input
              id="new-date"
              type="date"
              className="input"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </Field>

          <div className="btn-row">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={busy || title.trim().length < 3}>
              {busy ? 'Creating…' : 'Create & open'}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
