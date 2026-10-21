-- SPONSOR CMS UPGRADE: REVIEW ONLY / UNAPPLIED.
-- Not a Supabase CLI-generated migration. Do not run automatically or remotely.
-- Requires explicit approval for the exact client-owned target and security changes.
-- For an existing pre-sponsor CMS only. Fresh setups use schema/cms.sql instead.
-- Preserve existing memberships, content, revision history, grants and private assets.
begin;

alter table public.content_drafts drop constraint content_drafts_type_check;
alter table public.content_drafts add constraint content_drafts_type_check
  check (type in ('page','post','founder','testimonial','episode','category','sponsor'));

create or replace function cms_private.valid_sponsor_destination(p_src text) returns boolean
language sql immutable security invoker set search_path = '' as $$
  select coalesce(length(p_src) between 1 and 2000
    and p_src ~ '^https://[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+([/?#][A-Za-z0-9._~!$&()*+,;=:@%/?#-]*)?$'
    and p_src !~ '[[:space:][:cntrl:]\\]'
    and p_src !~ '%($|[^0-9A-Fa-f]|[0-9A-Fa-f]($|[^0-9A-Fa-f]))', false);
$$;

create or replace function cms_private.validate_document(p_type text, p_data jsonb, p_publishing boolean default false) returns boolean
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
    when 'sponsor' then v_allowed := array['placement','enabled','name','imageSrc','imageAlt','destinationUrl','targeting','episodeId']; v_required := array['placement','enabled','targeting'];
    else raise exception using errcode = 'PT400', message = 'Unknown content type.';
  end case;
  if p_type='sponsor' and not (p_data ?& v_allowed) then
    raise exception using errcode='PT400', message='All sponsor fields are required; use false and empty strings for an incomplete draft.';
  end if;
  for v_key, v_value in select key, value from jsonb_each(p_data) loop
    if not (v_key = any(v_allowed)) then
      raise exception using errcode = 'PT400', message = 'Unsupported content field: ' || v_key;
    end if;
    if p_type='sponsor' and v_key='enabled' then
      if jsonb_typeof(v_value) <> 'boolean' then raise exception using errcode='PT400', message='Sponsor enabled must be a boolean.'; end if;
      continue;
    end if;
    if v_key = 'tags' then
      if jsonb_typeof(v_value) <> 'array' then raise exception using errcode='PT400', message='Tags must be an array.'; end if;
      if jsonb_array_length(v_value) > 20 or exists (
        select 1 from jsonb_array_elements(v_value) t(value)
        where jsonb_typeof(t.value) <> 'string' or (t.value #>> '{}') ~ '^[[:space:]]*$' or length(t.value #>> '{}') > 60
      ) then raise exception using errcode='PT400', message='Use up to 20 nonempty tags, each at most 60 characters.'; end if;
      continue;
    end if;
    if p_type <> 'sponsor' and v_value = 'null'::jsonb and not (v_key = any(v_required)) then continue; end if;
    if jsonb_typeof(v_value) <> 'string' then raise exception using errcode='PT400', message='Content field must be text: ' || v_key; end if;
    v_max := case v_key
      when 'body' then 40000 when 'bio' then 20000 when 'story' then 20000 when 'quote' then 10000
      when 'description' then case when p_type='episode' then 10000 else 1000 end
      when 'homeQuote' then 1000 when 'destinationUrl' then 2000 when 'episodeId' then 100 when 'imageSrc' then 2000 when 'imageAlt' then 500 when 'youtubeUrl' then 2000
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
  if p_type='sponsor' then
    if p_data->>'placement' not in ('home','episode') then raise exception using errcode='PT400', message='Choose a supported sponsor placement.'; end if;
    if p_data->>'targeting' not in ('undecided','shared','episode') then raise exception using errcode='PT400', message='Choose supported sponsor targeting.'; end if;
    if p_data->>'placement'='home' and (p_data->>'targeting'<>'undecided' or p_data->>'episodeId'<>'') then
      raise exception using errcode='PT400', message='Homepage sponsors do not use episode targeting.';
    end if;
    if p_data->>'targeting'<>'episode' and p_data->>'episodeId'<>'' then
      raise exception using errcode='PT400', message='Only per-episode sponsors can specify an episode ID.';
    end if;
    if p_data->>'episodeId'<>'' and p_data->>'episodeId' !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$' then
      raise exception using errcode='PT400', message='Use a valid episode ID.';
    end if;
    if p_data->>'destinationUrl'<>'' and not cms_private.valid_sponsor_destination(p_data->>'destinationUrl') then
      raise exception using errcode='PT400', message='Use a full HTTPS sponsor destination without credentials, whitespace, or a custom port.';
    end if;
    if p_publishing and p_data->'enabled'='true'::jsonb then
      foreach v_key in array array['name','imageSrc','imageAlt','destinationUrl'] loop
        if p_data->>v_key ~ '^[[:space:]]*$' then raise exception using errcode='PT400', message='Enabled sponsor publication requires: ' || v_key; end if;
      end loop;
      if p_data->>'placement'='episode' and (p_data->>'targeting'='undecided' or (p_data->>'targeting'='episode' and p_data->>'episodeId'='')) then
        raise exception using errcode='PT400', message='Resolve episode targeting before publishing an enabled sponsor.';
      end if;
    end if;
  end if;
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

create or replace function cms_private.assert_sponsor_publication(p_id text,p_data jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if p_data->'enabled'<>'true'::jsonb then return; end if;
  if p_data->>'placement'='episode' and p_data->>'targeting'='episode' and not exists(
    select 1 from public.content_published p where p.id=p_data->>'episodeId' and p.type='episode'
  ) then raise exception using errcode='PT400', message='Publish the selected episode before enabling its sponsor.'; end if;
  if exists(
    select 1 from public.content_published p where p.type='sponsor' and p.id<>p_id and p.data->'enabled'='true'::jsonb
      and p.data->>'placement'=p_data->>'placement'
      and (p_data->>'placement'='home' or p_data->>'targeting'='shared' or p.data->>'targeting'='shared'
        or p.data->>'episodeId'=p_data->>'episodeId')
  ) then raise exception using errcode='PT400', message='An enabled published sponsor already occupies this placement. Disable or unpublish it first.'; end if;
end;
$$;

create or replace function cms_private.mutate_document(p_action text, p_id text, p_type text, p_data jsonb,
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
  if p_action='publish' and v_type='sponsor' then perform cms_private.assert_sponsor_publication(p_id,v_data); end if;
  if p_action='unpublish' and v_type='episode' and exists(
    select 1 from public.content_published p where p.type='sponsor' and p.data->'enabled'='true'::jsonb
      and p.data->>'placement'='episode' and p.data->>'targeting'='episode' and p.data->>'episodeId'=p_id
  ) then raise exception using errcode='PT400', message='Disable or unpublish this episode''s sponsors before unpublishing the episode.'; end if;
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

create or replace function public.cms_public_snapshot() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not cms_private.is_activated() then raise exception using errcode='PT503', message='CMS publication is not activated.'; end if;
  return jsonb_build_object('schemaVersion',1,'documents',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'type',p.type,'published',p.data) order by p.id)
    from public.content_published p where p.type <> 'sponsor' or p.data->'enabled'='true'::jsonb),'[]'::jsonb));
end;
$$;

drop policy cms_read_published on public.content_published;
create policy cms_read_published on public.content_published for select to anon, authenticated using (
  type <> 'sponsor' or data->'enabled'='true'::jsonb or (select cms_private.member_role()) is not null
);

drop policy cms_images_read_guard on storage.objects;
create policy cms_images_read_guard on storage.objects as restrictive for select to anon,authenticated using (
  bucket_id <> 'cms-images' or (
    (cms_private.member_role() is not null and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info','object.sign']))
    or (storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info']) and exists(
      select 1 from public.content_published p where p.data->>'imageSrc'='/api/media?path=' || storage.objects.name
        and (p.type <> 'sponsor' or p.data->'enabled'='true'::jsonb)
    ))
  )
);

drop policy cms_images_read on storage.objects;
create policy cms_images_read on storage.objects for select to anon,authenticated using (
  bucket_id='cms-images' and (
    (cms_private.member_role() is not null and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info','object.sign']))
    or (storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info']) and exists(
      select 1 from public.content_published p where p.data->>'imageSrc'='/api/media?path=' || storage.objects.name
        and (p.type <> 'sponsor' or p.data->'enabled'='true'::jsonb)
    ))
  )
);

-- New helpers are owner-only; authenticated callers use existing invoker RPCs.
revoke all on function cms_private.valid_sponsor_destination(text),cms_private.assert_sponsor_publication(text,jsonb)
  from public,anon,authenticated,service_role;
-- Recheck existing rows after replacing the immutable validation function.
alter table public.content_drafts drop constraint cms_valid_draft;
alter table public.content_drafts add constraint cms_valid_draft check (cms_private.validate_document(type,data,false));
alter table public.content_published drop constraint cms_valid_publication;
alter table public.content_published add constraint cms_valid_publication check (cms_private.validate_document(type,data,not baseline));

commit;
