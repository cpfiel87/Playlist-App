import { useState } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

export default function Admin() {
  const [key, setKey] = useState('');
  const [savedKey, setSavedKey] = useState(null);
  const [keyError, setKeyError] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // event id
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  async function handleUnlock(e) {
    e.preventDefault();
    setKeyError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/events`, {
        headers: { 'x-master-key': key },
      });
      if (res.status === 401) throw new Error('Invalid master key');
      if (!res.ok) throw new Error('Failed to load events');
      const data = await res.json();
      setSavedKey(key);
      setEvents(data.events || []);
    } catch (err) {
      setKeyError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(eventId) {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/admin/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'x-master-key': savedKey },
      });
      if (!res.ok) throw new Error('Failed to delete event');
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (!savedKey) {
    return (
      <main className="page">
        <div className="pin-screen">
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <span className="label" style={{ color: 'var(--accent)' }}>Admin</span>
            <h2 style={{ marginTop: 8 }}>Master Key</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
              Enter the master key to access the admin panel.
            </p>
          </div>

          <form
            onSubmit={handleUnlock}
            className="stack"
            style={{ width: '100%', maxWidth: 320, gap: 16 }}
          >
            {keyError && <div className="alert alert--error">{keyError}</div>}
            <div className="form-group">
              <label className="form-label">Master Key</label>
              <input
                className="form-input"
                type="password"
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="••••••••"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading || key.length < 1}
              style={{ width: '100%', padding: '0.75rem' }}
            >
              {loading ? 'Verifying…' : 'Unlock'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="page page--wide">
      <div style={{ marginBottom: 32 }}>
        <span className="label" style={{ color: 'var(--accent)' }}>Admin Panel</span>
        <h1 style={{ marginTop: 8 }}>All Events</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
          {events.length} event{events.length !== 1 ? 's' : ''} total
        </p>
      </div>

      {error && <div className="alert alert--error" style={{ marginBottom: 24 }}>{error}</div>}

      {events.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--text-dim)' }}>No events found.</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {events.map(event => (
            <div key={event.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{event.event_name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {event.dj_name} &nbsp;·&nbsp; {event.venue} &nbsp;·&nbsp;{' '}
                  {event.event_date && new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                  <span className={`badge ${event.status === 'finished' ? 'badge--finished' : 'badge--active'}`}>
                    <span className="badge--dot" />
                    {event.status === 'finished' ? 'Finished' : 'Live'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Link
                  to={`/event/${event.guest_token}`}
                  className="btn btn--ghost"
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  Guest Page
                </Link>
                <Link
                  to={`/dashboard/${event.dj_token}`}
                  className="btn btn--ghost"
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  onClick={() => sessionStorage.setItem('rtm_master_key', savedKey)}
                >
                  Dashboard
                </Link>

                {deleteConfirm === event.id ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn--danger"
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={() => handleDelete(event.id)}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting…' : 'Confirm'}
                    </button>
                    <button
                      className="btn btn--ghost"
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={() => setDeleteConfirm(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn--danger"
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    onClick={() => setDeleteConfirm(event.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
