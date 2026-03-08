import { useState } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

export default function EventCreate() {
  const [form, setForm] = useState({
    eventName: '',
    djName: '',
    date: '',
    venue: '',
    pin: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState({});

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (form.pin.length < 4) {
      setError('PIN must be at least 4 digits.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create event');
      setCreated({
        ...data,
        guestUrl: `${window.location.origin}/event/${data.event.guest_token}`,
        dashboardUrl: `${window.location.origin}/dashboard/${data.event.dj_token}`,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyToClipboard(text, key) {
    await navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
  }

  if (created) {
    return (
      <main className="page" style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: 32 }}>
          <span className="label" style={{ color: 'var(--accent)' }}>Event Created</span>
          <h1 style={{ marginTop: 8 }}>{created.event.event_name}</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            {created.event.dj_name} · {new Date(created.event.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {created.event.venue}
          </p>
        </div>

        <div className="card card--accent" style={{ marginBottom: 24 }}>
          <p className="label" style={{ color: 'var(--accent)', marginBottom: 12 }}>Save These Links — You'll Need Them</p>

          <div className="stack">
            <div>
              <p className="form-label" style={{ marginBottom: 6 }}>Guest Link (share this)</p>
              <div
                className="link-box"
                onClick={() => copyToClipboard(created.guestUrl, 'guest')}
                title="Click to copy"
              >
                {created.guestUrl}
              </div>
              <button
                className="btn btn--ghost"
                style={{ marginTop: 8 }}
                onClick={() => copyToClipboard(created.guestUrl, 'guest')}
              >
                {copied.guest ? 'Copied!' : 'Copy Guest Link'}
              </button>
            </div>

            <div className="divider" />

            <div>
              <p className="form-label" style={{ marginBottom: 6 }}>
                DJ Dashboard (keep private — requires your PIN)
              </p>
              <div
                className="link-box"
                onClick={() => copyToClipboard(created.dashboardUrl, 'dj')}
                title="Click to copy"
              >
                {created.dashboardUrl}
              </div>
              <button
                className="btn btn--ghost"
                style={{ marginTop: 8 }}
                onClick={() => copyToClipboard(created.dashboardUrl, 'dj')}
              >
                {copied.dj ? 'Copied!' : 'Copy Dashboard Link'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href={created.dashboardUrl} className="btn btn--primary">
            Open My Dashboard
          </a>
          <Link to="/" className="btn btn--ghost">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page" style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 40 }}>
        <span className="label" style={{ color: 'var(--accent)' }}>Host an Event</span>
        <h1 style={{ marginTop: 8 }}>Create Your Event</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>
          Set up a live wishlist for your crowd. Guests request songs, you see what's most wanted — in real time.
        </p>
      </div>

      {error && (
        <div className="alert alert--error" style={{ marginBottom: 24 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="stack" style={{ gap: 20 }}>
        <div className="form-group">
          <label className="form-label">Event Name</label>
          <input
            className="form-input"
            name="eventName"
            value={form.eventName}
            onChange={handleChange}
            placeholder="Friday Night Sessions"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">DJ Name</label>
          <input
            className="form-input"
            name="djName"
            value={form.djName}
            onChange={handleChange}
            placeholder="DJ Apex"
            required
          />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              className="form-input"
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Venue</label>
            <input
              className="form-input"
              name="venue"
              value={form.venue}
              onChange={handleChange}
              placeholder="The Underground"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Dashboard PIN (min. 4 digits)</label>
          <input
            className="form-input"
            type="password"
            name="pin"
            value={form.pin}
            onChange={handleChange}
            placeholder="••••"
            minLength={4}
            required
            autoComplete="new-password"
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Protects your dashboard. Write it down — it can't be recovered.
          </p>
        </div>

        <button
          type="submit"
          className="btn btn--primary"
          disabled={submitting}
          style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem' }}
        >
          {submitting ? 'Creating…' : 'Create Event'}
        </button>
      </form>
    </main>
  );
}
