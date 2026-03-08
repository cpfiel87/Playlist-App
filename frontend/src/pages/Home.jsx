import { useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import SongCard from '../components/SongCard.jsx';

export default function Home() {
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  function handleResults(songs) {
    setResults(songs);
    setHasSearched(true);
  }

  return (
    <main className="page">
      {/* Hero */}
      <section className="hero">
        <p className="hero__eyebrow">Community Music Ratings</p>
        <h1 className="hero__title">
          Rate The <em>Music</em>
        </h1>
        <p className="hero__subtitle">
          Search any song. Rate it 1 to 10. See what the crowd thinks.
        </p>

        <div style={{ maxWidth: 600, margin: '0 auto 48px' }}>
          <SearchBar onResults={handleResults} />
        </div>

        {!hasSearched && (
          <div
            style={{
              display: 'flex',
              gap: 24,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: 24,
            }}
          >
            <FeatureCard
              icon="⭐"
              title="Rate Any Song"
              desc="Search the iTunes catalog and rate songs 1 to 10. One vote per song."
            />
            <FeatureCard
              icon="🎛"
              title="Host Events"
              desc="DJs can create events with a live wishlist ranked by crowd requests."
            />
            <FeatureCard
              icon="🗳"
              title="Post-Event Voting"
              desc="After the night ends, guests vote on the songs that were played."
            />
          </div>
        )}
      </section>

      {/* Results */}
      {hasSearched && (
        <section>
          <div className="row" style={{ marginBottom: 16 }}>
            <span className="label">
              {results.length > 0 ? `${results.length} results` : 'No results found'}
            </span>
          </div>

          {results.length === 0 && (
            <div className="empty">
              <div className="empty__icon">♪</div>
              <p className="empty__text">No songs found. Try a different search.</p>
            </div>
          )}

          <div className="stack">
            {results.map(song => (
              <SongCard key={song.trackId} song={song} mode="rate" />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      {!hasSearched && (
        <section style={{ textAlign: 'center', marginTop: 64 }}>
          <div className="divider" style={{ marginBottom: 40 }} />
          <h2 style={{ marginBottom: 16 }}>Hosting a set tonight?</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
            Create an event and let your crowd tell you what they want to hear.
          </p>
          <Link to="/create-event" className="btn btn--primary">
            Create Event
          </Link>
        </section>
      )}
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
