-- Rate The Music — Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- Global song ratings
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS song_ratings (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  itunes_track_id bigint NOT NULL,
  title         text    NOT NULL,
  artist        text    NOT NULL,
  album         text,
  release_year  text,
  artwork_url   text,
  ip_address    text    NOT NULL,
  rating        integer NOT NULL CHECK (rating >= 1 AND rating <= 10),
  created_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS song_ratings_ip_track
  ON song_ratings (itunes_track_id, ip_address);

-- ─────────────────────────────────────────
-- DJ Events
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name    text    NOT NULL,
  dj_name       text    NOT NULL,
  event_date    date    NOT NULL,
  venue         text    NOT NULL,
  pin_hash      text    NOT NULL,
  guest_token   uuid    NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  dj_token      uuid    NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status        text    NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'finished')),
  created_at    timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- Wishlist items for each event
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist_items (
  id              uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id        uuid    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  itunes_track_id bigint  NOT NULL,
  title           text    NOT NULL,
  artist          text    NOT NULL,
  album           text,
  release_year    text,
  artwork_url     text,
  request_count   integer NOT NULL DEFAULT 1,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (event_id, itunes_track_id)
);

-- ─────────────────────────────────────────
-- Tracks which IPs requested which songs (one per IP per song per event)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist_requests (
  id              uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id        uuid    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  itunes_track_id bigint  NOT NULL,
  ip_address      text    NOT NULL,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (event_id, itunes_track_id, ip_address)
);

-- ─────────────────────────────────────────
-- Post-event votes for songs on the wishlist (legacy, no longer used)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_votes (
  id              uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id        uuid    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  itunes_track_id bigint  NOT NULL,
  ip_address      text    NOT NULL,
  rating          integer NOT NULL CHECK (rating >= 1 AND rating <= 10),
  created_at      timestamptz DEFAULT now(),
  UNIQUE (event_id, itunes_track_id, ip_address)
);

-- ─────────────────────────────────────────
-- Post-event event ratings (1–5 stars + comment)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_ratings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  stars      integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment    text NOT NULL CHECK (char_length(comment) >= 1 AND char_length(comment) <= 100),
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, ip_address)
);

-- ─────────────────────────────────────────
-- Row Level Security (RLS)
-- The backend uses the service role key, so RLS won't block it.
-- Enable RLS to prevent direct client access.
-- ─────────────────────────────────────────
ALTER TABLE song_ratings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_votes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_ratings    ENABLE ROW LEVEL SECURITY;

-- No public access policies — all access goes through the backend API
-- using the service role key which bypasses RLS.

-- ─────────────────────────────────────────
-- DJ reply to guest rating comments
-- ─────────────────────────────────────────
ALTER TABLE event_ratings ADD COLUMN IF NOT EXISTS dj_reply text;

-- ─────────────────────────────────────────
-- DJ notifications for live events
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  message    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE event_notifications ENABLE ROW LEVEL SECURITY;
