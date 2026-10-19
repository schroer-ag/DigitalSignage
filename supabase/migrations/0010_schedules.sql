-- Schedules: timed overrides on top of a screen's manually-pushed page.
-- A schedule says "show this page on this screen" for either a recurring
-- weekly window (days + a time-of-day range) or a one-off date range.
-- Resolution (which schedule wins, and what happens with none active) lives
-- in src/lib/schedule-resolution.ts, used by both the kiosk content API and
-- this page's own "Live now" display -- not duplicated here in SQL.
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  screen_id uuid not null references public.screens (id) on delete cascade,
  page_id uuid not null references public.pages (id) on delete cascade,
  schedule_type text not null check (schedule_type in ('recurring', 'date_range')),
  -- Higher wins when two schedules are active for the same screen at the
  -- same time; ties break by whichever was created more recently.
  priority integer not null default 0,
  -- Recurring fields (set when schedule_type = 'recurring', null otherwise).
  -- 0=Sunday..6=Saturday, evaluated in the school's local (Central) time.
  days_of_week integer[],
  start_time time,
  end_time time,
  -- Date-range fields (set when schedule_type = 'date_range', null otherwise).
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedules_recurring_fields_check check (
    schedule_type <> 'recurring'
    or (
      days_of_week is not null
      and array_length(days_of_week, 1) > 0
      and start_time is not null
      and end_time is not null
      and start_time < end_time
    )
  ),
  constraint schedules_date_range_fields_check check (
    schedule_type <> 'date_range'
    or (starts_at is not null and ends_at is not null and starts_at < ends_at)
  )
);

create index if not exists schedules_screen_id_idx on public.schedules (screen_id);

alter table public.schedules enable row level security;

-- Same model as screen_assignments (0007): you can touch a schedule only if
-- you have org access to the page it schedules AND you've been granted
-- access to the screen it targets -- or you're a super admin.
create policy "schedules_select_org_access" on public.schedules
  for select to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.pages p
      where p.id = page_id and public.has_org_access(p.org)
    )
  );

create policy "schedules_insert_org_page_and_assigned_screen" on public.schedules
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
        where usa.screen_id = schedules.screen_id and usa.user_id = auth.uid()
      )
    )
  );

create policy "schedules_update_org_page_and_assigned_screen" on public.schedules
  for update to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.user_screen_access usa
      where usa.screen_id = schedules.screen_id and usa.user_id = auth.uid()
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
        where usa.screen_id = schedules.screen_id and usa.user_id = auth.uid()
      )
    )
  );

create policy "schedules_delete_org_page_and_assigned_screen" on public.schedules
  for delete to authenticated
  using (
    public.is_super_admin()
    or (
      exists (
        select 1 from public.pages p
        where p.id = page_id and public.has_org_access(p.org)
      )
      and exists (
        select 1 from public.user_screen_access usa
        where usa.screen_id = schedules.screen_id and usa.user_id = auth.uid()
      )
    )
  );
