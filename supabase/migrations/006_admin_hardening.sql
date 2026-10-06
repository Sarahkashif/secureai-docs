-- Phase 5: admin features + security hardening. Run after 005.

-- 1) Invited users join the inviter's organization. Uses app_metadata, which only the service role can set
--    (user_metadata is user-editable at signup and must never decide org or role).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_role user_role;
begin
  v_org := nullif(new.raw_app_meta_data->>'org_id', '')::uuid;
  if v_org is not null and exists (select 1 from organizations where id = v_org) then
    v_role := coalesce(nullif(new.raw_app_meta_data->>'role', ''), 'employee')::user_role;
    insert into profiles (id, org_id, full_name, department, role)
      values (new.id, v_org, left(new.raw_user_meta_data->>'full_name', 100),
              left(new.raw_user_meta_data->>'department', 100), v_role);
  else
    insert into organizations (name)
      values (coalesce(nullif(left(trim(new.raw_user_meta_data->>'org_name'), 100), ''), 'My Organization'))
      returning id into v_org;
    insert into profiles (id, org_id, full_name, role)
      values (new.id, v_org, left(new.raw_user_meta_data->>'full_name', 100), 'admin');
  end if;
  return new;
end $$;

-- 2) Profiles: users may edit ONLY their own name and department. Role, org and active flag change through /api/admin.
drop policy if exists profiles_self_update on profiles;
drop policy if exists profiles_admin_update on profiles;
revoke update on profiles from anon, authenticated;
grant update (full_name, department) on profiles to authenticated;
create policy profiles_self_update on profiles for update
  using (id = auth.uid() and is_active) with check (id = auth.uid());

-- 3) Organizations: the plan can no longer be edited from the browser (it changes through /api/admin).
drop policy if exists org_admin_update on organizations;
revoke update, insert, delete on organizations from anon, authenticated;

-- 4) Plans are public reference data: readable by everyone, writable by no one.
alter table plans enable row level security;
create policy plans_read on plans for select using (true);
revoke insert, update, delete on plans from anon, authenticated;

-- 5) Dashboard totals computed under the caller's RLS (so counts only include documents they may read).
create or replace function dashboard_stats() returns jsonb
language sql stable security invoker as $$
  select jsonb_build_object(
    'documents', count(*),
    'storage_bytes', coalesce(sum(size_bytes), 0),
    'by_category', coalesce(
      (select jsonb_object_agg(category, n)
         from (select category, count(*) n from documents group by category) c), '{}'::jsonb)
  ) from documents
$$;

-- 6) Contact form: anyone may insert (length-checked), nobody may read through the API.
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 5 and 200),
  message text not null check (char_length(message) between 10 and 2000),
  created_at timestamptz not null default now()
);
alter table contact_messages enable row level security;
revoke all on contact_messages from anon, authenticated;
grant insert on contact_messages to anon, authenticated;
create policy contact_insert on contact_messages for insert to anon, authenticated with check (true);
