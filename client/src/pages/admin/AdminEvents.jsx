import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../context/Session.jsx';
import { EventArt, Icon } from '../../components/Ornaments.jsx';
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
import { dateInputValue, shortDate, todayInput } from '../../lib/format.js';

const BLANK = {
  title: '',
  titleHi: '',
  description: '',
  eventDate: todayInput(),
  tags: '',
  palette: 0,
  isPublished: true,
};

export default function AdminEvents() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/admin/events');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  if (loading) return <Loading rows={4} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const events = data ? data.events : [];

  const openNew = () => {
    setEditing({ id: null });
    setForm(BLANK);
    setFormError('');
  };

  const openEdit = (event) => {
    setEditing(event);
    setForm({
      title: event.title,
      titleHi: event.titleHi || '',
      description: event.description || '',
      eventDate: dateInputValue(event.eventDate),
      tags: (event.tags || []).join(', '),
      palette: event.palette || 0,
      isPublished: event.isPublished,
    });
    setFormError('');
  };

  const save = async () => {
    setBusy(true);
    setFormError('');
    try {
      const body = {
        ...form,
        eventDate: new Date(`${form.eventDate}T06:00:00`).toISOString(),
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (editing.id) await api.patch(`/admin/events/${editing.id}`, body);
      else await api.post('/admin/events', body);
      toast(editing.id ? 'Event updated' : 'Event created', 'ok');
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addPhotos = async (event) => {
    try {
      await api.post(`/admin/events/${event.id}/photos`, { count: 3 });
      toast('Photos added', 'ok');
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  const removePhoto = async (event, photoId) => {
    try {
      await api.del(`/admin/events/${event.id}/photos/${photoId}`);
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  const remove = async (event) => {
    try {
      await api.del(`/admin/events/${event.id}`);
      toast('Event deleted', 'ok');
      setEditing(null);
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHead eyebrow="Events" title="Manage events" sub="This is the only part of the site open to everyone." />

      <Button block style={{ marginBottom: 16 }} onClick={openNew}>
        <Icon.plus />
        Create an event
      </Button>

      {events.length === 0 ? (
        <Empty title="No events yet">Create the first one.</Empty>
      ) : (
        <div className="stack">
          {events.map((event) => (
            <Card key={event.id}>
              <div className="event-cover" style={{ aspectRatio: '16 / 7' }}>
                <EventArt seed={event.slug} palette={event.palette} />
                {!event.isPublished ? <span className="event-flag">Draft</span> : null}
              </div>

              <div className="card-pad">
                <div className="row-between">
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700 }}>{event.title}</p>
                    <p className="small muted">
                      {shortDate(event.eventDate)} · {event.photoCount} photos
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(event)}>
                    <Icon.edit />
                    Edit
                  </Button>
                </div>

                {event.photos && event.photos.length ? (
                  <div className="gallery" style={{ marginTop: 12 }}>
                    {event.photos.map((p) => (
                      <div key={p.id} className="gallery-item">
                        <EventArt seed={p.seed} palette={event.palette} />
                        <button
                          type="button"
                          className="photo-remove"
                          onClick={() => removePhoto(event, p.id)}
                          aria-label="Remove photo"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <Button
                  variant="ghost"
                  size="sm"
                  block
                  style={{ marginTop: 12 }}
                  onClick={() => addPhotos(event)}
                >
                  <Icon.plus />
                  Add photos
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet
        open={!!editing}
        title={editing && editing.id ? 'Edit event' : 'New event'}
        onClose={() => setEditing(null)}
      >
        <div className="sheet-pad stack">
          <Notice kind="error">{formError}</Notice>

          <Field label="Title" id="ev-title">
            <input id="ev-title" className="input" value={form.title} onChange={set('title')} />
          </Field>

          <Field label="Title in Hindi" id="ev-title-hi" hint="Optional. Shown under the English title.">
            <input
              id="ev-title-hi"
              className="input devanagari"
              value={form.titleHi}
              onChange={set('titleHi')}
            />
          </Field>

          <Field label="Date" id="ev-date">
            <input
              id="ev-date"
              type="date"
              className="input"
              value={form.eventDate}
              onChange={set('eventDate')}
            />
          </Field>

          <Field label="Description" id="ev-desc">
            <textarea
              id="ev-desc"
              className="textarea"
              style={{ minHeight: 120 }}
              value={form.description}
              onChange={set('description')}
            />
          </Field>

          <Field label="Tags" id="ev-tags" hint="Comma separated. Hindi is fine.">
            <input id="ev-tags" className="input" value={form.tags} onChange={set('tags')} />
          </Field>

          <Field label="Artwork colour" id="ev-palette">
            <select id="ev-palette" className="select" value={form.palette} onChange={set('palette')}>
              {['Indigo court', 'Holi oxblood', 'Neem green', 'Sandstone', 'Dusk', 'Stepwell blue'].map(
                (label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </Field>

          <div className="segmented">
            <button
              type="button"
              className={form.isPublished ? 'on-credit' : ''}
              onClick={() => setForm((f) => ({ ...f, isPublished: true }))}
            >
              Published
            </button>
            <button
              type="button"
              className={!form.isPublished ? 'on-debit' : ''}
              onClick={() => setForm((f) => ({ ...f, isPublished: false }))}
            >
              Draft
            </button>
          </div>

          <div className="btn-row">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy || form.title.trim().length < 3}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </div>

          {editing && editing.id ? (
            <Button variant="danger" block onClick={() => remove(editing)}>
              Delete this event
            </Button>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
