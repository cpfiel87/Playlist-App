import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import StarRating from '../components/StarRating.jsx';

const API = import.meta.env.VITE_API_URL || '';
const SESSION_KEY = (djToken) => `rtm_dj_pin_${djToken}`;
const MASTER_KEY_SESSION = 'rtm_master_key';

export default function DJDashboard() {
  const { djToken } = useParams();
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [savedPin, setSavedPin] = useState(null);
  const [masterKey, setMasterKey] = useState(null);

  const [event, setEvent] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishConfirm, setFinishConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [avgStars, setAvgStars] = useState(null);
  const [totalRatings, setTotalRatings] = useState(0);

  // Notification state
  const [notification, setNotification] = useState(null);
  const [notifDraft, setNotifDraft] = useState('');
  const [savingNotif, setSavingNotif] = useState(false);
  const [clearingNotif, setClearingNotif] = useState(false);
  const notifInitialized = useRef(false);

  const pollRef = useRef(null);

  useEffect(() => {
    const storedMk = sessionStorage.getItem(MASTER_KEY_SESSION);
    if (storedMk) {
      setMasterKey(storedMk);
      setVerified(true);
      return;
    }
    const stored = sessionStorage.getItem(SESSION_KEY(djToken));
    if (stored) {
      setSavedPin(stored);
      setVerified(true);
    }
  }, [djToken]);

  const loadRatings = useCallback(async (guestToken) => {
    if (!guestToken) return;
    try {
      const res = await fetch(`${API}/api/events/${guestToken}/ratings`);
      if (!res.ok) return;
      const data = await res.json();
      setRatings(data.ratings || []);
      setAvgStars(data.averageStars);
      setTotalRatings(data.totalRatings);
    } catch {}
  }, []);

  const loadDashboard = useCallback(async (p, mk) => {
    setLoading(true);
    setError(null);
    try {
      const headers = mk
        ? { 'x-master-key': mk }
        : { 'x-dj-pin': p };
      const res = await fetch(`${API}/api/events/dashboard/${djToken}`, { headers });
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
      if (data.event?.status === 'finished') {
        loadRatings(data.event.guest_token);
      }
      // Update notification from dashboard response (active events only)
      if (data.event?.status === 'active') {
        setNotification(data.notification || null);
        if (!notifInitialized.current && data.notification) {
          setNotifDraft(data.notification.message);
          notifInitialized.current = true;
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [djToken, loadRatings]);

  useEffect(() => {
    if (verified && (savedPin || masterKey)) {
      loadDashboard(savedPin, masterKey);
      pollRef.current = setInterval(() => loadDashboard(savedPin, masterKey), 6000);
    }
    return () => clearInterval(pollRef.current);
  }, [verified, savedPin, masterKey, loadDashboard]);

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
      const headers = masterKey ? { 'x-master-key': masterKey } : { 'x-dj-pin': savedPin };
      const res = await fetch(`${API}/api/events/dashboard/${djToken}/finish`, {
        method: 'PUT',
        headers,
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

  async function handleDeleteEvent() {
    setDeleting(true);
    try {
      const headers = masterKey ? { 'x-master-key': masterKey } : { 'x-dj-pin': savedPin };
      const res = await fetch(`${API}/api/events/dashboard/${djToken}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to delete event');
      window.location.href = '/events';
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  async function handlePostNotification() {
    if (!notifDraft.trim()) return;
    setSavingNotif(true);
    try {
      const headers = masterKey
        ? { 'x-master-key': masterKey, 'Content-Type': 'application/json' }
        : { 'x-dj-pin': savedPin, 'Content-Type': 'application/json' };
      const res = await fetch(`${API}/api/events/dashboard/${djToken}/notification`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: notifDraft }),
      });
      if (!res.ok) throw new Error('Failed to post notification');
      const data = await res.json();
      setNotification(data.notification);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingNotif(false);
    }
  }

  async function handleClearNotification() {
    setClearingNotif(true);
    try {
      const headers = masterKey ? { 'x-master-key': masterKey } : { 'x-dj-pin': savedPin };
      const res = await fetch(`${API}/api/events/dashboard/${djToken}/notification`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to clear notification');
      setNotification(null);
      setNotifDraft('');
      notifInitialized.current = false;
    } catch (err) {
      setError(err.message);
    } finally {
      setClearingNotif(false);
    }
  }

  function exportCSV() {
    const headers = ['Title', 'Artist', 'Album', 'Requests'];
    const rows = wishlist.map(item => [
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${(item.artist || '').replace(/"/g, '""')}"`,
      `"${(item.album || '').replace(/"/g, '""')}"`,
      item.request_count,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event?.event_name || 'wishlist'}-wishlist.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{event?.event_name}</h1>
            {event?.status === 'finished' && avgStars !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StarRating value={avgStars} size={18} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {avgStars} · {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
                </span>
              </div>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginTop: 6 }}>
            {event?.dj_name} &nbsp;·&nbsp;{' '}
            {event?.event_date && new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            &nbsp;·&nbsp; {event?.venue}
            {event?.created_at && (
              <>&nbsp;·&nbsp; Created {new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
            )}
          </p>
          {event?.description && (
            <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: '0.9rem', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
              {event.description}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className={`badge ${event?.status === 'finished' ? 'badge--finished' : 'badge--active'}`}>
            <span className="badge--dot" />
            {event?.status === 'finished' ? 'Finished' : 'Live'}
          </span>

          <button className="btn btn--ghost" onClick={copyGuestLink}>
            {copied ? 'Copied!' : 'Copy Guest Link'}
          </button>

          {event?.status !== 'finished' && (
            !finishConfirm ? (
              <button className="btn btn--danger" onClick={() => setFinishConfirm(true)}>
                End Event
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn--danger" onClick={handleFinishEvent} disabled={finishing}>
                  {finishing ? 'Ending…' : 'Confirm End'}
                </button>
                <button className="btn btn--ghost" onClick={() => setFinishConfirm(false)}>
                  Cancel
                </button>
              </div>
            )
          )}

          {!deleteConfirm ? (
            <button
              className="btn btn--ghost"
              style={{ color: 'var(--text-dim)', borderColor: 'var(--border)' }}
              onClick={() => setDeleteConfirm(true)}
            >
              Delete Event
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--danger" onClick={handleDeleteEvent} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
              <button className="btn btn--ghost" onClick={() => setDeleteConfirm(false)}>
                Cancel
              </button>
            </div>
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
        <Stat label="Total Requests" value={wishlist.reduce((s, i) => s + i.request_count, 0)} />
        {wishlist[0] && <Stat label="Most Wanted" value={wishlist[0].title} mono={false} />}
      </div>

      {event?.status === 'finished' ? (
        /* Two-column layout for finished events: ratings left, wishlist right */
        <div
          className="dj-finished-layout"
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,360px)', gap: 32, alignItems: 'start' }}
        >
          <RatingsPanel
            ratings={ratings}
            avgStars={avgStars}
            totalRatings={totalRatings}
            djToken={djToken}
            savedPin={savedPin}
            masterKey={masterKey}
            onDelete={id => {
              setRatings(prev => prev.filter(r => r.id !== id));
              setTotalRatings(prev => prev - 1);
            }}
            onReply={(id, reply) => setRatings(prev => prev.map(r => r.id === id ? { ...r, dj_reply: reply } : r))}
          />

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Crowd Wishlist</h2>
              {wishlist.length > 0 && (
                <button className="btn btn--ghost" onClick={exportCSV} style={{ fontSize: '0.8rem' }}>
                  Export CSV
                </button>
              )}
            </div>
            {wishlist.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8, opacity: 0.3 }}>♪</div>
                <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>No requests.</p>
              </div>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {wishlist.map((item, i) => (
                  <DashboardWishlistRow key={item.id} item={item} rank={i + 1} />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Active event: 2-col notification editor + wishlist */
        <div
          className="dj-active-layout"
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0,320px) minmax(0,1fr)', gap: 32, alignItems: 'start' }}
        >
          {/* Notification Editor */}
          <section>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Broadcast</h2>

            {notification && (
              <div className="card" style={{ borderLeft: '3px solid var(--accent)', padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: 6 }}>
                  LIVE ANNOUNCEMENT
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6 }}>
                  {notification.message}
                </p>
              </div>
            )}

            <div style={{ position: 'relative', marginBottom: 12 }}>
              <textarea
                className="form-input"
                value={notifDraft}
                onChange={e => setNotifDraft(e.target.value.slice(0, 280))}
                placeholder="Type an announcement for guests…"
                rows={4}
                style={{ resize: 'vertical', paddingBottom: 28 }}
              />
              <span style={{
                position: 'absolute', bottom: 8, right: 12,
                fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
                color: notifDraft.length >= 250 ? 'var(--accent)' : 'var(--text-dim)',
                pointerEvents: 'none',
              }}>
                {notifDraft.length}/280
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn--primary"
                style={{ flex: 1, fontSize: '0.85rem' }}
                disabled={savingNotif || notifDraft.trim().length < 1}
                onClick={handlePostNotification}
              >
                {savingNotif ? 'Posting…' : notification ? 'Update' : 'Post'}
              </button>
              {notification && (
                <button
                  className="btn btn--ghost"
                  style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}
                  disabled={clearingNotif}
                  onClick={handleClearNotification}
                >
                  {clearingNotif ? '…' : 'Clear'}
                </button>
              )}
            </div>
            <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', marginTop: 10, lineHeight: 1.5 }}>
              Guests see this in real time. Posting overwrites the current announcement.
            </p>
          </section>

          {/* Wishlist */}
          <section>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: '1.2rem' }}>Crowd Wishlist — Ranked by Requests</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                  Updates every 6 seconds.
                  {loading && <span style={{ color: 'var(--accent)', marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>Refreshing…</span>}
                </p>
              </div>
              {wishlist.length > 0 && (
                <button className="btn btn--ghost" onClick={exportCSV} style={{ fontSize: '0.8rem' }}>
                  Export CSV
                </button>
              )}
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
          </section>
        </div>
      )}

      <style>{`
        @media (max-width: 720px) {
          .dj-finished-layout { grid-template-columns: 1fr !important; }
          .dj-active-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
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

function RatingsPanel({ ratings, avgStars, totalRatings, djToken, savedPin, masterKey, onDelete, onReply }) {
  const [deletingId, setDeletingId] = useState(null);
  const [replyingId, setReplyingId] = useState(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [savingReplyId, setSavingReplyId] = useState(null);

  async function handleDelete(ratingId) {
    setDeletingId(ratingId);
    try {
      const headers = masterKey
        ? { 'x-master-key': masterKey }
        : { 'x-dj-pin': savedPin };
      const res = await fetch(`${API}/api/events/dashboard/${djToken}/ratings/${ratingId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) onDelete(ratingId);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSaveReply(ratingId) {
    setSavingReplyId(ratingId);
    try {
      const headers = masterKey
        ? { 'x-master-key': masterKey, 'Content-Type': 'application/json' }
        : { 'x-dj-pin': savedPin, 'Content-Type': 'application/json' };
      const res = await fetch(`${API}/api/events/dashboard/${djToken}/ratings/${ratingId}/reply`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ reply: replyDraft }),
      });
      if (res.ok) {
        onReply(ratingId, replyDraft.trim() || null);
        setReplyingId(null);
        setReplyDraft('');
      }
    } finally {
      setSavingReplyId(null);
    }
  }

  function startReply(r) {
    setReplyingId(r.id);
    setReplyDraft(r.dj_reply || '');
  }

  return (
    <section>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>
        {totalRatings > 0 ? `${totalRatings} ${totalRatings === 1 ? 'Rating' : 'Ratings'}` : 'Ratings'}
      </h2>
      {ratings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            No ratings yet.
          </p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {ratings.map(r => (
            <div key={r.id} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <StarRating value={r.stars} size={18} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    {r.comment}
                  </p>

                  {/* DJ Reply display */}
                  {r.dj_reply && replyingId !== r.id && (
                    <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '2px solid var(--accent)' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 4 }}>
                        YOUR RESPONSE
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        {r.dj_reply}
                      </p>
                    </div>
                  )}

                  {/* Reply input */}
                  {replyingId === r.id && (
                    <div style={{ marginTop: 12 }}>
                      <textarea
                        className="form-input"
                        value={replyDraft}
                        onChange={e => setReplyDraft(e.target.value)}
                        placeholder="Write your response…"
                        rows={2}
                        style={{ resize: 'vertical', fontSize: '0.85rem' }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                          className="btn btn--primary"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                          onClick={() => handleSaveReply(r.id)}
                          disabled={savingReplyId === r.id}
                        >
                          {savingReplyId === r.id ? '…' : 'Save'}
                        </button>
                        <button
                          className="btn btn--ghost"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                          onClick={() => { setReplyingId(null); setReplyDraft(''); }}
                        >
                          Cancel
                        </button>
                        {r.dj_reply && (
                          <button
                            className="btn btn--ghost"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', color: 'var(--text-dim)' }}
                            onClick={() => { setReplyDraft(''); handleSaveReply(r.id); }}
                            disabled={savingReplyId === r.id}
                          >
                            Remove reply
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reply / Edit button */}
                  {replyingId !== r.id && (
                    <button
                      className="btn btn--ghost"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', marginTop: 10, color: 'var(--text-dim)' }}
                      onClick={() => startReply(r)}
                    >
                      {r.dj_reply ? 'Edit reply' : 'Reply'}
                    </button>
                  )}
                </div>

                <button
                  className="btn btn--ghost"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', color: 'var(--text-dim)', flexShrink: 0 }}
                  onClick={() => handleDelete(r.id)}
                  disabled={deletingId === r.id}
                >
                  {deletingId === r.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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
