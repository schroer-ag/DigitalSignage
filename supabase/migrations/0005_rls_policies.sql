-- Real RLS policies, replacing the "enabled everywhere, zero policies"
-- placeholder from earlier phases. Until this runs, Postgres denies every
-- anon/authenticated read and write by default -- reads come back as
-- empty results (which looks identical to "there's just nothing here
-- yet"), writes fail outright. The public /display pages and their
-- polling API are unaffected either way: they go through the service-role
-- client (src/lib/supabase/service.ts), which bypasses RLS entirely.

-- A SECURITY DEFINER helper so policies can check "is the caller a super
-- admin" without re-triggering RLS on public.users for every check (which
-- would otherwise need its own careful policy to avoid recursion).
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'super_admin'
  );
$$;

-- users: a basic staff directory (needed for the assign-screen dropdown,
-- the users list, and resolving "activated by" on the broadcast page) --
-- any signed-in user can read it, but only a super admin can change a role.
create policy "users_select_authenticated" on public.users
  for select to authenticated
  using (true);

create policy "users_update_super_admin" on public.users
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- assets: owner-only, with a super-admin read-all for future admin views.
create policy "assets_select_own_or_admin" on public.assets
  for select to authenticated
  using (owner_id = auth.uid() or public.is_super_admin());

create policy "assets_insert_own" on public.assets
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "assets_update_own" on public.assets
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "assets_delete_own" on public.assets
  for delete to authenticated
  using (owner_id = auth.uid());

-- pages: owner-only, plus super-admin read-all (Phase 2: "view every
-- user's pages, regardless of assignment" -- also needed for the admin
-- Screens page's "now playing" column, which reads through
-- screen_assignments -> pages for screens the super admin doesn't own).
create policy "pages_select_own_or_admin" on public.pages
  for select to authenticated
  using (owner_id = auth.uid() or public.is_super_admin());

create policy "pages_insert_own" on public.pages
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "pages_update_own" on public.pages
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "pages_delete_own" on public.pages
  for delete to authenticated
  using (owner_id = auth.uid());

-- user_screen_access: a user can see their own grants; only a super admin
-- can create/change/remove one (assignUserToScreen is super-admin-only in
-- the app already -- this is the database enforcing the same rule).
create policy "usa_select_own_or_admin" on public.user_screen_access
  for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

create policy "usa_insert_admin" on public.user_screen_access
  for insert to authenticated
  with check (public.is_super_admin());

create policy "usa_update_admin" on public.user_screen_access
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "usa_delete_admin" on public.user_screen_access
  for delete to authenticated
  using (public.is_super_admin());

-- screens: a user can see screens they've been granted access to; a super
-- admin sees all of them. Only a super admin can register or edit one.
create policy "screens_select_assigned_or_admin" on public.screens
  for select to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.user_screen_access usa
      where usa.screen_id = screens.id and usa.user_id = auth.uid()
    )
  );

create policy "screens_insert_admin" on public.screens
  for insert to authenticated
  with check (public.is_super_admin());

create policy "screens_update_admin" on public.screens
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- screen_assignments: a user can push to a screen only if they own the
-- page AND have been granted that screen; a super admin can push anything
-- to anything (Phase 2's override). Mirrors the checks already in
-- src/app/my/pages/[id]/actions.ts's pushPageToScreen -- this is the
-- database enforcing the same rule, not a replacement for it.
create policy "sa_select_assigned_or_admin" on public.screen_assignments
  for select to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.user_screen_access usa
      where usa.screen_id = screen_assignments.screen_id and usa.user_id = auth.uid()
    )
  );

create policy "sa_insert_owned_page_and_assigned_screen" on public.screen_assignments
  for insert to authenticated
  with check (
    public.is_super_admin()
    or (
      exists (select 1 from public.pages p where p.id = page_id and p.owner_id = auth.uid())
      and exists (
        select 1 from public.user_screen_access usa
        where usa.screen_id = screen_assignments.screen_id and usa.user_id = auth.uid()
      )
    )
  );

create policy "sa_update_owned_page_and_assigned_screen" on public.screen_assignments
  for update to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.user_screen_access usa
      where usa.screen_id = screen_assignments.screen_id and usa.user_id = auth.uid()
    )
  )
  with check (
    public.is_super_admin()
    or (
      exists (select 1 from public.pages p where p.id = page_id and p.owner_id = auth.uid())
      and exists (
        select 1 from public.user_screen_access usa
        where usa.screen_id = screen_assignments.screen_id and usa.user_id = auth.uid()
      )
    )
  );

-- emergency_broadcast: super-admin only, both ways.
create policy "broadcast_select_admin" on public.emergency_broadcast
  for select to authenticated
  using (public.is_super_admin());

create policy "broadcast_update_admin" on public.emergency_broadcast
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());
