import express from 'express';
import supabase from '../db/supabase.js';

const router = express.Router();

function requireMasterKey(req, res, next) {
  const key = req.headers['x-master-key'];
  if (!key || key !== process.env.MASTER_KEY) {
    return res.status(401).json({ error: 'Invalid master key' });
  }
  next();
}

// List all events
router.get('/events', requireMasterKey, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, event_name, dj_name, event_date, venue, status, guest_token, dj_token, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ events: data || [] });
  } catch (err) {
    console.error('Admin list events error:', err);
    res.status(500).json({ error: 'Failed to load events' });
  }
});

// Delete any event by id
router.delete('/events/:eventId', requireMasterKey, async (req, res) => {
  const { eventId } = req.params;

  try {
    await supabase.from('event_votes').delete().eq('event_id', eventId);
    await supabase.from('wishlist_requests').delete().eq('event_id', eventId);
    await supabase.from('wishlist_items').delete().eq('event_id', eventId);

    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete event error:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
