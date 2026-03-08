import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import RatingDots from '../components/RatingDots.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function VotingPage() {
  const { guestToken } = useParams();
  const [event, setEvent] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/events/${guestToken}/votes`);
      if (res.status === 403) {
        const data = await res.json();
        throw new Error(data.error || 'Voting not available yet');
      }
      if (!res.ok) throw new Error('Failed to load voting page');
      const data = await res.json();
      setEvent(data.event);
      setWishlist(data.wishlist || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [guestToken]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  if (error) return (
    <main className="page" style={{ maxWidth: 640, textAlign: 'center', paddingTop: 80 }}>
      <div className="alert alert--info" style={{ marginBottom: 24 }}>{error}</div>
      <Link to={`/event/${guestToken}`} className="btn btn--ghost">Back to Event</Link>
    </main>
  );

  return (
    <main className="page" style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <span className="badge badge--finished" style={{ display: 'inline-flex', marginBottom: 16 }}>
          <span className="badge--dot" />
          Event Ended
        </span>
        <h1 style={{ marginBottom: 8 }}>{event?.event_name}</h1>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          {event?.dj_name} &nbsp;·&nbsp;{' '}
          {event?.event_date && new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
          })}
          &nbsp;·&nbsp; {event?.venue}
        </p>
        <div className="divider" style={{ marginTop: 24 }} />
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: 8 }}>How was the music?</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Rate every song that was on tonight's wishlist. One vote per song.
        </p>
      </div>

      {wishlist.length === 0 ? (
        <div className="empty">
          <div className="empty__icon">♪</div>
          <p className="empty__text">No songs on the wishlist for this event.</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 16 }}>
          {wishlist.map((item, i) => (
            <VoteCard
              key={item.id}
              item={item}
              rank={i + 1}
              guestToken={guestToken}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 48, textAlign: 'center' }}>
        <Link to="/" className="btn btn--ghost">Back to Rate The Music</Link>
      </div>
    </main>
  );
}

function VoteCard({ item, rank, guestToken }) {
  const [submitting, setSubmitting] = useState(false);
  const [localRating, setLocalRating] = useState(item.userRating);
  const [localAvg, setLocalAvg] = useState(item.averageRating);
  const [localCount, setLocalCount] = useState(item.totalVotes);

  async function handleRate(rating) {
    if (localRating || submitting) return;
    setSubmitting(true);
    setLocalRating(rating);
    try {
      const res = await fetch(`${API}/api/events/${guestToken}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: item.itunes_track_id, rating }),
      });
      const data = await res.json();
      if (res.ok) {
        setLocalAvg(data.averageRating);
        setLocalCount(data.totalVotes);
      }
    } catch {}
    setSubmitting(false);
  }

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        flexWrap: 'wrap',
        borderColor: localRating ? 'var(--border-2)' : 'var(--border)',
      }}
    >
      {/* Rank */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: rank <= 3 ? 'var(--accent)' : 'var(--text-dim)',
        width: 24,
        textAlign: 'center',
        flexShrink: 0,
      }}>
        #{rank}
      </div>

      {/* Artwork */}
      {item.artwork_url ? (
        <img
          src={item.artwork_url}
          alt=""
          style={{ width: 64, height: 64, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
          loading="lazy"
        />
      ) : (
        <div style={{
          width: 64, height: 64, borderRadius: 4, flexShrink: 0,
          background: 'var(--bg-card-2)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'var(--text-dim)', fontSize: '1.25rem',
        }}>
          ♪
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{
          fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1rem',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.title}
        </div>
        <div style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>{item.artist}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 2 }}>
          {item.request_count} request{item.request_count !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Rating */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        {localAvg !== null && (
          <div className="rating-display" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
            <span className="rating-display__score">{localAvg}</span>
            <span className="rating-display__count">
              {localCount} vote{localCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        <RatingDots
          value={localRating}
          onChange={!localRating && !submitting ? handleRate : undefined}
          readonly={!!localRating || submitting}
        />
        <div className="label" style={{ marginTop: 4, textAlign: 'center', color: localRating ? 'var(--accent)' : 'var(--text-dim)' }}>
          {submitting ? 'Saving…' : localRating ? `You: ${localRating}/10` : 'Tap to rate'}
        </div>
      </div>
    </div>
  );
}
