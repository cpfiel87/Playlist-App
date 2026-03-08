import { useState, useEffect } from 'react';
import RatingDots from './RatingDots.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function SongCard({ song, mode = 'rate', onAddToWishlist, eventToken }) {
  const [ratingData, setRatingData] = useState({ averageRating: null, totalRatings: 0, userRating: null });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (mode === 'rate') {
      fetch(`${API}/api/songs/${song.trackId}/rating`)
        .then(r => r.json())
        .then(data => setRatingData(data))
        .catch(() => {});
    }
  }, [song.trackId, mode]);

  async function handleRate(rating) {
    if (ratingData.userRating) return; // already voted
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${API}/api/songs/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: song.trackId,
          title: song.title,
          artist: song.artist,
          album: song.album,
          releaseYear: song.releaseYear,
          artworkUrl: song.artworkUrl,
          rating,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rating failed');
      setRatingData({ averageRating: data.averageRating, totalRatings: data.totalRatings, userRating: data.userRating });
      setMessage({ type: 'success', text: `You rated this ${rating}/10` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddToWishlist() {
    if (added) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${API}/api/events/${eventToken}/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: song.trackId,
          title: song.title,
          artist: song.artist,
          album: song.album,
          releaseYear: song.releaseYear,
          artworkUrl: song.artworkUrl,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setMessage({ type: 'info', text: 'Already requested by you' });
        setAdded(true);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to add');
      setAdded(true);
      setMessage({ type: 'success', text: 'Added to wishlist!' });
      onAddToWishlist && onAddToWishlist();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="song-card">
      {song.artworkUrl ? (
        <img
          className="song-card__artwork"
          src={song.artworkUrl}
          alt={`${song.album} artwork`}
          loading="lazy"
        />
      ) : (
        <div className="song-card__artwork--placeholder">♪</div>
      )}

      <div className="song-card__info">
        <div className="song-card__title">{song.title}</div>
        <div className="song-card__artist">{song.artist}</div>
        <div className="song-card__meta">
          {song.album && <span className="song-card__meta-item">{song.album}</span>}
          {song.releaseYear && <span className="song-card__meta-item">{song.releaseYear}</span>}
          {song.genre && <span className="song-card__meta-item">{song.genre}</span>}
        </div>

        {message && (
          <div
            className={`alert alert--${message.type}`}
            style={{ marginTop: 8, padding: '6px 10px', fontSize: '0.78rem' }}
          >
            {message.text}
          </div>
        )}
      </div>

      <div className="song-card__actions">
        {mode === 'rate' && (
          <>
            {ratingData.averageRating !== null && (
              <div className="rating-display">
                <span className="rating-display__score">{ratingData.averageRating}</span>
                <span className="rating-display__count">
                  {ratingData.totalRatings} vote{ratingData.totalRatings !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            <RatingDots
              value={ratingData.userRating}
              onChange={submitting || ratingData.userRating ? undefined : handleRate}
              readonly={!!ratingData.userRating || submitting}
            />
            {!ratingData.userRating && (
              <span className="label" style={{ fontSize: '0.65rem' }}>
                {submitting ? 'Saving…' : 'Tap to rate'}
              </span>
            )}
          </>
        )}

        {mode === 'wishlist' && (
          <button
            className={`btn ${added ? 'btn--ghost' : 'btn--primary'}`}
            onClick={handleAddToWishlist}
            disabled={submitting || added}
          >
            {submitting ? 'Adding…' : added ? 'Requested' : '+ Request'}
          </button>
        )}
      </div>
    </div>
  );
}
