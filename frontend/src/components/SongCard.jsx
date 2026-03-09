import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export default function SongCard({ song, onAddToWishlist, eventToken }) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [added, setAdded] = useState(false);

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

      {eventToken && (
        <div className="song-card__actions">
          <button
            className={`btn ${added ? 'btn--ghost' : 'btn--primary'}`}
            onClick={handleAddToWishlist}
            disabled={submitting || added}
          >
            {submitting ? 'Adding…' : added ? 'Requested' : '+ Request'}
          </button>
        </div>
      )}
    </div>
  );
}
