import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import SongCard from '../components/SongCard.jsx';
import StarRating from '../components/StarRating.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function GuestEvent() {
  const { guestToken } = useParams();
  const [event, setEvent] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const loadEvent = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/events/${guestToken}`);
      if (!res.ok) throw new Error('Event not found');
      const data = await res.json();
      setEvent(data.event);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingEvent(false);
    }
  }, [guestToken]);

  const loadWishlist = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/events/${guestToken}/wishlist`);
      if (!res.ok) return;
      const data = await res.json();
      setWishlist(data.wishlist || []);
    } catch {}
  }, [guestToken]);

  useEffect(() => {
    loadEvent();
    loadWishlist();
    // Poll wishlist every 8 seconds for real-time updates
    pollRef.current = setInterval(loadWishlist, 8000);
    return () => clearInterval(pollRef.current);
  }, [loadEvent, loadWishlist]);

  if (loadingEvent) return (
    <div className="loading-center"><div className="spinner" /></div>
  );

  if (error) return (
    <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
      <div className="alert alert--error">{error}</div>
      <Link to="/" className="btn btn--ghost" style={{ marginTop: 24 }}>Go Home</Link>
    </div>
  );

  if (event?.status === 'finished') {
    return <FinishedEvent event={event} guestToken={guestToken} />;
  }

  return (
    <main className="page">
      {/* Event header */}
      <div style={{ marginBottom: 40 }}>
        <div className="row" style={{ marginBottom: 12 }}>
          <span className="badge badge--active">
            <span className="badge--dot" />
            Live Now
          </span>
        </div>
        <h1 style={{ marginBottom: 6 }}>{event?.event_name}</h1>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          {event?.dj_name} &nbsp;·&nbsp;{' '}
          {event?.event_date && new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          &nbsp;·&nbsp; {event?.venue}
        </p>
        {event?.description && (
          <p style={{ color: 'var(--text-muted)', marginTop: 10, fontSize: '0.95rem', lineHeight: 1.6 }}>
            {event.description}
          </p>
        )}
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,380px)',
          gap: 32,
          alignItems: 'start',
        }}
        className="guest-layout"
      >
        {/* Search */}
        <section>
          <h2 style={{ marginBottom: 20, fontSize: '1.3rem' }}>Request a Song</h2>
          <SearchBar
            onResults={setSearchResults}
            placeholder="Search for a song to request…"
          />
          {searchResults.length > 0 && (
            <div className="stack" style={{ marginTop: 16 }}>
              {searchResults.map(song => (
                <SongCard
                  key={song.trackId}
                  song={song}
                  mode="wishlist"
                  eventToken={guestToken}
                  onAddToWishlist={loadWishlist}
                />
              ))}
            </div>
          )}
          {searchResults.length === 0 && (
            <div className="empty" style={{ paddingTop: 48 }}>
              <div className="empty__icon">♫</div>
              <p className="empty__text">Search above to request a track</p>
            </div>
          )}
        </section>

        {/* Wishlist */}
        <section>
          <div className="row" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.3rem', flex: 1 }}>Wishlist</h2>
            <span className="label">{wishlist.length} songs</span>
          </div>

          {wishlist.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
              <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                No requests yet.<br />Be the first!
              </p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {wishlist.map((item, i) => (
                <WishlistRow key={item.id} item={item} rank={i + 1} />
              ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .guest-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

function FinishedEvent({ event, guestToken }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [avgStars, setAvgStars] = useState(null);
  const [totalRatings, setTotalRatings] = useState(0);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const loadRatings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/events/${guestToken}/ratings`);
      if (!res.ok) return;
      const data = await res.json();
      setRatings(data.ratings || []);
      setAvgStars(data.averageStars);
      setTotalRatings(data.totalRatings);
      setAlreadyRated(data.alreadyRated);
    } catch {}
  }, [guestToken]);

  useEffect(() => { loadRatings(); }, [loadRatings]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (stars < 1 || comment.trim().length < 1) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API}/api/events/${guestToken}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stars, comment }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit rating');
      }
      setSubmitted(true);
      await loadRatings();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <div style={{ textAlign: 'center', paddingTop: 60, marginBottom: 40 }}>
        <span className="badge badge--finished" style={{ display: 'inline-flex', marginBottom: 24 }}>
          <span className="badge--dot" />
          Event Ended
        </span>
        <h1 style={{ marginBottom: 8 }}>{event.event_name}</h1>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          {event.dj_name} &nbsp;·&nbsp; {event.venue}
        </p>
      </div>

      {!alreadyRated && !submitted ? (
        <div className="card" style={{ padding: 28, marginBottom: 32 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 20 }}>Rate This Event</h2>
          <form onSubmit={handleSubmit} className="stack" style={{ gap: 20 }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 10 }}>Stars</label>
              <StarRating value={stars} onChange={setStars} size={32} />
            </div>
            <div>
              <label className="form-label">Comment</label>
              <div style={{ position: 'relative' }}>
                <textarea
                  className="form-input"
                  value={comment}
                  onChange={e => setComment(e.target.value.slice(0, 100))}
                  placeholder="Share your experience…"
                  rows={4}
                  style={{ resize: 'vertical', paddingBottom: 28 }}
                />
                <span style={{
                  position: 'absolute', bottom: 8, right: 12,
                  fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
                  color: comment.length >= 90 ? 'var(--accent)' : 'var(--text-dim)',
                  pointerEvents: 'none',
                }}>
                  {comment.length}/100
                </span>
              </div>
            </div>
            {submitError && <div className="alert alert--error">{submitError}</div>}
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting || stars < 1 || comment.trim().length < 1}
            >
              {submitting ? 'Submitting…' : 'Submit Rating'}
            </button>
          </form>
        </div>
      ) : (
        <div className="card" style={{ padding: 28, marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8, color: '#FFB800' }}>★</div>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Thanks for your rating!</p>
        </div>
      )}

      {totalRatings > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Ratings</h2>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ★ {avgStars} · {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
            </span>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            {ratings.map(r => (
              <div key={r.id} className="card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <StarRating value={r.stars} size={16} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {r.comment}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function WishlistRow({ item, rank }) {
  return (
    <div className="wishlist-item">
      <div className={`wishlist-item__rank ${rank <= 3 ? 'wishlist-item__rank--top' : ''}`}>
        {rank}
      </div>
      {item.artwork_url ? (
        <img className="wishlist-item__artwork" src={item.artwork_url} alt="" loading="lazy" />
      ) : (
        <div className="wishlist-item__artwork--placeholder">♪</div>
      )}
      <div className="wishlist-item__info">
        <div className="wishlist-item__title">{item.title}</div>
        <div className="wishlist-item__artist">{item.artist}</div>
        {item.album && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 2 }}>
            {item.album}
          </div>
        )}
      </div>
      <div className="wishlist-item__count">
        <div className="wishlist-item__count-num">{item.request_count}</div>
        <div className="wishlist-item__count-label">req</div>
      </div>
    </div>
  );
}
