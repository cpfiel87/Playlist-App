import express from 'express';

const router = express.Router();

// Search songs via iTunes API
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  try {
    const encoded = encodeURIComponent(q.trim());
    const url = `https://itunes.apple.com/search?term=${encoded}&media=music&entity=song&limit=20&country=US`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('iTunes API error');
    const data = await response.json();

    const songs = data.results.map(track => ({
      trackId: track.trackId,
      title: track.trackName,
      artist: track.artistName,
      album: track.collectionName,
      releaseYear: track.releaseDate ? track.releaseDate.substring(0, 4) : null,
      genre: track.primaryGenreName,
      artworkUrl: track.artworkUrl100
        ? track.artworkUrl100.replace('100x100bb', '400x400bb')
        : null,
      previewUrl: track.previewUrl,
    }));

    res.json({ results: songs });
  } catch (err) {
    console.error('iTunes search error:', err);
    res.status(502).json({ error: 'Failed to fetch songs from iTunes' });
  }
});

export default router;
