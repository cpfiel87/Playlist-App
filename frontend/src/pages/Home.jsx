import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main className="page">
      {/* Hero */}
      <section className="hero">
        <p className="hero__eyebrow">DJ Playlist Manager</p>
        <h1 className="hero__title">
          Let The <em>Crowd</em> Decide
        </h1>
        <p className="hero__subtitle">
          Create an event, share the link, and let your guests request the songs they want to hear.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 32 }}>
          <Link to="/create-event" className="btn btn--primary">
            Create Event
          </Link>
          <Link to="/events" className="btn btn--ghost">
            Browse Events
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section
        style={{
          display: 'flex',
          gap: 24,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginTop: 64,
        }}
      >
        <FeatureCard
          icon="🎛"
          title="Host an Event"
          desc="Create an event with a PIN-protected dashboard. Share the guest link and watch requests roll in."
        />
        <FeatureCard
          icon="🎵"
          title="Guest Wishlists"
          desc="Guests search the iTunes catalog and request songs. The most-wanted tracks rise to the top."
        />
        <FeatureCard
          icon="🗳"
          title="Post-Event Voting"
          desc="After the night ends, guests can vote on the songs that were played."
        />
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', marginTop: 80 }}>
        <div className="divider" style={{ marginBottom: 40 }} />
        <h2 style={{ marginBottom: 16 }}>Ready to host?</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          Set up your event in seconds. No account needed.
        </p>
        <Link to="/create-event" className="btn btn--primary">
          Get Started
        </Link>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div
      className="card"
      style={{
        maxWidth: 260,
        textAlign: 'left',
        flex: '1 1 220px',
      }}
    >
      <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>{icon}</div>
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}
