import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import StarRating from '../components/StarRating.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function EventView() {
  const { guestToken } = useParams();
  const [event, setEvent] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [avgStars, setAvgStars] = useState(null);
  const [totalRatings, setTotalRatings] = useState(0);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Rating form state
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const loadRatings = useCallback(async () => {
    const res = await fetch(`${API}/api/events/${guestToken}/ratings`);
    if (!res.ok) return;
    const data = await res.json();
    setRatings(data.ratings || []);
    setAvgStars(data.averageStars);
    setTotalRatings(data.totalRatings);
    setAlreadyRated(data.alreadyRated);
  }, [guestToken]);

  useEffect(() => {
    async function load() {
      try {
        const [eventRes, wishlistRes] = await Promise.all([
          fetch(`${API}/api/events/${guestToken}`),
          fetch(`${API}/api/events/${guestToken}/wishlist`),
        ]);
        if (!eventRes.ok) throw new Error('Event not found');
        const eventData = await eventRes.json();
        setEvent(eventData.event);

        if (wishlistRes.ok) {
          const wlData = await wishlistRes.json();
          setWishlist(wlData.wishlist || []);
        }

        if (eventData.event?.status === 'finished') {
          await loadRatings();
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [guestToken, loadRatings]);

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

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  if (error) return (
    <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
      <div className="alert alert--error">{error}</div>
      <Link to="/events" className="btn btn--ghost" style={{ marginTop: 24 }}>Back to Events</Link>
    </div>
  );

  const isFinished = event?.status === 'finished';

  return (
    <main className="page page--wide">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span className={`badge ${isFinished ? 'badge--finished' : 'badge--active'}`}>
            <span className="badge--dot" />
            {isFinished ? 'Finished' : 'Live Now'}
          </span>
          {isFinished && avgStars !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StarRating value={avgStars} size={16} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {avgStars} · {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
              </span>
            </div>
          )}
        </div>
        <h1 style={{ marginBottom: 6 }}>{event?.event_name}</h1>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          {event?.dj_name} &nbsp;·&nbsp;{' '}
          {event?.event_date && new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          &nbsp;·&nbsp; {event?.venue}
        </p>
        {event?.description && (
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: '0.9rem', lineHeight: 1.6 }}>
            {event.description}
          </p>
        )}
      </div>

      {isFinished ? (
        /* Two-column layout for finished events: ratings left, wishlist right */
        <div
          className="event-view-layout"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) minmax(0,360px)',
            gap: 32,
            alignItems: 'start',
          }}
        >
          {/* Left: rating form + ratings list */}
          <section>
            {!alreadyRated && !submitted ? (
              <div className="card" style={{ padding: 24, marginBottom: 24 }}>
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
              <div className="card" style={{ padding: 24, marginBottom: 24, textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8, color: '#FFB800' }}>★</div>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Thanks for your rating!</p>
              </div>
            )}

            <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>
              {totalRatings > 0 ? `${totalRatings} ${totalRatings === 1 ? 'Rating' : 'Ratings'}` : 'Ratings'}
            </h2>
            {ratings.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 28 }}>
                <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  No ratings yet. Be the first!
                </p>
              </div>
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                {ratings.map(r => (
                  <div key={r.id} className="card" style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <StarRating value={r.stars} size={16} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                      {r.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Right: wishlist */}
          <section>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Crowd Wishlist</h2>
            {wishlist.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8, opacity: 0.3 }}>♪</div>
                <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  No requests for this event.
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
      ) : (
        /* Active event: just show wishlist full-width */
        <>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Crowd Wishlist — Ranked by Requests</h2>
          {wishlist.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.3 }}>♪</div>
              <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                No requests yet.
              </p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {wishlist.map((item, i) => (
                <WishlistRow key={item.id} item={item} rank={i + 1} />
              ))}
            </div>
          )}
        </>
      )}

      <style>{`
        @media (max-width: 720px) {
          .event-view-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

function WishlistRow({ item, rank }) {
  return (
    <div
      className="wishlist-item"
      style={{
        borderColor: rank === 1 ? 'var(--accent)' : 'var(--border)',
        boxShadow: rank === 1 ? '0 0 16px var(--accent-glow)' : 'none',
      }}
    >
      <div className={`wishlist-item__rank ${rank <= 3 ? 'wishlist-item__rank--top' : ''}`}>{rank}</div>
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
            {item.album}{item.release_year ? ` · ${item.release_year}` : ''}
          </div>
        )}
      </div>
      <div className="wishlist-item__count">
        <div className="wishlist-item__count-num" style={{ color: rank === 1 ? 'var(--accent)' : 'var(--text)' }}>
          {item.request_count}
        </div>
        <div className="wishlist-item__count-label">requests</div>
      </div>
    </div>
  );
}
