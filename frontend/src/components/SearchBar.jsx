import { useState, useRef, useEffect, useCallback } from 'react';

export default function SearchBar({ onResults, placeholder = 'Search for a song, artist, or album…' }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);
  const API = import.meta.env.VITE_API_URL || '';

  const search = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      onResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/songs/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      onResults(data.results || []);
    } catch (err) {
      setError('Search failed. Please try again.');
      onResults([]);
    } finally {
      setLoading(false);
    }
  }, [API, onResults]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      onResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => search(query), 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  return (
    <div className="stack" style={{ gap: '8px' }}>
      <div className="search-bar">
        <span className="search-bar__icon">
          {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : '⌕'}
        </span>
        <input
          className="search-bar__input"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {query && (
          <button className="search-bar__clear" onClick={() => { setQuery(''); onResults([]); }}>
            ×
          </button>
        )}
      </div>
      {error && <div className="alert alert--error">{error}</div>}
    </div>
  );
}
