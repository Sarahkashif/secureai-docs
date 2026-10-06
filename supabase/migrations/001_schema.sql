-- SecureAI Docs: schema. Run migrations 001 -> 006 in order, one file per run.
create extension if not exists vector;
create extension if not exists pgcrypto;

create type user_role as enum ('employee','hr_manager','admin');
create type doc_category as enum ('HR','Finance','Company Policies','Operations','Legal','General');
create type doc_sensitivity as enum ('standard','hr_confidential','salary');
create type plan_tier as enum ('free','basic','professional','enterprise');
create type doc_status as enum ('processing','ready','failed');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan plan_tier not null default 'free',
  created_at timestamptz not null default now()
);

create table plans (
  tier plan_tier primary key,
  price_usd int,                 -- null = custom
  max_documents int,             -- null = unlimited
  max_users int,                 -- null = unlimited
  features jsonb not null default '[]'
);
insert into plans values
 ('free', 0, 15, 1, '["Basic AI assistant","Standard search"]'),
 ('basic', 9, 100, 5, '["Faster AI search","Advanced organization"]'),
 ('professional', 29, 1000, null, '["Team collaboration","Analytics dashboard","Priority AI"]'),
 ('enterprise', null, null, null, '["Dedicated support","Advanced security","Custom integrations"]');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  org_id uuid not null references organizations on delete cascade,
  full_name text,
  department text,
  role user_role not null default 'employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  owner_id uuid not null references profiles on delete cascade,
  title text not null,
  file_path text not null,
  mime_type text not null check (mime_type in
    ('application/pdf',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'text/plain')),
  size_bytes bigint not null check (size_bytes <= 10485760),
  category doc_category not null default 'General',
  sensitivity doc_sensitivity not null default 'standard',
  status doc_status not null default 'processing',
  page_count int,
  created_at timestamptz not null default now()
);
create index on documents (org_id, category);
create index on documents using gin (to_tsvector('english', title));

create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents on delete cascade,
  org_id uuid not null,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);
create index on document_chunks using hnsw (embedding vector_cosine_ops);

create table chat_queries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid not null references profiles on delete cascade,
  question text not null,
  answer text,
  source_doc_ids uuid[] default '{}',
  was_denied boolean not null default false,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id bigint generated always as identity primary key,
  org_id uuid,
  user_id uuid,
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb default '{}',
  ip inet,
  created_at timestamptz not null default now()
);
create index on audit_logs (org_id, created_at desc);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  query text not null,
  created_at timestamptz not null default now()
);

create table rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 1
);

-- Replaced in 006 so invited users join the inviter's organization.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare new_org uuid;
begin
  insert into organizations (name)
    values (coalesce(new.raw_user_meta_data->>'org_name', 'My Organization'))
    returning id into new_org;
  insert into profiles (id, org_id, full_name, role)
    values (new.id, new_org, new.raw_user_meta_data->>'full_name', 'admin');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
