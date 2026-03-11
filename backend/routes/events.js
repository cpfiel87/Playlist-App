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
      .select('id, event_name, dj_name, event_date, venue, status, guest_token, dj_token, created_at')
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
      .select('id, pin_hash, event_name, description, dj_name, event_date, venue, status, guest_token, dj_token, created_at')
      .eq('dj_token', djToken)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });

    const valid = await verifyDjAuth(req, event.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' });

    const { data: wishlist } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('event_id', event.id)
      .order('request_count', { ascending: false });

    // Fetch current notification for active events
    let notification = null;
    if (event.status === 'active') {
      const { data: notifData } = await supabase
        .from('event_notifications')
        .select('id, message, created_at')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      notification = notifData || null;
    }

    const { pin_hash, ...safeEvent } = event;
    res.json({ event: safeEvent, wishlist: wishlist || [], notification });
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

// Delete a rating comment (DJ only)
router.delete('/dashboard/:djToken/ratings/:ratingId', async (req, res) => {
  const { djToken, ratingId } = req.params;

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, pin_hash')
      .eq('dj_token', djToken)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });

    const valid = await verifyDjAuth(req, event.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' });

    const { error: deleteError } = await supabase
      .from('event_ratings')
      .delete()
      .eq('id', ratingId)
      .eq('event_id', event.id);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (err) {
    console.error('Delete rating error:', err);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
});

// Reply to a rating comment (DJ only)
router.patch('/dashboard/:djToken/ratings/:ratingId/reply', async (req, res) => {
  const { djToken, ratingId } = req.params;
  const { reply } = req.body;

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
      .from('event_ratings')
      .update({ dj_reply: reply && reply.trim() ? reply.trim() : null })
      .eq('id', ratingId)
      .eq('event_id', event.id);

    if (updateError) throw updateError;

    res.json({ success: true });
  } catch (err) {
    console.error('Reply to rating error:', err);
    res.status(500).json({ error: 'Failed to save reply' });
  }
});

// Post a notification for live event (DJ only)
router.post('/dashboard/:djToken/notification', async (req, res) => {
  const { djToken } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (message.trim().length > 280) {
    return res.status(400).json({ error: 'Message must be 280 characters or less' });
  }

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, pin_hash, status')
      .eq('dj_token', djToken)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });
    if (event.status !== 'active') return res.status(403).json({ error: 'Event is not active' });

    const valid = await verifyDjAuth(req, event.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' });

    // Delete existing notifications and insert new one
    await supabase.from('event_notifications').delete().eq('event_id', event.id);

    const { data: notif, error: insertError } = await supabase
      .from('event_notifications')
      .insert({ event_id: event.id, message: message.trim() })
      .select('id, message, created_at')
      .single();

    if (insertError) throw insertError;

    res.json({ success: true, notification: notif });
  } catch (err) {
    console.error('Post notification error:', err);
    res.status(500).json({ error: 'Failed to post notification' });
  }
});

// Clear notification (DJ only)
router.delete('/dashboard/:djToken/notification', async (req, res) => {
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

    await supabase.from('event_notifications').delete().eq('event_id', event.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Clear notification error:', err);
    res.status(500).json({ error: 'Failed to clear notification' });
  }
});

// Get event for guests (public)
router.get('/:guestToken', async (req, res) => {
  const { guestToken } = req.params;

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, event_name, description, dj_name, event_date, venue, status, guest_token, created_at')
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

    const { data: existingItem } = await supabase
      .from('wishlist_items')
      .select('id, request_count')
      .eq('event_id', event.id)
      .eq('itunes_track_id', trackId)
      .maybeSingle();

    let wishlistItem;

    if (existingItem) {
      const { data: updated, error: updateErr } = await supabase
        .from('wishlist_items')
        .update({ request_count: existingItem.request_count + 1 })
        .eq('id', existingItem.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      wishlistItem = updated;
    } else {
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

// Get current notification for active event (public)
router.get('/:guestToken/notification', async (req, res) => {
  const { guestToken } = req.params;

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, status')
      .eq('guest_token', guestToken)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });
    if (event.status !== 'active') return res.json({ notification: null });

    const { data: notif } = await supabase
      .from('event_notifications')
      .select('message, created_at')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    res.json({ notification: notif || null });
  } catch (err) {
    console.error('Get notification error:', err);
    res.status(500).json({ error: 'Failed to load notification' });
  }
});

// Get post-event event ratings
router.get('/:guestToken/ratings', async (req, res) => {
  const { guestToken } = req.params;
  const ip = getClientIp(req);

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, status')
      .eq('guest_token', guestToken)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });
    if (event.status !== 'finished') {
      return res.status(403).json({ error: 'Ratings are only available after the event ends' });
    }

    const { data: ratings } = await supabase
      .from('event_ratings')
      .select('id, stars, comment, created_at, ip_address, dj_reply')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false });

    const list = ratings || [];
    const avg = list.length > 0
      ? Math.round((list.reduce((s, r) => s + r.stars, 0) / list.length) * 10) / 10
      : null;
    const alreadyRated = list.some(r => r.ip_address === ip);
    const publicRatings = list.map(({ ip_address, ...r }) => r);

    res.json({ ratings: publicRatings, averageStars: avg, totalRatings: list.length, alreadyRated });
  } catch (err) {
    console.error('Get ratings error:', err);
    res.status(500).json({ error: 'Failed to load ratings' });
  }
});

// Submit a post-event event rating
router.post('/:guestToken/ratings', async (req, res) => {
  const { guestToken } = req.params;
  const { stars, comment } = req.body;
  const ip = getClientIp(req);

  if (!stars || stars < 1 || stars > 5 || !comment || comment.trim().length < 1 || comment.length > 100) {
    return res.status(400).json({ error: 'stars (1–5) and comment (1–100 chars) are required' });
  }

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, status')
      .eq('guest_token', guestToken)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });
    if (event.status !== 'finished') {
      return res.status(403).json({ error: 'Ratings are only available after the event ends' });
    }

    const { error: insertError } = await supabase
      .from('event_ratings')
      .insert({ event_id: event.id, ip_address: ip, stars: Number(stars), comment: comment.trim() });

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'You have already rated this event' });
      }
      console.error('Submit rating insert error:', insertError);
      return res.status(500).json({ error: insertError.message || 'Failed to submit rating' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Submit rating error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit rating' });
  }
});

export default router;
