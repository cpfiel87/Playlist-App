import express from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../db/supabase.js';

const router = express.Router();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || '0.0.0.0';
}

async function verifyDjAuth(req, pinHash) {
  const masterKey = req.headers['x-master-key'];
  if (masterKey && masterKey === process.env.MASTER_KEY) return true;
  const pin = req.headers['x-dj-pin'];
  if (!pin) return false;
  return bcrypt.compare(String(pin), pinHash);
}

// List all events (public)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, event_name, dj_name, event_date, venue, status, guest_token, dj_token')
      .order('event_date', { ascending: false });

    if (error) throw error;

    res.json({ events: data || [] });
  } catch (err) {
    console.error('List events error:', err);
    res.status(500).json({ error: 'Failed to load events' });
  }
});

// Create a new event (DJ)
router.post('/', async (req, res) => {
  const { eventName, description, djName, date, venue, pin } = req.body;

  if (!eventName || !djName || !date || !venue || !pin) {
    return res.status(400).json({ error: 'All fields are required: eventName, djName, date, venue, pin' });
  }
  if (pin.length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 characters' });
  }

  try {
    const pinHash = await bcrypt.hash(String(pin), 10);
    const guestToken = uuidv4();
    const djToken = uuidv4();

    const { data, error } = await supabase
      .from('events')
      .insert({
        event_name: eventName,
        description: description || null,
        dj_name: djName,
        event_date: date,
        venue,
        pin_hash: pinHash,
        guest_token: guestToken,
        dj_token: djToken,
        status: 'active',
      })
      .select('id, guest_token, dj_token, event_name, dj_name, event_date, venue, status')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      event: data,
      guestLink: `/event/${guestToken}`,
      dashboardLink: `/dashboard/${djToken}`,
    });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Verify DJ PIN
router.post('/dashboard/:djToken/verify', async (req, res) => {
  const { djToken } = req.params;
  const { pin } = req.body;

  if (!pin) return res.status(400).json({ error: 'PIN is required' });

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, pin_hash, event_name, dj_name, event_date, venue, status, guest_token, dj_token')
      .eq('dj_token', djToken)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });

    const valid = await bcrypt.compare(String(pin), event.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' });

    const { pin_hash, ...safeEvent } = event;
    res.json({ success: true, event: safeEvent });
  } catch (err) {
    console.error('Verify PIN error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Get DJ dashboard (requires PIN or master key in header)
router.get('/dashboard/:djToken', async (req, res) => {
  const { djToken } = req.params;

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, pin_hash, event_name, description, dj_name, event_date, venue, status, guest_token, dj_token')
      .eq('dj_token', djToken)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });

    const valid = await verifyDjAuth(req, event.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' });

    // Fetch wishlist sorted by request_count desc
    const { data: wishlist } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('event_id', event.id)
      .order('request_count', { ascending: false });

    const { pin_hash, ...safeEvent } = event;
    res.json({ event: safeEvent, wishlist: wishlist || [] });
  } catch (err) {
    console.error('DJ dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Mark event as finished (DJ)
router.put('/dashboard/:djToken/finish', async (req, res) => {
  const { djToken } = req.params;

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, pin_hash')
      .eq('dj_token', djToken)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });

    const valid = await verifyDjAuth(req, event.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' });

    const { error: updateError } = await supabase
      .from('events')
      .update({ status: 'finished' })
      .eq('id', event.id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Event marked as finished' });
  } catch (err) {
    console.error('Finish event error:', err);
    res.status(500).json({ error: 'Failed to finish event' });
  }
});

// Delete event (DJ, requires PIN or master key)
router.delete('/dashboard/:djToken', async (req, res) => {
  const { djToken } = req.params;

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, pin_hash')
      .eq('dj_token', djToken)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });

    const valid = await verifyDjAuth(req, event.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' });

    // Delete related data first
    await supabase.from('event_votes').delete().eq('event_id', event.id);
    await supabase.from('wishlist_requests').delete().eq('event_id', event.id);
    await supabase.from('wishlist_items').delete().eq('event_id', event.id);

    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', event.id);

    if (deleteError) throw deleteError;

    res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Get event for guests (public)
router.get('/:guestToken', async (req, res) => {
  const { guestToken } = req.params;

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, event_name, description, dj_name, event_date, venue, status, guest_token')
      .eq('guest_token', guestToken)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });

    res.json({ event });
  } catch (err) {
    console.error('Get event error:', err);
    res.status(500).json({ error: 'Failed to load event' });
  }
});

// Get wishlist for guests
router.get('/:guestToken/wishlist', async (req, res) => {
  const { guestToken } = req.params;
  const ip = getClientIp(req);

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id')
      .eq('guest_token', guestToken)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });

    const { data: wishlist } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('event_id', event.id)
      .order('request_count', { ascending: false });

    // Get which items this IP has already requested
    const { data: myRequests } = await supabase
      .from('wishlist_requests')
      .select('itunes_track_id')
      .eq('event_id', event.id)
      .eq('ip_address', ip);

    const myRequestedIds = new Set((myRequests || []).map(r => String(r.itunes_track_id)));

    const wishlistWithFlags = (wishlist || []).map(item => ({
      ...item,
      alreadyRequested: myRequestedIds.has(String(item.itunes_track_id)),
    }));

    res.json({ wishlist: wishlistWithFlags });
  } catch (err) {
    console.error('Get wishlist error:', err);
    res.status(500).json({ error: 'Failed to load wishlist' });
  }
});

// Add song to wishlist (or increment request count)
router.post('/:guestToken/wishlist', async (req, res) => {
  const { guestToken } = req.params;
  const { trackId, title, artist, album, releaseYear, artworkUrl } = req.body;
  const ip = getClientIp(req);

  if (!trackId || !title || !artist) {
    return res.status(400).json({ error: 'trackId, title, and artist are required' });
  }

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, status')
      .eq('guest_token', guestToken)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });
    if (event.status === 'finished') {
      return res.status(403).json({ error: 'This event has ended. Requests are closed.' });
    }

    // Check if this IP already requested this song for this event
    const { data: existingRequest } = await supabase
      .from('wishlist_requests')
      .select('id')
      .eq('event_id', event.id)
      .eq('itunes_track_id', trackId)
      .eq('ip_address', ip)
      .maybeSingle();

    if (existingRequest) {
      return res.status(409).json({ error: 'You already requested this song', alreadyRequested: true });
    }

    // Check if song is already on wishlist
    const { data: existingItem } = await supabase
      .from('wishlist_items')
      .select('id, request_count')
      .eq('event_id', event.id)
      .eq('itunes_track_id', trackId)
      .maybeSingle();

    let wishlistItem;

    if (existingItem) {
      // Increment request count
      const { data: updated, error: updateErr } = await supabase
        .from('wishlist_items')
        .update({ request_count: existingItem.request_count + 1 })
        .eq('id', existingItem.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      wishlistItem = updated;
    } else {
      // Add new song to wishlist
      const { data: newItem, error: insertErr } = await supabase
        .from('wishlist_items')
        .insert({
          event_id: event.id,
          itunes_track_id: trackId,
          title,
          artist,
          album: album || null,
          release_year: releaseYear || null,
          artwork_url: artworkUrl || null,
          request_count: 1,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      wishlistItem = newItem;
    }

    // Record the request from this IP
    await supabase
      .from('wishlist_requests')
      .insert({
        event_id: event.id,
        itunes_track_id: trackId,
        ip_address: ip,
      });

    res.json({ success: true, wishlistItem });
  } catch (err) {
    console.error('Add to wishlist error:', err);
    res.status(500).json({ error: 'Failed to add song to wishlist' });
  }
});

// Get post-event votes
router.get('/:guestToken/votes', async (req, res) => {
  const { guestToken } = req.params;
  const ip = getClientIp(req);

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, status, event_name, dj_name, event_date, venue')
      .eq('guest_token', guestToken)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });
    if (event.status !== 'finished') {
      return res.status(403).json({ error: 'Voting is only available after the event ends' });
    }

    // Get all wishlist items
    const { data: wishlist } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('event_id', event.id)
      .order('request_count', { ascending: false });

    // Get all votes for this event
    const { data: votes } = await supabase
      .from('event_votes')
      .select('itunes_track_id, rating')
      .eq('event_id', event.id);

    // Get this IP's votes
    const { data: myVotes } = await supabase
      .from('event_votes')
      .select('itunes_track_id, rating')
      .eq('event_id', event.id)
      .eq('ip_address', ip);

    const myVoteMap = {};
    (myVotes || []).forEach(v => { myVoteMap[String(v.itunes_track_id)] = v.rating; });

    // Build vote stats per track
    const voteStats = {};
    (votes || []).forEach(v => {
      const id = String(v.itunes_track_id);
      if (!voteStats[id]) voteStats[id] = { total: 0, count: 0 };
      voteStats[id].total += v.rating;
      voteStats[id].count += 1;
    });

    const wishlistWithVotes = (wishlist || []).map(item => {
      const id = String(item.itunes_track_id);
      const stats = voteStats[id] || { total: 0, count: 0 };
      return {
        ...item,
        averageRating: stats.count > 0 ? Math.round((stats.total / stats.count) * 10) / 10 : null,
        totalVotes: stats.count,
        userRating: myVoteMap[id] || null,
      };
    });

    res.json({ event, wishlist: wishlistWithVotes });
  } catch (err) {
    console.error('Get votes error:', err);
    res.status(500).json({ error: 'Failed to load votes' });
  }
});

// Submit a vote for a song in a finished event
router.post('/:guestToken/votes', async (req, res) => {
  const { guestToken } = req.params;
  const { trackId, rating } = req.body;
  const ip = getClientIp(req);

  if (!trackId || !rating || rating < 1 || rating > 10) {
    return res.status(400).json({ error: 'trackId and rating (1-10) are required' });
  }

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, status')
      .eq('guest_token', guestToken)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });
    if (event.status !== 'finished') {
      return res.status(403).json({ error: 'Voting is only open after the event ends' });
    }

    // Ensure the song is on the wishlist
    const { data: wishlistItem } = await supabase
      .from('wishlist_items')
      .select('id')
      .eq('event_id', event.id)
      .eq('itunes_track_id', trackId)
      .maybeSingle();

    if (!wishlistItem) {
      return res.status(404).json({ error: 'This song is not on the event wishlist' });
    }

    // Upsert vote (one per IP per song per event)
    const { error: voteError } = await supabase
      .from('event_votes')
      .upsert(
        {
          event_id: event.id,
          itunes_track_id: trackId,
          ip_address: ip,
          rating: Number(rating),
        },
        { onConflict: 'event_id,itunes_track_id,ip_address' }
      );

    if (voteError) throw voteError;

    // Return updated stats for this track
    const { data: votes } = await supabase
      .from('event_votes')
      .select('rating')
      .eq('event_id', event.id)
      .eq('itunes_track_id', trackId);

    const totalVotes = votes.length;
    const avgRating = totalVotes > 0
      ? votes.reduce((sum, v) => sum + v.rating, 0) / totalVotes
      : null;

    res.json({
      success: true,
      averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      totalVotes,
      userRating: Number(rating),
    });
  } catch (err) {
    console.error('Submit vote error:', err);
    res.status(500).json({ error: 'Failed to submit vote' });
  }
});

export default router;
