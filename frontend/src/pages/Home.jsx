import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main className="page">
      {/* Hero */}
      <section className="hero">
        <p className="hero__eyebrow">Dance Socials</p>
        <h1 className="hero__title">
          See Your Dance Socials In Your City
        </h1>
        <p className="hero__subtitle">
          Discover events near you, request the songs you want to hear, and rate the night after it ends.
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
          title="Find an Event"
          desc="Browse dance socials happening in your city. See who's DJing, what's on the wishlist, and how past events were rated."
        />
        <FeatureCard
          icon="🎵"
          title="Request Songs"
          desc="Guests search the iTunes catalog and add songs to the wishlist. The most-requested tracks rise to the top."
        />
        <FeatureCard
          icon="🗳"
          title="Rate the Night"
          desc="After the event ends, leave a star rating and a short comment. Help others know which socials are worth going to."
        />
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', marginTop: 80 }}>
        <div className="divider" style={{ marginBottom: 40 }} />
        <h2 style={{ marginBottom: 16 }}>Hosting a social?</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          Set up your event in seconds. No account needed.
        </p>
        <Link to="/create-event" className="btn btn--primary">
          Create Event
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
