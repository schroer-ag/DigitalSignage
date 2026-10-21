-- Supabase is changing how new tables get Data API access: starting
-- Oct 30 2026, a table created in the "public" schema no longer
-- automatically gets a grant for supabase-js/PostgREST/GraphQL to reach it
-- -- that grant has to be explicit now, in the same migration that creates
-- the table. This migration adds those grants for every table this project
-- already has (existing tables keep whatever grant they had, so this is a
-- belt-and-suspenders no-op for them today, not a fix for something
-- broken) -- and from here on, every new `create table` migration should
-- include its own grant block like the ones below, right alongside it.
--
-- RLS is what actually decides who can touch which rows -- this is the
-- separate, lower-level "is this role allowed to hit this table through
-- the API at all" switch PostgREST checks first. `authenticated` is every
-- signed-in user (RLS narrows further); `service_role` is the kiosk's
-- server-only client (src/lib/supabase/service.ts), which bypasses RLS
-- entirely and needs its own grant regardless of any policy.
grant select, insert, update, delete on table public.users to authenticated;
grant all on table public.users to service_role;

grant select, insert, update, delete on table public.screens to authenticated;
grant all on table public.screens to service_role;

grant select, insert, update, delete on table public.user_screen_access to authenticated;
grant all on table public.user_screen_access to service_role;

grant select, insert, update, delete on table public.assets to authenticated;
grant all on table public.assets to service_role;

grant select, insert, update, delete on table public.pages to authenticated;
grant all on table public.pages to service_role;

grant select, insert, update, delete on table public.screen_assignments to authenticated;
grant all on table public.screen_assignments to service_role;

grant select, insert, update, delete on table public.emergency_broadcast to authenticated;
grant all on table public.emergency_broadcast to service_role;

grant select, insert, update, delete on table public.user_org_access to authenticated;
grant all on table public.user_org_access to service_role;

grant select, insert, update, delete on table public.folders to authenticated;
grant all on table public.folders to service_role;

grant select, insert, update, delete on table public.schedules to authenticated;
grant all on table public.schedules to service_role;
