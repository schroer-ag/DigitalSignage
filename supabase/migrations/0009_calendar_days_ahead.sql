-- Lets a Calendar Agenda asset pick its own window instead of a fixed 30
-- days. Harmless on image/video/website assets -- they just carry an
-- unused default.

alter table public.assets
  add column if not exists days_ahead integer not null default 30 check (days_ahead > 0 and days_ahead <= 90);
