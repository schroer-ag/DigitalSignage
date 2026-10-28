-- How long an asset stays on screen, as a per-asset default that pre-fills
-- (but can still be overridden) whenever it's added to a playlist, instead
-- of every playlist having to retype the same number for the same asset.
-- Not used for "video" -- a video plays to its own natural end (or the
-- 60s fallback in src/components/DisplayPlayer.tsx) regardless of this
-- value, so the Asset form hides the field for that kind.
alter table public.assets
  add column if not exists default_duration_seconds integer not null default 10
  check (default_duration_seconds > 0 and default_duration_seconds <= 300);
