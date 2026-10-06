-- Phase 3: ingestion pipeline support. Run after 003.

alter table documents add column if not exists chunk_count int not null default 0;
alter table documents add column if not exists error_message text;
create index if not exists document_chunks_document_idx on document_chunks (document_id);

-- Visibility rules (replaces the Phase 1 version).
--   admin / hr_manager : every document in their organization
--   anyone             : documents they uploaded
--   everyone else      : 'standard' documents outside the HR category
create or replace function can_read_document(d documents) returns boolean
language sql stable security definer set search_path = public as $$
  select d.org_id = auth_org() and (
    auth_role() in ('admin','hr_manager')
    or d.owner_id = auth.uid()
    or (d.sensitivity = 'standard' and d.category <> 'HR')
  )
$$;

-- Documents are now created ONLY by /api/ingest (service role), which validates the file,
-- enforces the plan limit and role rules, and indexes the content. Browsers can no longer insert rows directly.
drop policy if exists docs_insert on documents;

-- Backstop: the plan's document limit is also enforced inside the database.
create or replace function enforce_document_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int; cur int;
begin
  select p.max_documents into lim
    from organizations o join plans p on p.tier = o.plan where o.id = new.org_id;
  if lim is not null then
    select count(*) into cur from documents where org_id = new.org_id;
    if cur >= lim then
      raise exception 'Document limit reached for your plan (% documents).', lim using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists documents_limit on documents;
create trigger documents_limit before insert on documents
  for each row execute function enforce_document_limit();

-- Atomic fixed-window rate limiter used by the API (service role only).
create or replace function check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  insert into rate_limits as r (key, window_start, count) values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end,
    count        = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end
  returning r.count into v_count;
  return v_count <= p_max;
end $$;
revoke all on function check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function check_rate_limit(text, int, int) to service_role;
