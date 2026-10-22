-- LOCAL TEST FIXTURE ONLY. Never apply this file to a Supabase project.
-- PGlite provides real PostgreSQL grants/RLS/functions, but not GoTrue, PostgREST,
-- Storage HTTP, its byte/type enforcement, CDN, mail, or JWT signature verification.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create schema storage;
create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,owner_id text,metadata jsonb,unique(bucket_id,name));
alter table storage.objects enable row level security;
grant usage on schema storage to anon,authenticated;
grant select,insert,update,delete on storage.objects to anon,authenticated;
create function storage.allow_any_operation(operations text[]) returns boolean language sql stable as $$
  select coalesce(current_setting('test.storage_operation',true)=any(operations),false);
$$;
-- Reproduce permissive Supabase defaults, so production SQL must revoke them.
alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;
