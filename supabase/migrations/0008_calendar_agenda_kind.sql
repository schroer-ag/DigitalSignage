-- assets.kind was locked to ('image','video','embed') by migration 0001,
-- from before 'calendar_agenda' existed as a kind. Every attempt to save
-- a Calendar Agenda asset has been silently rejected by this constraint
-- ever since -- find whatever Postgres auto-named it (rather than
-- guessing the name) and replace it with one that allows the new kind.

do $$
declare
  existing_constraint text;
begin
  select con.conname into existing_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'assets'
    and con.contype = 'c'
    and con.conname ilike '%kind%';

  if existing_constraint is not null then
    execute format('alter table public.assets drop constraint %I', existing_constraint);
  end if;
end $$;

alter table public.assets
  add constraint assets_kind_check check (kind in ('image', 'video', 'embed', 'calendar_agenda'));
