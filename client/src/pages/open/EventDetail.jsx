import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFetch, useSession } from '../../context/Session.jsx';
import { BackLink } from '../../components/Layout.jsx';
import { EventArt } from '../../components/Ornaments.jsx';
import { Card, CardHead, ErrorState, Loading, Rule } from '../../components/ui.jsx';
import LedgerRow from '../../components/LedgerRow.jsx';
import { money, shortDate } from '../../lib/format.js';

/**
 * The event page is the one route both sides share. The club spend is attached
 * only when the request carries a viewer session — for anyone else it is not
 * hidden with CSS, it is simply absent from the response.
 */
export default function EventDetail() {
  const { slug } = useParams();
  const session = useSession();
  const path = session.viewer ? `/view/events/${slug}` : `/open/events/${slug}`;
  const { data, loading, error, reload } = useFetch(path, [session.viewer]);
  const [lightbox, setLightbox] = useState(null);

  if (loading) return <Loading rows={4} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const event = data.event;
  const date = new Date(event.eventDate);
  const upcoming = date.getTime() > Date.now();

  return (
    <>
      <BackLink to="/">All events</BackLink>

      <div className="event-hero">
        <EventArt seed={event.slug} palette={event.palette} />
      </div>

      <p className="eyebrow">
        {shortDate(event.eventDate)}
        {upcoming ? ' · Upcoming' : ''}
      </p>
      <h1 className="page-title" style={{ marginTop: 4 }}>
        {event.title}
      </h1>
      {event.titleHi ? (
        <p className="devanagari muted" style={{ fontSize: 'var(--t-md)', marginTop: 2 }}>
          {event.titleHi}
        </p>
      ) : null}

      <div className="wrap" style={{ marginTop: 12 }}>
        {event.tags.map((t) => (
          <span key={t} className="tag devanagari">
            {t}
          </span>
        ))}
      </div>

      {event.description ? (
        <div className="prose" style={{ marginTop: 16 }}>
          {event.description.split('\n\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      ) : null}

      {event.photos && event.photos.length ? (
        <>
          <div style={{ margin: '24px 0 12px' }}>
            <Rule label={`${event.photos.length} photos`} />
          </div>
          <div className="gallery">
            {event.photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                className="gallery-item"
                onClick={() => setLightbox(photo)}
                aria-label="Open photo"
              >
                <EventArt seed={photo.seed} palette={event.palette} />
              </button>
            ))}
          </div>
        </>
      ) : null}

      {session.viewer && data.spendPaise > 0 ? (
        <>
          <div style={{ margin: '24px 0 12px' }}>
            <Rule label="From the club fund" />
          </div>
          <Card>
            <CardHead
              title="Total spent"
              action={
                <span className="num" style={{ fontWeight: 700, color: 'var(--debit)' }}>
                  {money(data.spendPaise)}
                </span>
              }
            />
            {data.expenses.map((entry) => (
              <LedgerRow key={entry.id} entry={entry} />
            ))}
          </Card>
        </>
      ) : null}

      {!session.viewer ? (
        <p className="tiny muted center" style={{ marginTop: 28 }}>
          Club members with the PIN can also see what this event cost the fund.
        </p>
      ) : null}

      {lightbox ? (
        <div className="lightbox" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            ×
          </button>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <div style={{ aspectRatio: '1' }}>
              <EventArt seed={lightbox.seed} palette={event.palette} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
