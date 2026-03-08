import { Routes, Route, Link, NavLink } from 'react-router-dom';
import Home from './pages/Home.jsx';
import EventCreate from './pages/EventCreate.jsx';
import EventsList from './pages/EventsList.jsx';
import GuestEvent from './pages/GuestEvent.jsx';
import DJDashboard from './pages/DJDashboard.jsx';
import VotingPage from './pages/VotingPage.jsx';

export default function App() {
  return (
    <>
      <nav className="nav">
        <Link to="/" className="nav__logo">
          Rate The <span>Music</span>
        </Link>
        <ul className="nav__links">
          <li><NavLink to="/">Discover</NavLink></li>
          <li><NavLink to="/events">Events</NavLink></li>
          <li><NavLink to="/create-event">Host Event</NavLink></li>
        </ul>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create-event" element={<EventCreate />} />
        <Route path="/events" element={<EventsList />} />
        <Route path="/event/:guestToken" element={<GuestEvent />} />
        <Route path="/event/:guestToken/vote" element={<VotingPage />} />
        <Route path="/dashboard/:djToken" element={<DJDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <footer style={{
        padding: '40px 24px',
        textAlign: 'center',
        borderTop: '1px solid var(--border)',
        marginTop: '80px',
      }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
          RATE THE MUSIC — POWERED BY ITUNES &amp; SUPABASE
        </p>
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
