import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pinPrompt, setPinPrompt] = useState(null); // { djToken, eventName }
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/api/events`)
      .then(r => r.json())
      .then(data => setEvents(data.events || []))
      .catch(() => setError('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDJAccess(e) {
    e.preventDefault();
    setPinError(null);
    setVerifying(true);
    try {
      const res = await fetch(`${API}/api/events/dashboard/${pinPrompt.djToken}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || 'Invalid PIN');
        return;
      }
      sessionStorage.setItem(`dj_pin_${pinPrompt.djToken}`, pin);
      navigate(`/dashboard/${pinPrompt.djToken}`);
    } catch {
      setPinError('Something went wrong');
    } finally {
      setVerifying(false);
    }
  }

  function openPinPrompt(event) {
    setPinPrompt({ djToken: event.dj_token, eventName: event.event_name });
    setPin('');
    setPinError(null);
  }

  function closePinPrompt() {
    setPinPrompt(null);
    setPin('');
    setPinError(null);
  }

  if (loading) return <main className="page"><p style={{ color: 'var(--text-muted)' }}>Loading events…</p></main>;
  if (error) return <main className="page"><p style={{ color: 'var(--text-muted)' }}>{error}</p></main>;

  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 40 }}>
        <span className="label" style={{ color: 'var(--accent)' }}>All Events</span>
        <h1 style={{ marginTop: 8 }}>Events</h1>
      </div>

      {events.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No events yet.</p>
      ) : (
        <div className="stack" style={{ gap: 16 }}>
          {events.map(event => (
            <div key={event.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h3 style={{ margin: 0 }}>{event.event_name}</h3>
                  <span className="label" style={{ color: event.status === 'active' ? 'var(--accent)' : 'var(--text-dim)', fontSize: '0.65rem' }}>
                    {event.status === 'active' ? 'LIVE' : 'FINISHED'}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {event.dj_name} · {new Date(event.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} · {event.venue}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={`/event/${event.guest_token}`}
                  className="btn btn--ghost"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                  View Wishlist
                </a>
                <button
                  className="btn btn--primary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                  onClick={() => openPinPrompt(event)}
                >
                  DJ Access
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pinPrompt && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={closePinPrompt}>
          <div className="card" style={{ width: 360, padding: 32 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4 }}>{pinPrompt.eventName}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>Enter your DJ PIN to access the dashboard.</p>
            <form onSubmit={handleDJAccess} className="stack" style={{ gap: 16 }}>
              <input
                className="form-input"
                type="password"
                placeholder="PIN"
                value={pin}
                onChange={e => setPin(e.target.value)}
                autoFocus
                required
              />
              {pinError && <p style={{ color: '#ff4d4d', fontSize: '0.85rem', margin: 0 }}>{pinError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn--primary" disabled={verifying} style={{ flex: 1 }}>
                  {verifying ? 'Verifying…' : 'Enter'}
                </button>
                <button type="button" className="btn btn--ghost" onClick={closePinPrompt}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
