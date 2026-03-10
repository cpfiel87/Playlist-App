import { Routes, Route, Link, NavLink } from 'react-router-dom';
import Home from './pages/Home.jsx';
import EventCreate from './pages/EventCreate.jsx';
import EventsList from './pages/EventsList.jsx';
import GuestEvent from './pages/GuestEvent.jsx';
import DJDashboard from './pages/DJDashboard.jsx';
import EventView from './pages/EventView.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <>
      <nav className="nav">
        <Link to="/" className="nav__logo">
          Rating Tool <span>for Socials</span>
        </Link>
        <ul className="nav__links">
          <li><NavLink to="/events">Events</NavLink></li>
          <li><NavLink to="/create-event">Host Event</NavLink></li>
        </ul>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create-event" element={<EventCreate />} />
        <Route path="/events" element={<EventsList />} />
        <Route path="/event/:guestToken" element={<GuestEvent />} />
        <Route path="/view/:guestToken" element={<EventView />} />
        <Route path="/dashboard/:djToken" element={<DJDashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <footer style={{
        padding: '40px 24px',
        textAlign: 'center',
        borderTop: '1px solid var(--border)',
        marginTop: '80px',
      }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
          RATING TOOL FOR SOCIALS — POWERED BY ITUNES &amp; SUPABASE
        </p>
        <a
          href="https://www.instagram.com/gatokusi"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            color: 'var(--text-dim)',
            textDecoration: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <circle cx="12" cy="12" r="4.5"/>
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
          </svg>
          @gatokusi
        </a>
      </footer>
    </>
  );
}

function NotFound() {
  return (
    <div className="page" style={{ textAlign: 'center', paddingTop: '80px' }}>
      <h1 style={{ color: 'var(--accent)' }}>404</h1>
      <p style={{ color: 'var(--text-muted)', margin: '16px 0 32px' }}>This page doesn't exist.</p>
      <Link to="/" className="btn btn--primary">Go Home</Link>
    </div>
  );
}
