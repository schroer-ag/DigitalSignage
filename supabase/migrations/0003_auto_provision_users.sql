-- Anyone who successfully signs in with an allowed-domain Google account
-- gets a public.users row automatically, default role 'user'. Promoting
-- someone to super_admin happens afterward from the admin Users page (or,
-- for the bootstrap account, via the SUPER_ADMIN_EMAILS break-glass env
-- var checked in app code, so the first super admin never has to be
-- hand-inserted into the database).

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
