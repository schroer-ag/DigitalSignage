-- Top-level FFA / District split for assets and pages, so My Assets and My
-- Pages can group content by which org it belongs to (screens already have
-- this via branding_group). Existing rows default to 'ffa' since that's
-- where nearly everything created so far belongs; Matt re-tags anything
-- that's actually district content.

alter table public.assets
  add column if not exists org text not null default 'ffa' check (org in ('ffa', 'district'));

alter table public.pages
  add column if not exists org text not null default 'ffa' check (org in ('ffa', 'district'));

comment on column public.assets.org is 'Which org this asset belongs to -- drives the My Assets folder split.';
comment on column public.pages.org is 'Which org this page belongs to -- drives the My Pages folder split.';
