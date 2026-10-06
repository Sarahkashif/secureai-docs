-- Phase 4: AI chat support. Run after 004.

alter table chat_queries add column if not exists sources jsonb not null default '[]';
alter table chat_queries add column if not exists found boolean;
alter table chat_queries add column if not exists latency_ms int;
create index if not exists chat_queries_user_idx on chat_queries (user_id, created_at desc);
create index if not exists chat_queries_org_idx  on chat_queries (org_id, created_at desc);

-- Same function as Phase 1, with a realistic default threshold.
-- Cosine similarity for text-embedding-3-small between a question and a relevant passage is usually 0.3 to 0.6,
-- so the Phase 1 default of 0.75 would have rejected almost every legitimate match.
-- Still security invoker: row level security filters chunks and documents to what the caller may read.
create or replace function match_chunks(
  query_embedding vector(1536), match_count int default 6, min_similarity float default 0.30
) returns table (chunk_id uuid, document_id uuid, title text, content text, similarity float)
language sql stable security invoker as $$
  select c.id, c.document_id, d.title, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from document_chunks c join documents d on d.id = c.document_id
  where d.status = 'ready'
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count
$$;
