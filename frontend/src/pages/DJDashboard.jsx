import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';
const SESSION_KEY = (djToken) => `rtm_dj_pin_${djToken}`;

export default function DJDashboard() {
  const { djToken } = useParams();
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [savedPin, setSavedPin] = useState(null);

  const [event, setEvent] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishConfirm, setFinishConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef(null);

  // Check sessionStorage for already-verified PIN
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY(djToken));
    if (stored) {
      setSavedPin(stored);
      setVerified(true);
    }
  }, [djToken]);

  const loadDashboard = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/events/dashboard/${djToken}`, {
        headers: { 'x-dj-pin': p },
      });
      if (res.status === 401) {
        setVerified(false);
        sessionStorage.removeItem(SESSION_KEY(djToken));
        setError('PIN was rejected. Please log in again.');
        return;
      }
      if (!res.ok) throw new Error('Failed to load dashboard');
      const data = await res.json();
      setEvent(data.event);
      setWishlist(data.wishlist || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [djToken]);

  useEffect(() => {
    if (verified && savedPin) {
      loadDashboard(savedPin);
      // Poll every 6 seconds
      pollRef.current = setInterval(() => loadDashboard(savedPin), 6000);
    }
    return () => clearInterval(pollRef.current);
  }, [verified, savedPin, loadDashboard]);

  async function handleVerify(e) {
    e.preventDefault();
    setPinError(null);
    setVerifying(true);
    try {
      const res = await fetch(`${API}/api/events/dashboard/${djToken}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid PIN');
      sessionStorage.setItem(SESSION_KEY(djToken), pin);
      setSavedPin(pin);
      setVerified(true);
    } catch (err) {
      setPinError(err.message);
    } finally {
      setVerifying(false);
    }
  }

  async function handleFinishEvent() {
    setFinishing(true);
    try {
      const res = await fetch(`${API}/api/events/dashboard/${djToken}/finish`, {
        method: 'PUT',
        headers: { 'x-dj-pin': savedPin },
      });
      if (!res.ok) throw new Error('Failed to finish event');
      setEvent(prev => ({ ...prev, status: 'finished' }));
      setFinishConfirm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setFinishing(false);
    }
  }

  function copyGuestLink() {
    if (!event) return;
    const url = `${window.location.origin}/event/${event.guest_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // PIN screen
  if (!verified) {
    return (
      <main className="page">
        <div className="pin-screen">
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <span className="label" style={{ color: 'var(--accent)' }}>DJ Dashboard</span>
            <h2 style={{ marginTop: 8 }}>Enter Your PIN</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
              Enter the PIN you set when creating this event.
            </p>
          </div>

          <form
            onSubmit={handleVerify}
            className="stack"
            style={{ width: '100%', maxWidth: 320, gap: 16 }}
          >
            {pinError && <div className="alert alert--error">{pinError}</div>}
            <div className="form-group">
              <label className="form-label">PIN</label>
              <input
                className="form-input"
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="••••"
                autoFocus
                autoComplete="current-password"
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3em' }}
              />
            </div>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={verifying || pin.length < 4}
              style={{ width: '100%', padding: '0.75rem' }}
            >
              {verifying ? 'Verifying…' : 'Unlock Dashboard'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (loading && !event) return (
    <div className="loading-center"><div className="spinner" /></div>
  );

  return (
    <main className="page page--wide">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="label" style={{ color: 'var(--accent)' }}>DJ Dashboard</span>
          <h1 style={{ marginTop: 8 }}>{event?.event_name}</h1>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginTop: 6 }}>
            {event?.dj_name} &nbsp;·&nbsp;{' '}
            {event?.event_date && new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            &nbsp;·&nbsp; {event?.venue}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className={`badge ${event?.status === 'finished' ? 'badge--finished' : 'badge--active'}`}>
            <span className="badge--dot" />
            {event?.status === 'finished' ? 'Finished' : 'Live'}
          </span>

          <button className="btn btn--ghost" onClick={copyGuestLink}>
            {copied ? 'Copied!' : 'Copy Guest Link'}
          </button>

          {event?.status === 'finished' ? (
            <Link
              to={`/event/${event.guest_token}/vote`}
              className="btn btn--primary"
            >
              Open Voting Page
            </Link>
          ) : (
            !finishConfirm ? (
              <button
                className="btn btn--danger"
                onClick={() => setFinishConfirm(true)}
              >
                End Event
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn--danger"
                  onClick={handleFinishEvent}
                  disabled={finishing}
                >
                  {finishing ? 'Ending…' : 'Confirm End'}
                </button>
                <button className="btn btn--ghost" onClick={() => setFinishConfirm(false)}>
                  Cancel
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {error && <div className="alert alert--error" style={{ marginBottom: 24 }}>{error}</div>}

      {/* Stats bar */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          marginBottom: 32,
          padding: '16px 24px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        <Stat label="Songs Requested" value={wishlist.length} />
        <Stat
          label="Total Requests"
          value={wishlist.reduce((s, i) => s + i.request_count, 0)}
        />
        {wishlist[0] && <Stat label="Most Wanted" value={wishlist[0].title} mono={false} />}
      </div>

      {/* Wishlist */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.2rem' }}>Crowd Wishlist — Ranked by Requests</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
          Updates every 6 seconds.
          {loading && <span style={{ color: 'var(--accent)', marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>Refreshing…</span>}
        </p>
      </div>

      {wishlist.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.3 }}>♪</div>
          <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            No requests yet. Share the guest link to get things started.
          </p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {wishlist.map((item, i) => (
            <DashboardWishlistRow key={item.id} item={item} rank={i + 1} />
          ))}
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, mono = true }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-serif)',
        fontSize: mono ? '1.5rem' : '1.1rem',
        fontWeight: 700,
        color: 'var(--text)',
      }}>{value ?? '—'}</div>
    </div>
  );
}

function DashboardWishlistRow({ item, rank }) {
  return (
    <div
      className="wishlist-item"
      style={{
        borderColor: rank === 1 ? 'var(--accent)' : 'var(--border)',
        boxShadow: rank === 1 ? '0 0 16px var(--accent-glow)' : 'none',
      }}
    >
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
