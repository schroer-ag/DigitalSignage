-- Adds the heartbeat column the display page (Phase 4) stamps on every
-- content poll, so the admin screen list (Phase 2) can compute online vs.
-- offline without a separate monitoring job.

alter table public.screens
  add column if not exists last_seen_at timestamptz;

create index if not exists screens_last_seen_at_idx
  on public.screens (last_seen_at);

comment on column public.screens.last_seen_at is
  'Stamped by the display page on every poll. A screen is "online" in the UI when this is within the last couple of poll intervals; older (or null) reads as offline.';
