-- Phase 1 core data model: users, screens, assets, pages, and the
-- assignment/access tables that tie them together.

create extension if not exists "pgcrypto";

-- Mirrors auth.users; role drives what the UI/API lets someone do.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null default 'user' check (role in ('super_admin', 'user')),
  created_at timestamptz not null default now()
);

-- A physical display. branding_group picks the color scheme a page renders with.
create table if not exists public.screens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  building text,
  branding_group text not null default 'district' check (branding_group in ('ffa', 'district')),
  created_at timestamptz not null default now()
);

-- One row per user allowed to touch a screen (assigned by a super admin).
create table if not exists public.user_screen_access (
  user_id uuid not null references public.users (id) on delete cascade,
  screen_id uuid not null references public.screens (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, screen_id)
);

-- An uploaded image/video, or a link treated as content (external site, video URL).
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('image', 'video', 'embed')),
  url text not null,
  label text,
  created_at timestamptz not null default now()
);

-- A page is an ordered, looping playlist of assets. items is the ordered
-- list of {asset_id, duration_seconds} -- kept as jsonb for Phase 1 so the
-- shape can evolve before it's locked into a join table.
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Which page is currently live on which screen. One row per screen.
create table if not exists public.screen_assignments (
  screen_id uuid primary key references public.screens (id) on delete cascade,
  page_id uuid references public.pages (id) on delete set null,
  assigned_by uuid references public.users (id),
  pushed_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.screens enable row level security;
alter table public.user_screen_access enable row level security;
alter table public.assets enable row level security;
alter table public.pages enable row level security;
alter table public.screen_assignments enable row level security;

-- Policies land in a follow-up migration once the role model's enforced in
-- app code too -- Phase 1 just needs the shape in place.
