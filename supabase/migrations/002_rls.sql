-- Row Level Security, access helpers, vector search and storage policies.

create or replace function auth_org() returns uuid
language sql stable security definer set search_path = public as
$$ select org_id from profiles where id = auth.uid() and is_active $$;

create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() and is_active $$;

create or replace function can_read_document(d documents) returns boolean
language sql stable security definer set search_path = public as $$
  select d.org_id = auth_org() and (
    auth_role() = 'admin'
    or d.owner_id = auth.uid()
    or (auth_role() = 'hr_manager')
    or (auth_role() = 'employee' and d.sensitivity = 'standard' and d.category <> 'HR')
  )
$$;

alter table organizations   enable row level security;
alter table profiles        enable row level security;
alter table documents       enable row level security;
alter table document_chunks enable row level security;
alter table chat_queries    enable row level security;
alter table audit_logs      enable row level security;
alter table notifications   enable row level security;
alter table search_history  enable row level security;
alter table rate_limits     enable row level security;  -- no policies: service role only

create policy org_read on organizations for select using (id = auth_org());
create policy org_admin_update on organizations for update
  using (id = auth_org() and auth_role() = 'admin');

create policy profiles_read on profiles for select
  using (org_id = auth_org() and (auth_role() in ('admin','hr_manager') or id = auth.uid()));
create policy profiles_self_update on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
create policy profiles_admin_update on profiles for update
  using (org_id = auth_org() and auth_role() = 'admin');

create policy docs_select on documents for select using (can_read_document(documents));
create policy docs_insert on documents for insert with check (
  org_id = auth_org() and owner_id = auth.uid()
  and (sensitivity = 'standard' or auth_role() in ('hr_manager','admin'))
);
create policy docs_delete on documents for delete using (
  org_id = auth_org() and (owner_id = auth.uid() or auth_role() = 'admin')
);

create policy chunks_select on document_chunks for select using (
  exists (select 1 from documents d where d.id = document_id and can_read_document(d))
);

create policy chat_own on chat_queries for select
  using (user_id = auth.uid() or (org_id = auth_org() and auth_role() = 'admin'));
create policy notif_own on notifications for all using (user_id = auth.uid());
create policy search_own on search_history for all using (user_id = auth.uid());

create policy audit_admin_read on audit_logs for select
  using (org_id = auth_org() and auth_role() = 'admin');

-- Vector search runs as the caller (security invoker), so RLS applies. Replaced in 005 with a better threshold.
create or replace function match_chunks(
  query_embedding vector(1536), match_count int default 6, min_similarity float default 0.30
) returns table (chunk_id uuid, document_id uuid, title text, content text, similarity float)
language sql stable security invoker as $$
  select c.id, c.document_id, d.title, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from document_chunks c join documents d on d.id = c.document_id
  where 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count
$$;

-- Private bucket; files live at {org_id}/{user_id}/{file}
insert into storage.buckets (id, name, public) values ('documents','documents', false)
  on conflict do nothing;
create policy storage_read on storage.objects for select using (
  bucket_id = 'documents' and exists (
    select 1 from documents d where d.file_path = name and can_read_document(d))
);
create policy storage_insert on storage.objects for insert with check (
  bucket_id = 'documents' and (storage.foldername(name))[1] = auth_org()::text
  and (storage.foldername(name))[2] = auth.uid()::text
);
