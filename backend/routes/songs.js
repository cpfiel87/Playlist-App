import express from 'express';
import supabase from '../db/supabase.js';

const router = express.Router();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || '0.0.0.0';
}

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

// Get average rating for a song
router.get('/:trackId/rating', async (req, res) => {
  const { trackId } = req.params;
  const ip = getClientIp(req);

  try {
    const { data, error } = await supabase
      .from('song_ratings')
      .select('rating')
      .eq('itunes_track_id', trackId);

    if (error) throw error;

    const userRating = await supabase
      .from('song_ratings')
      .select('rating')
      .eq('itunes_track_id', trackId)
      .eq('ip_address', ip)
      .maybeSingle();

    const totalRatings = data.length;
    const avgRating = totalRatings > 0
      ? data.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : null;

    res.json({
      averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      totalRatings,
      userRating: userRating.data?.rating || null,
    });
  } catch (err) {
    console.error('Get rating error:', err);
    res.status(500).json({ error: 'Failed to fetch rating' });
  }
});

// Rate a song (1-10), one per IP per song
router.post('/rate', async (req, res) => {
  const { trackId, title, artist, album, releaseYear, artworkUrl, rating } = req.body;
  const ip = getClientIp(req);

  if (!trackId || !title || !artist) {
    return res.status(400).json({ error: 'trackId, title, and artist are required' });
  }
  if (!rating || rating < 1 || rating > 10 || !Number.isInteger(Number(rating))) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 10' });
  }

  try {
    const { data, error } = await supabase
      .from('song_ratings')
      .upsert(
        {
          itunes_track_id: trackId,
          title,
          artist,
          album: album || null,
          release_year: releaseYear || null,
          artwork_url: artworkUrl || null,
          ip_address: ip,
          rating: Number(rating),
        },
        { onConflict: 'itunes_track_id,ip_address' }
      )
      .select();

    if (error) throw error;

    // Fetch updated stats
    const { data: allRatings } = await supabase
      .from('song_ratings')
      .select('rating')
      .eq('itunes_track_id', trackId);

    const totalRatings = allRatings.length;
    const avgRating = totalRatings > 0
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : null;

    res.json({
      success: true,
      averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      totalRatings,
      userRating: Number(rating),
    });
  } catch (err) {
    console.error('Rate song error:', err);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

export default router;
