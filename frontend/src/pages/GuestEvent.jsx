import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import SongCard from '../components/SongCard.jsx';

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
    return (
      <main className="page" style={{ maxWidth: 640, textAlign: 'center', paddingTop: 80 }}>
        <span className="badge badge--finished" style={{ display: 'inline-flex', marginBottom: 24 }}>
          <span className="badge--dot" />
          Event Ended
        </span>
        <h1 style={{ marginBottom: 16 }}>{event.event_name}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          The event is over. Head to the voting page to rate the songs that were played tonight.
        </p>
        <Link to={`/event/${guestToken}/vote`} className="btn btn--primary" style={{ padding: '0.75rem 2rem' }}>
          Rate Tonight's Songs
        </Link>
      </main>
    );
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
