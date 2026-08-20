import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch, useSession } from '../../context/Session.jsx';
import { EventImage, Icon } from '../../components/Ornaments.jsx';
import { Card, Empty, ErrorState, Loading } from '../../components/ui.jsx';
import { dayMonth } from '../../lib/format.js';

/**
 * The landing page, and the only part of the club open to anyone.
 * Nothing financial appears here at all.
 */

function EventCard({ event }) {
  const date = new Date(event.eventDate);
  const upcoming = date.getTime() > Date.now();

  return (
    <Link to={`/events/${event.slug}`} className="event-card">
      <div className="event-cover">
        <EventImage url={event.coverUrl} seed={event.slug} palette={event.palette} alt={event.title} />
        <div className="event-date-badge">
          <div className="d num">{date.getDate()}</div>
          <div className="m">{dayMonth(event.eventDate).split(' ')[1]}</div>
        </div>
        {upcoming ? <span className="event-flag">Upcoming</span> : null}
      </div>

      <div className="event-body">
        <h3 className="event-title">{event.title}</h3>
        {event.titleHi ? <p className="event-title-hi">{event.titleHi}</p> : null}
        <div className="wrap" style={{ marginTop: 9 }}>
          {event.tags.slice(0, 3).map((t) => (
            <span key={t} className="tag devanagari">
              {t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default function Events() {
  const { data, loading, error, reload } = useFetch('/open/events');
  const session = useSession();
  // All first, then past, then upcoming.
  const [tab, setTab] = useState('all');

  const events = data ? data.events : [];
  const now = Date.now();

  const { upcoming, past } = useMemo(() => {
    const up = events.filter((e) => new Date(e.eventDate).getTime() > now);
    const pa = events.filter((e) => new Date(e.eventDate).getTime() <= now);
    return { upcoming: up, past: pa };
  }, [events, now]);

  const TABS = [
    { key: 'all', label: 'All', list: events },
    { key: 'past', label: 'Past', list: past },
    { key: 'upcoming', label: 'Upcoming', list: upcoming },
  ];

  const shown = (TABS.find((x) => x.key === tab) || TABS[0]).list;

  return (
    <>
      {!session.viewer ? (
        <Link to="/unlock" style={{ display: 'block', marginBottom: 16 }}>
          <Card className="card-pad">
            <div className="row-between">
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 700 }}>View club fund</p>
                <p className="small muted">
                  Balance, transactions and members. Ask any member for the club PIN.
                </p>
              </div>
              <span style={{ color: 'var(--royal)', flex: 'none' }}>
                <Icon.lock />
              </span>
            </div>
          </Card>
        </Link>
      ) : null}

      <div className="segmented" style={{ marginBottom: 16 }}>
        {TABS.map((x) => (
          <button
            key={x.key}
            type="button"
            style={tab === x.key ? { background: 'var(--royal)', color: '#fdf6e8' } : undefined}
            onClick={() => setTab(x.key)}
          >
            {x.label}
            {x.list.length ? ` (${x.list.length})` : ''}
          </button>
        ))}
      </div>

      {loading ? <Loading rows={3} /> : null}
      <ErrorState error={error} onRetry={reload} />

      {!loading && !error ? (
        shown.length === 0 ? (
          <Empty
            title={
              tab === 'upcoming'
                ? 'Nothing coming up'
                : tab === 'past'
                  ? 'No past events yet'
                  : 'No events yet'
            }
          >
            {tab === 'upcoming'
              ? 'The club will post the next event here.'
              : 'Events appear here as the club holds them.'}
          </Empty>
        ) : (
          <div className="event-grid">
            {shown.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )
      ) : null}
    </>
  );
}
