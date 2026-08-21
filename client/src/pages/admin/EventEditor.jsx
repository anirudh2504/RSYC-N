import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useFetch } from '../../context/Session.jsx';
import { BackLink } from '../../components/Layout.jsx';
import { EventImage, Icon } from '../../components/Ornaments.jsx';
import FilePicker from '../../components/FilePicker.jsx';
import UploadTarget from '../../components/UploadTarget.jsx';
import {
  Button,
  Card,
  Confirm,
  ErrorState,
  Field,
  Loading,
  Notice,
  PageHead,
  Rule,
  useToast,
} from '../../components/ui.jsx';
import LedgerRow from '../../components/LedgerRow.jsx';
import { dateInputValue, money, shortDate } from '../../lib/format.js';
import { uploadImage } from '../../lib/upload.js';

const PALETTES = ['Indigo court', 'Holi oxblood', 'Neem green', 'Sandstone', 'Dusk', 'Stepwell blue'];

/** Everything you can do to one event, in one place. */
export default function EventEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/admin/events/${id}`, [id]);

  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState('');
  const [formError, setFormError] = useState('');
  const [unlinking, setUnlinking] = useState(null);

  useEffect(() => {
    if (!data || !data.event) return;
    const e = data.event;
    setForm({
      title: e.title,
      titleHi: e.titleHi || '',
      description: e.description || '',
      eventDate: dateInputValue(e.eventDate),
      tags: (e.tags || []).join(', '),
      palette: e.palette || 0,
      isPublished: e.isPublished,
      autoSwipe: !!e.autoSwipe,
    });
  }, [data]);

  if (loading || !form) return <Loading rows={5} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const event = data.event;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveDetails = async () => {
    setBusy(true);
    setFormError('');
    try {
      await api.patch(`/admin/events/${id}`, {
        ...form,
        eventDate: new Date(`${form.eventDate}T06:00:00`).toISOString(),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      toast('Event saved', 'ok');
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setCover = async (file) => {
    setUploading('cover');
    try {
      const coverUrl = await uploadImage(file, { folder: 'rsyc/events', size: 1280, quality: 0.7 });
      await api.patch(`/admin/events/${id}`, { coverUrl });
      toast('Cover photo set', 'ok');
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setUploading('');
    }
  };

  const clearCover = async () => {
    try {
      await api.patch(`/admin/events/${id}`, { coverUrl: '' });
      toast('Cover photo removed', 'ok');
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  /** One request per photo, so no single body gets large. */
  const addPhotos = async (files) => {
    setUploading('gallery');
    let added = 0;
    try {
      for (const file of files) {
        const photoUrl = await uploadImage(file, { folder: 'rsyc/events', size: 900, quality: 0.7 });
        await api.post(`/admin/events/${id}/photos`, { photoUrl });
        added += 1;
      }
      toast(`${added} ${added === 1 ? 'photo' : 'photos'} added`, 'ok');
    } catch (err) {
      toast(added ? `${added} added, then: ${err.message}` : err.message, 'bad');
    } finally {
      setUploading('');
      reload();
    }
  };

  const replacePhoto = async (photoId, file) => {
    setUploading(photoId);
    try {
      const photoUrl = await uploadImage(file, { folder: 'rsyc/events', size: 900, quality: 0.7 });
      await api.patch(`/admin/events/${id}/photos/${photoId}`, { photoUrl });
      toast('Photo replaced', 'ok');
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setUploading('');
    }
  };

  const removePhoto = async (photoId) => {
    try {
      await api.del(`/admin/events/${id}/photos/${photoId}`);
      toast('Photo removed', 'ok');
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  /** Only breaks the link to this event. The entry itself is untouched. */
  const unlinkExpense = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/transactions/${unlinking.id}/event`, { eventId: null });
      toast('Removed from this event', 'ok');
      setUnlinking(null);
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <BackLink to="/admin/events">All events</BackLink>

      <PageHead
        eyebrow={event.isPublished ? 'Published' : 'Draft'}
        title={event.title}
        sub={shortDate(event.eventDate)}
      />

      {/* ---------------- cover ---------------- */}
      <div className="event-hero" style={{ marginBottom: 10 }}>
        <EventImage
          url={event.coverUrl}
          seed={event.slug}
          palette={event.palette}
          alt={event.title}
        />
      </div>

      <div className="wrap" style={{ marginBottom: 6 }}>
        <FilePicker onPick={setCover} disabled={uploading === 'cover'}>
          {uploading === 'cover'
            ? 'Uploading…'
            : event.coverUrl
              ? 'Change cover photo'
              : 'Set cover photo'}
        </FilePicker>
        {event.coverUrl ? (
          <Button variant="ghost" size="sm" onClick={clearCover}>
            Remove cover
          </Button>
        ) : null}
      </div>
      <p className="hint">
        {event.coverUrl
          ? 'Shown on the event card and at the top of the event page.'
          : 'No cover yet — the drawn artwork is standing in.'}
      </p>
      <UploadTarget />

      {/* Whether the tile cycles its photos or just sits on the cover. */}
      <Card className="card-pad" style={{ marginTop: 14 }}>
        <div className="row-between" style={{ gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 700 }}>Slide through photos on the tile</p>
            <p className="small muted">
              {form.autoSwipe
                ? 'The cover and the first few photos fade one into the next, everywhere this event appears as a tile.'
                : 'Only the cover photo is shown on the tile.'}
            </p>
          </div>
          <div className="segmented" style={{ flex: 'none', width: 132 }}>
            <button
              type="button"
              className={form.autoSwipe ? 'on-credit' : ''}
              onClick={() => setForm((f) => ({ ...f, autoSwipe: true }))}
            >
              On
            </button>
            <button
              type="button"
              className={!form.autoSwipe ? 'on-debit' : ''}
              onClick={() => setForm((f) => ({ ...f, autoSwipe: false }))}
            >
              Off
            </button>
          </div>
        </div>

        {form.autoSwipe ? (
          <p className="hint" style={{ marginTop: 10 }}>
            Up to 6 photos are sent with the tile, so the events list costs more data to load.
            Worth it for one or two events, not for every one.
          </p>
        ) : null}

        {form.autoSwipe !== event.autoSwipe ? (
          <Notice kind="warn">Press “Save details” below to keep this change.</Notice>
        ) : null}
      </Card>

      {/* ---------------- photos ---------------- */}
      <div style={{ margin: '26px 0 12px' }}>
        <Rule label={`${event.photos.length} photos`} />
      </div>

      {event.photos.length ? (
        <div className="gallery">
          {event.photos.map((photo) => (
            <div key={photo.id} className="gallery-item">
              <EventImage
                url={photo.url}
                seed={photo.seed}
                palette={event.palette}
                alt={photo.caption}
              />
              <button
                type="button"
                className="photo-remove"
                onClick={() => removePhoto(photo.id)}
                aria-label="Delete photo"
              >
                ×
              </button>
              <FilePicker
                className="photo-replace"
                disabled={uploading === photo.id}
                onPick={(file) => replacePhoto(photo.id, file)}
              >
                {uploading === photo.id ? 'Uploading…' : 'Replace'}
              </FilePicker>
            </div>
          ))}
        </div>
      ) : (
        <Card className="card-pad">
          <p className="small muted">No photos yet.</p>
        </Card>
      )}

      <div className="row-between" style={{ marginTop: 12, gap: 10 }}>
        <p className="hint" style={{ margin: 0 }}>
          Pick several at once. Each is shrunk before saving.
        </p>
        <FilePicker
          multiple
          className="btn btn-soft btn-sm"
          disabled={uploading === 'gallery'}
          onPick={addPhotos}
        >
          <Icon.plus />
          {uploading === 'gallery' ? 'Uploading…' : 'Add photos'}
        </FilePicker>
      </div>

      {/* ---------------- details ---------------- */}
      <div style={{ margin: '26px 0 12px' }}>
        <Rule label="Details" />
      </div>

      <Card className="card-pad">
        <div className="stack">
          <Notice kind="error">{formError}</Notice>

          <Field label="Title" id="ev-title">
            <input id="ev-title" className="input" value={form.title} onChange={set('title')} />
          </Field>

          <Field label="Title in Hindi" id="ev-title-hi" hint="Optional.">
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
              style={{ minHeight: 150 }}
              value={form.description}
              onChange={set('description')}
            />
          </Field>

          <Field label="Tags" id="ev-tags" hint="Comma separated. Hindi is fine.">
            <input id="ev-tags" className="input" value={form.tags} onChange={set('tags')} />
          </Field>

          <Field
            label="Artwork colour"
            id="ev-palette"
            hint="Used for the drawn panels where there is no photo."
          >
            <select id="ev-palette" className="select" value={form.palette} onChange={set('palette')}>
              {PALETTES.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <p className="label" style={{ marginBottom: 6 }}>
              Visibility
            </p>
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
          </div>

          <Button block onClick={saveDetails} disabled={busy || form.title.trim().length < 3}>
            {busy ? 'Saving…' : 'Save details'}
          </Button>
        </div>
      </Card>

      {/* ---------------- linked spend ---------------- */}
      <div style={{ margin: '26px 0 12px' }}>
        <Rule label="From the club fund" />
      </div>

      <div className="row-between" style={{ marginBottom: 10, gap: 10 }}>
        <p style={{ fontWeight: 700 }}>
          {money(data.spendPaise)}
          <span className="small muted" style={{ fontWeight: 400 }}>
            {' '}
            on {data.expenses.length} {data.expenses.length === 1 ? 'entry' : 'entries'}
          </span>
        </p>
        <Button size="sm" onClick={() => navigate(`/admin/new?eventId=${id}`)}>
          <Icon.plus />
          Add spend
        </Button>
      </div>

      <Card>
        {data.expenses.length === 0 ? (
          <div className="card-pad">
            <p className="small muted">Nothing has been spent on this event yet.</p>
          </div>
        ) : (
          data.expenses.map((entry) => (
            <LedgerRow
              key={entry.id}
              entry={entry}
              footer={
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 8 }}
                  onClick={() => setUnlinking(entry)}
                >
                  Remove from this event
                </button>
              }
            />
          ))
        )}
      </Card>

      <p className="hint" style={{ marginTop: 8 }}>
        Removing an entry here only unlinks it from the event. The money stays in the ledger — to
        cancel a payment itself, reverse it from All transactions.
      </p>

      <Confirm
        open={!!unlinking}
        title="Remove this entry from the event?"
        busy={busy}
        confirmLabel="Yes, unlink"
        onCancel={() => setUnlinking(null)}
        onConfirm={unlinkExpense}
      >
        {unlinking ? (
          <>
            <p className="confirm-figure num" style={{ color: 'var(--debit)' }}>
              {money(unlinking.amountPaise)}
            </p>
            <p style={{ color: 'var(--ink-2)' }}>{unlinking.reason}</p>
            <div className="notice-box notice-info" style={{ marginTop: 12 }}>
              It stays in the ledger and the club balance does not change. It simply stops counting
              towards this event.
            </div>
          </>
        ) : null}
      </Confirm>

      {/* Deleting an event is done from the events list, not from inside it. */}
      <p className="tiny muted center" style={{ marginTop: 26 }}>
        To delete this event, use the Delete button on its tile in All events.
      </p>
    </>
  );
}
