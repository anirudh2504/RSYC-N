import { useEffect, useMemo, useState } from 'react';
import { EventImage } from './Ornaments.jsx';

const INTERVAL_MS = 2000;

/**
 * The picture on an event tile.
 *
 * With the slideshow switched off it is simply the cover. With it on, the cover
 * and the first few photos cross-fade one into the next.
 *
 * Two things it deliberately does not do:
 *
 *  - it never animates for someone who has asked for reduced motion
 *  - it stops entirely while the tab is in the background, so a phone left on
 *    this page is not repainting for nothing
 */
export default function EventCover({ event, alt }) {
  const frames = useMemo(() => {
    const list = [];
    if (event.coverUrl) list.push({ key: 'cover', url: event.coverUrl });

    if (event.autoSwipe) {
      (event.slideshow || []).forEach((p) => {
        // Skip a gallery photo that is the cover again.
        if (p.url && p.url === event.coverUrl) return;
        list.push({ key: p.id, url: p.url, seed: p.seed });
      });
    }

    if (!list.length) list.push({ key: 'art', seed: event.slug });
    return list;
  }, [event]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const running = frames.length > 1 && !reducedMotion && !paused;

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % frames.length), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [running, frames.length]);

  // Nothing should tick while nobody is looking at it.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (frames.length === 1) {
    const only = frames[0];
    return <EventImage url={only.url} seed={only.seed || event.slug} palette={event.palette} alt={alt} />;
  }

  return (
    <div className="slideshow">
      {frames.map((frame, i) => (
        <div
          key={frame.key}
          className={`slideshow-frame${i === index ? ' is-on' : ''}`}
          aria-hidden={i === index ? undefined : 'true'}
        >
          <EventImage
            url={frame.url}
            seed={frame.seed || event.slug}
            palette={event.palette}
            alt={i === index ? alt : ''}
          />
        </div>
      ))}

      <div className="slideshow-dots" aria-hidden="true">
        {frames.map((frame, i) => (
          <span key={frame.key} className={`slideshow-dot${i === index ? ' is-on' : ''}`} />
        ))}
      </div>
    </div>
  );
}
