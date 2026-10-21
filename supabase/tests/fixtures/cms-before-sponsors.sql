-- LOCAL HISTORICAL TEST FIXTURE ONLY. Never apply this file remotely.
-- Inclusive Quest CMS security contract. REVIEW ONLY / UNAPPLIED.
-- No migration filename was invented: Supabase CLI is unavailable in this workspace.
-- Requires explicit database/security approval, migration generation and staging review.
-- Apply as the migration owner; never execute this through an application credential.
-- cms_private MUST NOT be a PostgREST exposed schema or extra search-path schema.
begin;

create schema cms_private;
revoke all on schema cms_private from public, anon, authenticated, service_role;
grant usage on schema cms_private to anon, authenticated;
alter default privileges in schema cms_private revoke execute on functions from public, anon, authenticated, service_role;

create table public.cms_members (
  user_id uuid primary key references auth.users(id),
  role text not null check (role in ('editor', 'publisher')),
  created_at timestamptz not null default now()
);
create table public.content_drafts (
  id text primary key check (id ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$'),
  type text not null check (type in ('page','post','founder','testimonial','episode','category')),
  schema_version integer not null default 1 check (schema_version = 1),
  data jsonb not null,
  revision bigint not null check (revision > 0),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
create unique index cms_draft_slug_unique on public.content_drafts(type, (data->>'slug')) where data ? 'slug';
create table public.content_published (
  id text primary key references public.content_drafts(id),
  type text not null,
  schema_version integer not null default 1 check (schema_version = 1),
  data jsonb not null,
  revision bigint not null check (revision > 0),
  baseline boolean not null default false,
  published_at timestamptz not null default now()
);
create unique index cms_published_slug_unique on public.content_published(type, (data->>'slug')) where data ? 'slug';
create table public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references public.content_drafts(id),
  revision bigint not null,
  action text not null check (action in ('initialize','save','publish','unpublish','restore')),
  data jsonb not null,
  actor uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(document_id, revision)
);
create index cms_revision_history on public.content_revisions(document_id, revision desc);
create table public.cms_assets (
  path text primary key,
  storage_object_id uuid not null unique,
  owner_id uuid not null references auth.users(id),
  content_type text not null check (content_type in ('image/jpeg','image/png','image/webp')),
  size_bytes bigint not null check (size_bytes between 1 and 4000000),
  created_at timestamptz not null default now()
);
-- Idempotency receipts are not exposed, even to staff; all replays recheck live membership.
create table cms_private.operations (
  actor uuid not null references auth.users(id),
  operation_id uuid not null,
  request jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(actor, operation_id)
);
create table cms_private.state (
  singleton boolean primary key default true check (singleton),
  -- Only the exact reviewed baseline initialization may activate the CMS.
  activated boolean not null default false
);
insert into cms_private.state(singleton) values (true);

create function cms_private.member_role() returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.cms_members m where m.user_id = (select auth.uid());
$$;
create function cms_private.require_member(p_publish boolean default false) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_role text; v_actor uuid := auth.uid();
begin
  -- The row lock prevents membership revocation from racing a running mutation.
  select m.role into v_role from public.cms_members m where m.user_id = v_actor for share;
  if v_actor is null or v_role is null or (p_publish and v_role <> 'publisher') then
    raise exception using errcode = 'PT403', message = 'Current CMS membership does not permit this action.';
  end if;
  return v_actor;
end;
$$;
create function cms_private.valid_asset_path(p_path text) returns boolean
language sql immutable security invoker set search_path = '' as $$
  select coalesce(p_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$', false);
$$;
create function cms_private.valid_upload_metadata(p_path text,p_metadata jsonb) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare v_mime text := p_metadata->>'mimetype'; v_size text := p_metadata->>'size';
begin
  if v_size is null or v_size !~ '^[0-9]{1,10}$' then return false; end if;
  return coalesce(v_size::bigint between 1 and 4000000 and (
    (v_mime='image/jpeg' and p_path ~ '\.jpg$') or (v_mime='image/png' and p_path ~ '\.png$') or (v_mime='image/webp' and p_path ~ '\.webp$')
  ),false);
end;
$$;
create function cms_private.valid_image_src(p_src text) returns boolean
language sql immutable security invoker set search_path = '' as $$
  select coalesce(p_src = '' or p_src in ('/inclusive-quest-logo.png','/she-wears-the-pants.svg','/founder-photo.jpg')
    or (left(p_src, 16) = '/api/media?path=' and cms_private.valid_asset_path(substr(p_src, 17))), false);
$$;
create function cms_private.valid_media_src(p_src text) returns boolean
language sql immutable security invoker set search_path = '' as $$
  select p_src is null or p_src = '' or p_src = '/sample-captions.vtt'
    or (length(p_src) <= 2000 and p_src ~ '^https://[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+(/[A-Za-z0-9._~!$&()*+,;=:@%/?#-]*)?$'
      and p_src !~ '[[:space:]\\]');
$$;
create function cms_private.validate_document(p_type text, p_data jsonb, p_publishing boolean default false) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare v_allowed text[]; v_required text[]; v_key text; v_value jsonb; v_max integer; v_text text;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 200000 then
    raise exception using errcode = 'PT400', message = 'Content must be an object smaller than 200 KB.';
  end if;
  case p_type
    when 'page' then v_allowed := array['title','slug','heading','subtitle','body','imageSrc','imageAlt']; v_required := array['title','slug','heading','body'];
    when 'post' then v_allowed := array['title','slug','excerpt','body','template','imageSrc','imageAlt']; v_required := array['title','slug','excerpt','body','template'];
    when 'founder' then v_allowed := array['name','title','bio','story','homeQuote','imageSrc','imageAlt']; v_required := array['name','title','bio','story','homeQuote'];
    when 'testimonial' then v_allowed := array['name','title','quote']; v_required := array['name','quote'];
    when 'episode' then v_allowed := array['title','episodeTitle','description','category','youtubeUrl','tags','mainVideoSrc','aslVideoSrc','captionsSrc','duration','badge','interpreter','imageSrc','imageAlt']; v_required := array['title','episodeTitle','description','category','tags'];
    when 'category' then v_allowed := array['name','slug','description']; v_required := array['name','slug'];
    else raise exception using errcode = 'PT400', message = 'Unknown content type.';
  end case;
  for v_key, v_value in select key, value from jsonb_each(p_data) loop
    if not (v_key = any(v_allowed)) then
      raise exception using errcode = 'PT400', message = 'Unsupported content field: ' || v_key;
    end if;
    if v_key = 'tags' then
      if jsonb_typeof(v_value) <> 'array' then raise exception using errcode='PT400', message='Tags must be an array.'; end if;
      if jsonb_array_length(v_value) > 20 or exists (
        select 1 from jsonb_array_elements(v_value) t(value)
        where jsonb_typeof(t.value) <> 'string' or (t.value #>> '{}') ~ '^[[:space:]]*$' or length(t.value #>> '{}') > 60
      ) then raise exception using errcode='PT400', message='Use up to 20 nonempty tags, each at most 60 characters.'; end if;
      continue;
    end if;
    if v_value = 'null'::jsonb and not (v_key = any(v_required)) then continue; end if;
    if jsonb_typeof(v_value) <> 'string' then raise exception using errcode='PT400', message='Content field must be text: ' || v_key; end if;
    v_max := case v_key
      when 'body' then 40000 when 'bio' then 20000 when 'story' then 20000 when 'quote' then 10000
      when 'description' then case when p_type='episode' then 10000 else 1000 end
      when 'homeQuote' then 1000 when 'imageSrc' then 2000 when 'imageAlt' then 500 when 'youtubeUrl' then 2000
      when 'mainVideoSrc' then 2000 when 'aslVideoSrc' then 2000 when 'captionsSrc' then 2000
      when 'excerpt' then 500 when 'heading' then 200 when 'subtitle' then 300 when 'episodeTitle' then 220
      when 'slug' then 100 when 'category' then 100 when 'duration' then 100
      when 'name' then case when p_type='category' then 100 else 160 end else 160 end;
    if length(v_value #>> '{}') > v_max then raise exception using errcode='PT400', message='Content field is too long: ' || v_key; end if;
  end loop;
  foreach v_key in array v_required loop
    if not (p_data ? v_key) or p_data->v_key = 'null'::jsonb or (v_key <> 'tags' and (p_data->>v_key) ~ '^[[:space:]]*$') then
      raise exception using errcode='PT400', message='Required field is empty: ' || v_key;
    end if;
  end loop;
  if p_data ? 'slug' and (p_data->>'slug') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception using errcode='PT400', message='Invalid slug.'; end if;
  if p_type='post' and p_data->>'template' not in ('story','announcement','interview') then raise exception using errcode='PT400', message='Unknown post template.'; end if;
  v_text := coalesce(p_data->>'youtubeUrl','');
  if v_text <> '' and v_text !~ '^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$' then
    raise exception using errcode='PT400', message='YouTube URL must be a canonical HTTPS watch URL with an 11-character video ID.';
  end if;
  if not cms_private.valid_image_src(coalesce(p_data->>'imageSrc','')) then raise exception using errcode='PT400', message='Use an approved bundled image or a registered CMS image path.'; end if;
  if coalesce(p_data->>'imageSrc','') <> '' and coalesce(p_data->>'imageAlt','') ~ '^[[:space:]]*$' then raise exception using errcode='PT400', message='Image alternative text is required.'; end if;
  foreach v_key in array array['mainVideoSrc','aslVideoSrc','captionsSrc'] loop
    if not cms_private.valid_media_src(p_data->>v_key) then raise exception using errcode='PT400', message='Invalid media URL: ' || v_key; end if;
  end loop;
  if p_publishing and p_type='episode' and v_text='' and (coalesce(p_data->>'mainVideoSrc','')='' or coalesce(p_data->>'aslVideoSrc','')='') then
    raise exception using errcode='PT400', message='An episode needs YouTube or both approved main and interpreter media before publication.';
  end if;
  return true;
end;
$$;
alter table public.content_drafts add constraint cms_valid_draft check (cms_private.validate_document(type, data, false));
alter table public.content_published add constraint cms_valid_publication check (cms_private.validate_document(type, data, not baseline));

alter table public.cms_members enable row level security;
alter table public.content_drafts enable row level security;
alter table public.content_published enable row level security;
alter table public.content_revisions enable row level security;
alter table public.cms_assets enable row level security;
alter table cms_private.operations enable row level security;
alter table cms_private.state enable row level security;
revoke all on public.cms_members, public.content_drafts, public.content_published, public.content_revisions, public.cms_assets,
  cms_private.operations, cms_private.state from public, anon, authenticated, service_role;
grant select on public.cms_members, public.content_drafts, public.content_revisions, public.cms_assets to authenticated;
grant select on public.content_published to anon, authenticated;
create policy cms_members_read_self on public.cms_members for select to authenticated using (user_id=(select auth.uid()));
create policy cms_staff_read_drafts on public.content_drafts for select to authenticated using ((select cms_private.member_role()) is not null);
create policy cms_staff_read_revisions on public.content_revisions for select to authenticated using ((select cms_private.member_role()) is not null);
create policy cms_staff_read_assets on public.cms_assets for select to authenticated using ((select cms_private.member_role()) is not null);
create policy cms_read_published on public.content_published for select to anon, authenticated using (true);
-- No client INSERT/UPDATE/DELETE grants or policies exist on any CMS table.

create function cms_private.document_json(p_id text) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('id',d.id,'type',d.type,'draft',d.data,'published',p.data,'revision',d.revision,'updatedAt',d.updated_at)
  from public.content_drafts d left join public.content_published p on p.id=d.id where d.id=p_id;
$$;
create function public.cms_session() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select case when cms_private.member_role() is null then null else
    jsonb_build_object('user',jsonb_build_object('id',auth.uid()),'role',cms_private.member_role()) end;
$$;
create function public.cms_list_documents() returns jsonb
language plpgsql security invoker set search_path = '' as $$
begin
  perform cms_private.require_member(false);
  return coalesce((select jsonb_agg(cms_private.document_json(d.id) order by d.id) from public.content_drafts d),'[]'::jsonb);
end;
$$;
create function public.cms_get_revisions(p_id text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
begin
  perform cms_private.require_member(false);
  return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'action',r.action,'createdAt',r.created_at,'actor',r.actor,'data',r.data,'revision',r.revision) order by r.revision desc)
    from public.content_revisions r where r.document_id=p_id),'[]'::jsonb);
end;
$$;
create function cms_private.is_activated() returns boolean
language sql stable security definer set search_path = '' as $$
  select activated from cms_private.state where singleton;
$$;
create function public.cms_public_snapshot() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not cms_private.is_activated() then raise exception using errcode='PT503', message='CMS publication is not activated.'; end if;
  return jsonb_build_object('schemaVersion',1,'documents',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'type',p.type,'published',p.data) order by p.id)
    from public.content_published p),'[]'::jsonb));
end;
$$;

-- Budget the exact public schemaVersion/documents envelope in UTF-8 bytes.
-- PostgreSQL JSONB text includes whitespace, making this conservative compared
-- with the compact HTTP JSON response. Called after the attempted write while
-- the global write lock is held; a failure rolls back the entire mutation.
create function cms_private.assert_snapshot_budget() returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if pg_catalog.octet_length(pg_catalog.convert_to(public.cms_public_snapshot()::text,'UTF8')) > 3500000 then
    raise exception using errcode='PT400', message='Published website content exceeds the 3,500,000-byte limit. Shorten content or unpublish another document, then try again.';
  end if;
end;
$$;

create function cms_private.assert_registered_image(p_data jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_src text := coalesce(p_data->>'imageSrc','');
begin
  if left(v_src,16)='/api/media?path=' and not exists (
    select 1 from public.cms_assets a join storage.objects o on o.id=a.storage_object_id and o.bucket_id='cms-images' and o.name=a.path
    where a.path=substr(v_src,17) and o.owner_id=a.owner_id::text
      and o.metadata->>'mimetype'=a.content_type and (o.metadata->>'size')::bigint=a.size_bytes
  ) then raise exception using errcode='PT400', message='Upload and register this image before saving or publishing it.'; end if;
end;
$$;
-- Append-only even for the function owner. No maintenance deletion or history rewrite API.
create function cms_private.reject_revision_change() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin raise exception using errcode='PT403', message='CMS revision history is append-only.'; end;
$$;
create trigger cms_revision_immutable before update or delete on public.content_revisions for each row execute function cms_private.reject_revision_change();

create function cms_private.mutate_document(p_action text, p_id text, p_type text, p_data jsonb,
  p_expected_revision bigint, p_operation_id uuid, p_revision_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_request jsonb; v_old cms_private.operations%rowtype; v_draft public.content_drafts%rowtype;
  v_data jsonb; v_type text; v_result jsonb; v_revision bigint; v_constraint text;
begin
  if p_action not in ('save','publish','unpublish','restore') or p_action is null then raise exception using errcode='PT400', message='Unknown CMS action.'; end if;
  v_actor := cms_private.require_member(p_action in ('publish','unpublish'));
  if p_id is null or p_id !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$' or p_operation_id is null or p_expected_revision is null or p_expected_revision < 0 then
    raise exception using errcode='PT400', message='Valid document ID, operation UUID, and expected revision are required.';
  end if;
  v_request := jsonb_build_object('action',p_action,'id',p_id,'type',p_type,'data',p_data,'expectedRevision',p_expected_revision,'revisionId',p_revision_id);
  perform pg_advisory_xact_lock(hashtextextended('cms-op:' || v_actor::text || ':' || p_operation_id::text,0));
  -- Serialize writes across the small (250-record maximum) CMS, including count and slug checks.
  perform pg_advisory_xact_lock(hashtextextended('inclusive-quest-cms-write',0));
  if not cms_private.is_activated() then raise exception using errcode='PT503', message='Initialize the reviewed public baseline before editing CMS content.'; end if;
  select * into v_old from cms_private.operations where actor=v_actor and operation_id=p_operation_id;
  if found then
    if v_old.request <> v_request then raise exception using errcode='PT409', message='Operation ID was already used for a different request.'; end if;
    return v_old.result || jsonb_build_object('replayed',true);
  end if;
  select * into v_draft from public.content_drafts where id=p_id for update;
  if not found then
    if p_action <> 'save' then raise exception using errcode='PT404', message='Document not found.'; end if;
    if p_expected_revision <> 0 then raise exception using errcode='PT409', message='Document revision changed. Reload before saving.'; end if;
    if (select count(*) from public.content_drafts) >= 250 then raise exception using errcode='PT400', message='The CMS supports at most 250 documents.'; end if;
    v_revision := 1; v_type := p_type; v_data := p_data;
  else
    if v_draft.revision <> p_expected_revision then raise exception using errcode='PT409', message='Document revision changed. Reload before continuing.'; end if;
    if p_action='save' and p_type is distinct from v_draft.type then raise exception using errcode='PT400', message='An existing content type cannot change.'; end if;
    v_revision := v_draft.revision+1; v_type := v_draft.type; v_data := case when p_action='save' then p_data else v_draft.data end;
  end if;
  if p_action='restore' then
    select r.data into v_data from public.content_revisions r where r.id=p_revision_id and r.document_id=p_id;
    if not found then raise exception using errcode='PT404', message='Revision not found for this document.'; end if;
  end if;
  perform cms_private.validate_document(v_type,v_data,p_action='publish');
  if p_action <> 'unpublish' then perform cms_private.assert_registered_image(v_data); end if;
  insert into public.content_drafts(id,type,data,revision,updated_by,updated_at)
    values(p_id,v_type,v_data,v_revision,v_actor,now())
    on conflict(id) do update set data=excluded.data,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
  if p_action='publish' then
    insert into public.content_published(id,type,data,revision,published_at) values(p_id,v_type,v_data,v_revision,now())
      on conflict(id) do update set data=excluded.data,revision=excluded.revision,baseline=false,published_at=excluded.published_at;
    perform cms_private.assert_snapshot_budget();
  elsif p_action='unpublish' then
    delete from public.content_published where id=p_id;
  end if;
  insert into public.content_revisions(document_id,revision,action,data,actor) values(p_id,v_revision,p_action,v_data,v_actor);
  v_result := jsonb_build_object('document',cms_private.document_json(p_id),'replayed',false);
  insert into cms_private.operations(actor,operation_id,request,result) values(v_actor,p_operation_id,v_request,v_result);
  return v_result;
exception when unique_violation then
  get stacked diagnostics v_constraint = constraint_name;
  if v_constraint in ('cms_draft_slug_unique','cms_published_slug_unique') then
    raise exception using errcode='PT400', message='A document in this section already uses that slug.';
  end if;
  raise;
end;
$$;
create function public.cms_save_draft(p_id text,p_type text,p_data jsonb,p_expected_revision bigint,p_operation_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$ select cms_private.mutate_document('save',p_id,p_type,p_data,p_expected_revision,p_operation_id); $$;
create function public.cms_publish(p_id text,p_expected_revision bigint,p_operation_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$ select cms_private.mutate_document('publish',p_id,null,null,p_expected_revision,p_operation_id); $$;
create function public.cms_unpublish(p_id text,p_expected_revision bigint,p_operation_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$ select cms_private.mutate_document('unpublish',p_id,null,null,p_expected_revision,p_operation_id); $$;
create function public.cms_restore_revision(p_id text,p_revision_id uuid,p_expected_revision bigint,p_operation_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$ select cms_private.mutate_document('restore',p_id,null,null,p_expected_revision,p_operation_id,p_revision_id); $$;

create function cms_private.register_asset(p_path text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := cms_private.require_member(false); v_object storage.objects%rowtype; v_mime text; v_size bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('inclusive-quest-cms-write',0));
  if not cms_private.is_activated() then raise exception using errcode='PT503', message='Initialize the reviewed public baseline before uploading CMS images.'; end if;
  if not cms_private.valid_asset_path(p_path) or split_part(p_path,'/',1) <> v_actor::text then raise exception using errcode='PT400', message='Invalid immutable upload path.'; end if;
  select * into v_object from storage.objects where bucket_id='cms-images' and name=p_path and owner_id=v_actor::text for share;
  if not found then raise exception using errcode='PT404', message='Your uploaded image was not found.'; end if;
  v_mime := v_object.metadata->>'mimetype';
  if coalesce(v_object.metadata->>'size','') !~ '^[0-9]{1,10}$' then raise exception using errcode='PT400', message='Upload size metadata is missing or invalid.'; end if;
  v_size := (v_object.metadata->>'size')::bigint;
  if not cms_private.valid_upload_metadata(p_path,v_object.metadata) then
    raise exception using errcode='PT400', message='Upload a matching JPEG, PNG, or WebP image of at most 4,000,000 bytes.';
  end if;
  insert into public.cms_assets(path,storage_object_id,owner_id,content_type,size_bytes) values(p_path,v_object.id,v_actor,v_mime,v_size) on conflict(path) do nothing;
  if not exists(select 1 from public.cms_assets where path=p_path and storage_object_id=v_object.id and owner_id=v_actor and content_type=v_mime and size_bytes=v_size) then
    raise exception using errcode='PT409', message='This asset path was registered with different metadata.';
  end if;
  return jsonb_build_object('path',p_path,'imageSrc','/api/media?path=' || p_path,'contentType',v_mime,'sizeBytes',v_size);
end;
$$;
create function public.cms_register_asset(p_path text) returns jsonb
language sql security invoker set search_path = '' as $$ select cms_private.register_asset(p_path); $$;

-- Exact current public-site baseline, canonicalized by removing legacy episode id/poster.
-- Initialization is deliberately separate from draft import and requires operator approval.
create function cms_private.baseline_documents() returns jsonb
language sql immutable security invoker set search_path = '' as $baseline$
  select $data$[
  {
    "id": "category-podcast",
    "type": "category",
    "data": {
      "name": "Podcast",
      "slug": "podcast",
      "description": "Podcast conversations."
    }
  },
  {
    "id": "founder-alma",
    "type": "founder",
    "data": {
      "name": "Alma Beaty",
      "title": "Founder & CEO",
      "bio": "Alma Beaty is the Founder and CEO of Inclusive Quest — a platform built to close the gap between the podcast world and the 1.5 billion Deaf and Hard of Hearing people it has yet to reach.\n\nA dual U.S. and Sierra Leonean citizen, Alma placed in the Top 10 at the 2026 Entrepreneur of Impact competition — the only Deaf or Hard of Hearing founder in the room.\n\nShe writes, she builds, she advocates. She has learned to find humor in the face of adversity while finding solutions that are often hidden in plain sight.\n\nShe has also learned to deliberately ignore outside noise, critics, and naysayers.\n\nHer philosophy is simple: access for one is access for all.",
      "story": "My why began when I realized that life doesn't discriminate. Humans do — consciously or not.\n\nGrowing up, I watched my neighbor's daughter, no older than 7 or 8, play by herself. Excluded from activities. Excluded from conversations. Forced to stay home while the rest of us went to school. To get her attention, people would shout at her. I watched all of this as a child — and even then, with full hearing, I felt a pain I couldn't yet put into words.\n\nLittle did I know that one day I'd be in her shoes.\n\nExcluded from activities. Excluded from conversations. Shouted at. The world kept evolving — but very little of that evolution made room for the Deaf and Hard-of-Hearing community.\n\nPodcasts are one of the largest educational and entertainment platforms available to anyone. But not everyone.\n\nInclusive Quest exists to change that. To build the bridge that should have always been there. To make sure that no child — and no adult — ever has to sit on the outside of a conversation again.",
      "homeQuote": "To build the bridge that should have always been there.",
      "imageSrc": "/founder-photo.jpg",
      "imageAlt": "Inclusive Quest founder"
    }
  },
  {
    "id": "page-about",
    "type": "page",
    "data": {
      "title": "About",
      "slug": "about",
      "heading": "About Inclusive Quest",
      "subtitle": "",
      "body": "Imagine walking past a world full of conversations you can see but never join. The content is right there — in plain sight. But no one built the bridge to let you in.\n\nThat's the daily reality for Deaf and Hard of Hearing people who have been excluded from podcast conversations.\n\nInclusive Quest (IQ) is that bridge.\n\nWe make podcasts accessible through integrated Sign Language interpretation, clear captions, transcripts, and ways to discover relevant conversations.\n\nIQ works with platforms and podcasters to make every story easier to see, understand, and share.\n\nAccess is the product. Inclusion is the mission.",
      "imageSrc": "",
      "imageAlt": ""
    }
  },
  {
    "id": "page-home",
    "type": "page",
    "data": {
      "title": "Home",
      "slug": "home",
      "heading": "Accessible Podcasts.",
      "subtitle": "See Every Story. See Every Voice.",
      "body": "Explore the podcast world through Sign Language interpretation, captions, transcripts, and topic-based discovery — with DHH audiences at the center.",
      "imageSrc": "",
      "imageAlt": ""
    }
  },
  {
    "id": "page-mission",
    "type": "page",
    "data": {
      "title": "Mission Statement",
      "slug": "mission",
      "heading": "Mission Statement",
      "subtitle": "",
      "body": "Inclusive Quest exists to make every podcast accessible to the Deaf and Hard of Hearing community — through live sign language interpretation, captions, and transcripts, built directly into the listening experience.",
      "imageSrc": "",
      "imageAlt": ""
    }
  },
  {
    "id": "page-values",
    "type": "page",
    "data": {
      "title": "Our Values",
      "slug": "values",
      "heading": "Our Values",
      "subtitle": "",
      "body": "Access is Non-Negotiable. Every person deserves to fully experience the content that moves, educates, and connects the world, regardless of level of Deafness, language, or location. We don't add accessibility as an afterthought. We build from it.",
      "imageSrc": "",
      "imageAlt": ""
    }
  },
  {
    "id": "page-vision",
    "type": "page",
    "data": {
      "title": "Vision Statement",
      "slug": "vision",
      "heading": "Vision Statement",
      "subtitle": "",
      "body": "A world where accessibility isn't an afterthought. Where every platform and creator's content reaches every listener, in every language — signed or spoken. That's the standard Inclusive Quest is building toward.",
      "imageSrc": "",
      "imageAlt": ""
    }
  },
  {
    "id": "she-wears-the-pants",
    "type": "episode",
    "data": {
      "title": "She Wears the Pants",
      "episodeTitle": "Calling All Women in Business: How to Stop Overthinking and Start Taking Smarter Risks",
      "category": "Podcast",
      "duration": "Episode preview",
      "badge": "Sign Language + Captions",
      "mainVideoSrc": null,
      "aslVideoSrc": null,
      "captionsSrc": null,
      "description": "Conversations that help women in business move past overthinking and take smarter risks. Accessible playback coming soon.",
      "youtubeUrl": "",
      "imageSrc": "/she-wears-the-pants.svg",
      "imageAlt": "She Wears the Pants podcast artwork",
      "tags": []
    }
  },
  {
    "id": "testimonial-1",
    "type": "testimonial",
    "data": {
      "name": "James McGowan",
      "title": "Deaf Educator",
      "quote": "I was born hearing and became Deaf between 2 and 3 years old due to a high fever.  I remembered that I grew up, and I did not receive the closed caption from the media which is why language deprivation had an impact on my life. I grew up in deaf institutions. My teachers knew American Sign Language and provided the captions on but I didn't understand the English so the teachers had to interpret what the videos being said. I grew up wishing we had the caption and sign language at the same time. I never enjoyed watching podcasts generally because I never understood what they were saying or they added captions that I was not familiar with the terminology.\nMy good friend Alma Beaty the founder, is founding the Inclusive Quest and is changing how Deaf people like myself access platforms like Podcasts. I have always wanted to learn about various options such as business, tiny houses, travels, but there’s no podcast out there accessible in my language to teach me these things. Now with Inclusive Quest, I will have access to educational information that my hearing peers have access to. Deaf and Hard of Hearing people are not behind. We’re simply left behind in a world that is always changing. I do enjoy reading captions. But podcasts in my language; American Sign Language is something that will change my life and the lives of millions of Deaf and Hard of Hearing people. Inclusive Quest is going to change that."
    }
  },
  {
    "id": "testimonial-2",
    "type": "testimonial",
    "data": {
      "name": "Juliana Vadala",
      "title": "Certified ASL Interpreter",
      "quote": "As a professional ASL interpreter who enjoys discussing and sharing media with Deaf friends- the elephant in the room is that we can’t share podcasts or even discuss them because there is a glaring disparity- podcasts are inaccessible to Deaf individuals. While everyone has noticed this disparity no one has taken up the mantle to provide the Deaf community access to podcasts like Inclusive Quest.\n\n‘But podcasts have transcripts now- isn’t that enough?’ Simply put, it’s not enough. Deaf Americans’ primary language is American Sign Language not written English. To make podcasts accessible to the Deaf community, they need to be interpreted into ASL.\n\nAlma Beaty has identified this massive inequality and has worked tirelessly to bridge the gap. This is an important venture to include the Deaf community in the news, updates, conversations and entertainment the rest of the world enjoys via podcasts. Admirable and necessary, Inclusive Quest is making podcasts accessible one clip at a time."
    }
  },
  {
    "id": "testimonial-3",
    "type": "testimonial",
    "data": {
      "name": "Y.S.",
      "title": "Law Student",
      "quote": "I used to take podcasts for granted — commuting, cooking, relaxing. Then I learned that 1.5 billion Deaf and Hard of Hearing people are entirely cut off from that world. Inclusive Quest isn’t just a company. It’s a movement toward a future where no one is left unheard or unseen."
    }
  }
]$data$::jsonb;
$baseline$;
create function cms_private.initialize(p_documents jsonb,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := cms_private.require_member(true); v_request jsonb; v_old cms_private.operations%rowtype;
  v_documents jsonb; v_item jsonb; v_result jsonb;
begin
  if p_operation_id is null or p_documents is null or jsonb_typeof(p_documents)<>'array' then raise exception using errcode='PT400', message='Baseline documents and operation UUID are required.'; end if;
  if jsonb_array_length(p_documents)>250 then raise exception using errcode='PT400', message='The CMS supports at most 250 documents.'; end if;
  select jsonb_agg(value order by value->>'id') into v_documents from jsonb_array_elements(p_documents);
  if v_documents is distinct from cms_private.baseline_documents() then
    raise exception using errcode='PT400', message='Initialization accepts only the reviewed bundled baseline. Import other changes as drafts.';
  end if;
  v_request := jsonb_build_object('action','initialize','documents',v_documents);
  perform pg_advisory_xact_lock(hashtextextended('cms-op:' || v_actor::text || ':' || p_operation_id::text,0));
  select * into v_old from cms_private.operations where actor=v_actor and operation_id=p_operation_id;
  if found then
    if v_old.request <> v_request then raise exception using errcode='PT409', message='Operation ID was already used for a different request.'; end if;
    return v_old.result || jsonb_build_object('replayed',true);
  end if;
  perform pg_advisory_xact_lock(hashtextextended('inclusive-quest-cms-write',0));
  if exists(select 1 from public.content_drafts) or cms_private.is_activated() then raise exception using errcode='PT409', message='CMS has already been initialized or edited.'; end if;
  for v_item in select value from jsonb_array_elements(v_documents) loop
    perform cms_private.validate_document(v_item->>'type',v_item->'data',false);
    perform cms_private.assert_registered_image(v_item->'data');
    insert into public.content_drafts(id,type,data,revision,updated_by) values(v_item->>'id',v_item->>'type',v_item->'data',1,v_actor);
    -- Baseline preserves the existing public placeholder episode. Every subsequent publish
    -- clears baseline and applies the stricter playable-media check.
    insert into public.content_published(id,type,data,revision,baseline) values(v_item->>'id',v_item->>'type',v_item->'data',1,true);
    insert into public.content_revisions(document_id,revision,action,data,actor) values(v_item->>'id',1,'initialize',v_item->'data',v_actor);
  end loop;
  update cms_private.state set activated=true where singleton;
  perform cms_private.assert_snapshot_budget();
  select jsonb_build_object('documents',jsonb_agg(cms_private.document_json(d.id) order by d.id),'replayed',false) into v_result from public.content_drafts d;
  insert into cms_private.operations(actor,operation_id,request,result) values(v_actor,p_operation_id,v_request,v_result);
  return v_result;
end;
$$;
create function public.cms_initialize(p_documents jsonb,p_operation_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$ select cms_private.initialize(p_documents,p_operation_id); $$;

-- One PRIVATE bucket. If it already exists, abort rather than silently change its security.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('cms-images','cms-images',false,4000000,array['image/jpeg','image/png','image/webp']);
-- Restrictive guard prevents future broad permissive policies from accidentally exposing this bucket.
-- Staff can request short-lived signed previews. Anonymous callers can only
-- download an exact published reference; listing and signing remain denied.
create policy cms_images_read_guard on storage.objects as restrictive for select to anon,authenticated using (
  bucket_id <> 'cms-images' or (
    (cms_private.member_role() is not null and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info','object.sign']))
    or (storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info']) and exists(
      select 1 from public.content_published p where p.data->>'imageSrc'='/api/media?path=' || storage.objects.name
    ))
  )
);
create policy cms_images_read on storage.objects for select to anon,authenticated using (
  bucket_id='cms-images' and (
    (cms_private.member_role() is not null and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info','object.sign']))
    or (storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info']) and exists(
      select 1 from public.content_published p where p.data->>'imageSrc'='/api/media?path=' || storage.objects.name
    ))
  )
);
create policy cms_images_insert_guard on storage.objects as restrictive for insert to anon,authenticated with check (
  bucket_id <> 'cms-images' or (cms_private.is_activated() and cms_private.member_role() is not null and owner_id=(select auth.uid())::text
    and split_part(name,'/',1)=(select auth.uid())::text and cms_private.valid_asset_path(name))
);
create policy cms_images_insert on storage.objects for insert to authenticated with check (
  bucket_id='cms-images' and cms_private.is_activated() and cms_private.member_role() is not null and owner_id=(select auth.uid())::text
  and split_part(name,'/',1)=(select auth.uid())::text and cms_private.valid_asset_path(name)
);
create policy cms_images_no_update on storage.objects as restrictive for update to anon,authenticated using (bucket_id <> 'cms-images') with check (bucket_id <> 'cms-images');
create policy cms_images_no_delete on storage.objects as restrictive for delete to anon,authenticated using (bucket_id <> 'cms-images');

-- Explicit ACLs: Supabase may otherwise grant function EXECUTE to API roles by default.
revoke all on all functions in schema cms_private from public,anon,authenticated,service_role;
grant execute on function cms_private.member_role(),cms_private.is_activated() to anon,authenticated;
grant execute on function cms_private.valid_asset_path(text) to authenticated;
grant execute on function cms_private.require_member(boolean),cms_private.document_json(text),
  cms_private.mutate_document(text,text,text,jsonb,bigint,uuid,uuid),cms_private.register_asset(text),cms_private.initialize(jsonb,uuid) to authenticated;
revoke all on function public.cms_session(),public.cms_list_documents(),public.cms_get_revisions(text),public.cms_public_snapshot(),
  public.cms_save_draft(text,text,jsonb,bigint,uuid),public.cms_publish(text,bigint,uuid),public.cms_unpublish(text,bigint,uuid),
  public.cms_restore_revision(text,uuid,bigint,uuid),public.cms_register_asset(text),public.cms_initialize(jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.cms_session(),public.cms_list_documents(),public.cms_get_revisions(text),
  public.cms_save_draft(text,text,jsonb,bigint,uuid),public.cms_publish(text,bigint,uuid),public.cms_unpublish(text,bigint,uuid),
  public.cms_restore_revision(text,uuid,bigint,uuid),public.cms_register_asset(text),public.cms_initialize(jsonb,uuid) to authenticated;
grant execute on function public.cms_public_snapshot() to anon,authenticated;

commit;
