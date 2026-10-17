create table if not exists public.emergency_broadcast (
  id integer primary key default 1,
  active boolean not null default false,
  message text,
  activated_by uuid references public.users (id),
  activated_at timestamptz,
  constraint emergency_broadcast_singleton check (id = 1)
);

insert into public.emergency_broadcast (id, active)
values (1, false)
on conflict (id) do nothing;

alter table public.emergency_broadcast enable row level security;

comment on table public.emergency_broadcast is
  'Singleton row (id is always 1). When active, every /display page shows message instead of its assigned page, overriding screen_assignments entirely. RLS is enabled with no policies yet -- same deferred-policies gap as every other table; the public /display read path goes through the service-role client (src/lib/supabase/service.ts), which bypasses it.';
