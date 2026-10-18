-- Folders (nested, within FFA/District) + shared org-based access.
--
-- Supersedes the owner-only RLS from 0005 on assets/pages: anyone with
-- access to an item's org (via the new user_org_access table) can see,
-- edit, or delete it -- not just whoever originally created it. A super
-- admin still manages who has access to which org, on the Users page.

create table if not exists public.user_org_access (
  user_id uuid not null references public.users (id) on delete cascade,
  org text not null check (org in ('ffa', 'district')),
  created_at timestamptz not null default now(),
  primary key (user_id, org)
);

-- Nested folders live inside one org -- a folder's children must share
-- its org (enforced in app code on create; the org never changes once a
-- folder has content, so this isn't re-checked in SQL).
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  org text not null check (org in ('ffa', 'district')),
  parent_id uuid references public.folders (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.assets
  add column if not exists folder_id uuid references public.folders (id) on delete set null;

alter table public.pages
  add column if not exists folder_id uuid references public.folders (id) on delete set null;

alter table public.user_org_access enable row level security;
alter table public.folders enable row level security;

-- Does the current user have access to this org (or is super admin)?
-- SECURITY DEFINER so it can read user_org_access regardless of that
-- table's own RLS, same pattern as is_super_admin().
create or replace function public.has_org_access(check_org text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_super_admin()
    or exists (
      select 1 from public.user_org_access uoa
      where uoa.user_id = auth.uid() and uoa.org = check_org
    );
$$;

-- user_org_access: a user can see their own rows (so the app can tell
-- them which orgs they're in); only a super admin can grant/revoke.
create policy "uoa_select_own_or_admin" on public.user_org_access
  for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());
create policy "uoa_insert_admin" on public.user_org_access
  for insert to authenticated with check (public.is_super_admin());
create policy "uoa_delete_admin" on public.user_org_access
  for delete to authenticated using (public.is_super_admin());

-- folders: shared within the org, same rule as assets/pages below.
create policy "folders_select_org_access" on public.folders
  for select to authenticated using (public.has_org_access(org));
create policy "folders_insert_org_access" on public.folders
  for insert to authenticated with check (public.has_org_access(org));
create policy "folders_update_org_access" on public.folders
  for update to authenticated using (public.has_org_access(org)) with check (public.has_org_access(org));
create policy "folders_delete_org_access" on public.folders
  for delete to authenticated using (public.has_org_access(org));

-- Replace the owner-only policies from 0005 on assets/pages.
drop policy if exists "assets_select_own_or_admin" on public.assets;
drop policy if exists "assets_insert_own" on public.assets;
drop policy if exists "assets_update_own" on public.assets;
drop policy if exists "assets_delete_own" on public.assets;

create policy "assets_select_org_access" on public.assets
  for select to authenticated using (public.has_org_access(org));
create policy "assets_insert_org_access" on public.assets
  for insert to authenticated with check (public.has_org_access(org));
create policy "assets_update_org_access" on public.assets
  for update to authenticated using (public.has_org_access(org)) with check (public.has_org_access(org));
create policy "assets_delete_org_access" on public.assets
  for delete to authenticated using (public.has_org_access(org));

drop policy if exists "pages_select_own_or_admin" on public.pages;
drop policy if exists "pages_insert_own" on public.pages;
drop policy if exists "pages_update_own" on public.pages;
drop policy if exists "pages_delete_own" on public.pages;

create policy "pages_select_org_access" on public.pages
  for select to authenticated using (public.has_org_access(org));
create policy "pages_insert_org_access" on public.pages
  for insert to authenticated with check (public.has_org_access(org));
create policy "pages_update_org_access" on public.pages
  for update to authenticated using (public.has_org_access(org)) with check (public.has_org_access(org));
create policy "pages_delete_org_access" on public.pages
  for delete to authenticated using (public.has_org_access(org));

-- screen_assignments' insert/update checked "do you own the page you're
-- pushing" -- now that pages are org-shared, that becomes "do you have
-- access to the page's org" instead.
drop policy if exists "sa_insert_owned_page_and_assigned_screen" on public.screen_assignments;
drop policy if exists "sa_update_owned_page_and_assigned_screen" on public.screen_assignments;

create policy "sa_insert_org_page_and_assigned_screen" on public.screen_assignments
  for insert to authenticated
  with check (
    public.is_super_admin()
    or (
      exists (
        select 1 from public.pages p
        where p.id = page_id and public.has_org_access(p.org)
      )
      and exists (
        select 1 from public.user_screen_access usa
        where usa.screen_id = screen_assignments.screen_id and usa.user_id = auth.uid()
      )
    )
  );

create policy "sa_update_org_page_and_assigned_screen" on public.screen_assignments
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
      exists (
        select 1 from public.pages p
        where p.id = page_id and public.has_org_access(p.org)
      )
      and exists (
        select 1 from public.user_screen_access usa
        where usa.screen_id = screen_assignments.screen_id and usa.user_id = auth.uid()
      )
    )
  );
