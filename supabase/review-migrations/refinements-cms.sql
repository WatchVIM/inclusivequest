-- CONTENT REFINEMENTS UPGRADE: REVIEW ONLY / UNAPPLIED.
-- Review patch, not a Supabase CLI-generated migration. Do not run automatically or remotely.
-- Requires explicit approval for the exact client-owned target and image-publication policy changes.
-- Apply only after the sponsor CMS upgrade. Fresh setups use schema/cms.sql instead.
-- Existing baseline, memberships, content, revisions, grants and assets remain untouched.
-- Optional new fields preserve old documents; no data is rewritten or published.
begin;

create or replace function cms_private.validate_document(p_type text, p_data jsonb, p_publishing boolean default false) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare v_allowed text[]; v_required text[]; v_key text; v_value jsonb; v_max integer; v_text text; v_date date;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 200000 then
    raise exception using errcode = 'PT400', message = 'Content must be an object smaller than 200 KB.';
  end if;
  case p_type
    when 'page' then v_allowed := array['title','slug','heading','subtitle','body','imageSrc','imageAlt','interpreterImageSrc','interpreterImageAlt','interpreterTitle','interpreterSubtitle']; v_required := array['title','slug','heading','body'];
    when 'post' then v_allowed := array['title','slug','excerpt','body','template','imageSrc','imageAlt','date','author']; v_required := array['title','slug','excerpt','body','template'];
    when 'founder' then v_allowed := array['name','title','heading','bio','story','homeQuote','imageSrc','imageAlt']; v_required := array['name','title','bio','story','homeQuote'];
    when 'testimonial' then v_allowed := array['name','title','quote']; v_required := array['name','quote'];
    when 'episode' then v_allowed := array['title','episodeTitle','description','category','youtubeUrl','tags','mainVideoSrc','aslVideoSrc','captionsSrc','duration','badge','interpreter','imageSrc','imageAlt','hostName','comingSoon']; v_required := array['title','episodeTitle','description','category','tags'];
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
    if p_type='episode' and v_key='comingSoon' then
      if jsonb_typeof(v_value) <> 'boolean' then raise exception using errcode='PT400', message='Coming soon must be a boolean.'; end if;
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
      when 'interpreterImageSrc' then 2000 when 'interpreterImageAlt' then 500 when 'interpreterSubtitle' then 300 when 'date' then 10
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
  if p_type='post' and coalesce(p_data->>'date','') <> '' then
    if p_data->>'date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or left(p_data->>'date',4)='0000' then
      raise exception using errcode='PT400', message='Use a calendar date in YYYY-MM-DD format.';
    end if;
    begin v_date := (p_data->>'date')::date;
    exception when others then raise exception using errcode='PT400', message='Use a real calendar date.'; end;
  end if;
  v_text := coalesce(p_data->>'youtubeUrl','');
  if v_text <> '' and v_text !~ '^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$' then
    raise exception using errcode='PT400', message='YouTube URL must be a canonical HTTPS watch URL with an 11-character video ID.';
  end if;
  if not cms_private.valid_image_src(coalesce(p_data->>'imageSrc','')) then raise exception using errcode='PT400', message='Use an approved bundled image or a registered CMS image path.'; end if;
  if coalesce(p_data->>'imageSrc','') <> '' and coalesce(p_data->>'imageAlt','') ~ '^[[:space:]]*$' then raise exception using errcode='PT400', message='Image alternative text is required.'; end if;
  if p_type='page' then
    if not cms_private.valid_image_src(coalesce(p_data->>'interpreterImageSrc','')) then raise exception using errcode='PT400', message='Use an approved bundled image or a registered CMS interpreter image path.'; end if;
    if coalesce(p_data->>'interpreterImageSrc','') <> '' and coalesce(p_data->>'interpreterImageAlt','') ~ '^[[:space:]]*$' then raise exception using errcode='PT400', message='Interpreter image alternative text is required.'; end if;
  end if;
  foreach v_key in array array['mainVideoSrc','aslVideoSrc','captionsSrc'] loop
    if not cms_private.valid_media_src(p_data->>v_key) then raise exception using errcode='PT400', message='Invalid media URL: ' || v_key; end if;
  end loop;
  if p_publishing and p_type='episode' and p_data->'comingSoon'='true'::jsonb then
    foreach v_key in array array['youtubeUrl','mainVideoSrc','aslVideoSrc','captionsSrc'] loop
      if coalesce(p_data->>v_key,'') <> '' then
        raise exception using errcode='PT400', message='Remove media links before publishing a coming-soon episode: ' || v_key || '. Coming-soon status hides playback, not media URLs.';
      end if;
    end loop;
  end if;
  if p_publishing and p_type='episode' and coalesce(p_data->'comingSoon','false'::jsonb)<>'true'::jsonb and v_text='' and (coalesce(p_data->>'mainVideoSrc','')='' or coalesce(p_data->>'aslVideoSrc','')='') then
    raise exception using errcode='PT400', message='An episode needs YouTube or both approved main and interpreter media, or must be marked coming soon before publication.';
  end if;
  return true;
end;
$$;

create or replace function cms_private.assert_registered_image(p_data jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_src text; v_field text;
begin
  foreach v_field in array array['imageSrc','interpreterImageSrc'] loop
    v_src := coalesce(p_data->>v_field,'');
    if left(v_src,16)='/api/media?path=' and not exists (
      select 1 from public.cms_assets a join storage.objects o on o.id=a.storage_object_id and o.bucket_id='cms-images' and o.name=a.path
      where a.path=substr(v_src,17) and o.owner_id=a.owner_id::text
        and o.metadata->>'mimetype'=a.content_type and (o.metadata->>'size')::bigint=a.size_bytes
    ) then raise exception using errcode='PT400', message='Upload and register this image before saving or publishing it.'; end if;
  end loop;
end;
$$;

drop policy cms_images_read_guard on storage.objects;
create policy cms_images_read_guard on storage.objects as restrictive for select to anon,authenticated using (
  bucket_id <> 'cms-images' or (
    (cms_private.member_role() is not null and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info','object.sign']))
    or (storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info']) and exists(
      select 1 from public.content_published p where (p.data->>'imageSrc'='/api/media?path=' || storage.objects.name
        or (p.type='page' and p.data->>'interpreterImageSrc'='/api/media?path=' || storage.objects.name))
        and (p.type <> 'sponsor' or p.data->'enabled'='true'::jsonb)
    ))
  )
);

drop policy cms_images_read on storage.objects;
create policy cms_images_read on storage.objects for select to anon,authenticated using (
  bucket_id='cms-images' and (
    (cms_private.member_role() is not null and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info','object.sign']))
    or (storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info']) and exists(
      select 1 from public.content_published p where (p.data->>'imageSrc'='/api/media?path=' || storage.objects.name
        or (p.type='page' and p.data->>'interpreterImageSrc'='/api/media?path=' || storage.objects.name))
        and (p.type <> 'sponsor' or p.data->'enabled'='true'::jsonb)
    ))
  )
);

-- Recheck existing rows after replacing the immutable validation function.
alter table public.content_drafts drop constraint cms_valid_draft;
alter table public.content_drafts add constraint cms_valid_draft check (cms_private.validate_document(type,data,false));
alter table public.content_published drop constraint cms_valid_publication;
alter table public.content_published add constraint cms_valid_publication check (cms_private.validate_document(type,data,not baseline));

commit;
