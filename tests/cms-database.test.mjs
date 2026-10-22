import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { createSeedDocuments } from '../src/cms/content-model.js';
import { canonicalContent } from '../src/cms/canonical-content.js';

const schema = await readFile(new URL('../supabase/schema/cms.sql', import.meta.url), 'utf8');
const bootstrap = await readFile(new URL('../supabase/tests/bootstrap.sql', import.meta.url), 'utf8');
const EDITOR='00000000-0000-4000-8000-000000000001';
const PUBLISHER='00000000-0000-4000-8000-000000000002';
const STRANGER='00000000-0000-4000-8000-000000000003';
const page=(title='Original')=>({title,slug:'test-page',heading:'Accessible page',subtitle:'',body:'A safe page',imageSrc:'',imageAlt:''});

// The normal dependency is preferred. The override supports an existing local
// installation without downloading software or changing application dependencies.
const { PGlite } = await import(process.env.CMS_PGLITE_MODULE || '@electric-sql/pglite');

test('CMS SQL: real PostgreSQL permissions, validation, history, replay, publication and storage isolation', async t => {
  const db=new PGlite();
  t.after(()=>db.close());
  await db.exec(bootstrap);
  await db.exec(schema);
  const query=(sql,args=[])=>db.query(sql,args);
  const value=async(sql,args=[])=> (await query(sql,args)).rows[0]?.value;
  const as=async(role,uid='')=>{await db.exec('reset role');await query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec(`set role ${role}`);};
  const fails=async(sql,args,code)=>assert.rejects(query(sql,args),e=>{assert.equal(e.code,code,e.message);return true;});
  const rpc=async(name,args=[])=>value(`select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) as value`,args);
  const save=async(id,data,revision=0,op=randomUUID(),type='page')=>rpc('cms_save_draft',[id,type,JSON.stringify(data),revision,op]);
  await query('insert into auth.users(id) values ($1),($2),($3)',[EDITOR,PUBLISHER,STRANGER]);
  await query("insert into public.cms_members(user_id,role) values ($1,'editor'),($2,'publisher')",[EDITOR,PUBLISHER]);

  await t.test('all exposed RPCs use invoker rights and definer helpers pin an empty search path',async()=>{
    const exposed=(await query("select p.proname,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'cms_%'")).rows;
    assert.ok(exposed.length>=10);
    for(const f of exposed){assert.equal(f.prosecdef,false,f.proname);assert.ok(f.proconfig.includes('search_path=""'),f.proname);}
    const helpers=(await query("select p.proname,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='cms_private' and p.prosecdef")).rows;
    for(const f of helpers) assert.ok(f.proconfig.includes('search_path=""'),f.proname);
    assert.equal(await value("select has_table_privilege('authenticated','public.cms_members','INSERT') as value"),false);
    assert.equal(await value("select has_table_privilege('service_role','public.content_drafts','UPDATE') as value"),false);
    assert.equal(await value("select has_function_privilege('anon','cms_private.mutate_document(text,text,text,jsonb,bigint,uuid,uuid)','EXECUTE') as value"),false);
  });
  await t.test('anonymous and non-staff fail closed, including writable user metadata',async()=>{
    await as('anon');
    await fails('select * from public.content_drafts',[],'42501');
    await fails('select * from public.content_revisions',[],'42501');
    await fails('select * from public.cms_assets',[],'42501');
    await fails('select public.cms_save_draft($1,$2,$3,$4,$5)',['test','page',JSON.stringify(page()),0,randomUUID()],'42501');
    await fails('select public.cms_public_snapshot()',[],'PT503');
    await as('authenticated',STRANGER);
    await query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:STRANGER,user_metadata:{role:'publisher'}})]);
    assert.equal(await rpc('cms_session'),null);
    assert.equal((await query('select * from public.content_drafts')).rows.length,0);
    await fails('select public.cms_list_documents()',[],'PT403');
    await fails('select public.cms_save_draft($1,$2,$3,$4,$5)',['test','page',JSON.stringify(page()),0,randomUUID()],'PT403');
    await fails("insert into public.cms_members(user_id,role) values ($1,'publisher')",[STRANGER],'42501');
  });
  await t.test('all pre-initialization mutations fail without creating partial content or activation',async()=>{
    for (const uid of [EDITOR,PUBLISHER]) {
      await as('authenticated',uid);
      await assert.rejects(save('premature',page()),e=>e.code==='PT503');
      await fails('select public.cms_restore_revision($1,$2,$3,$4)',['premature',randomUUID(),0,randomUUID()],'PT503');
      await fails('select public.cms_register_asset($1)',[`${uid}/${randomUUID()}.png`],'PT503');
      await fails("insert into storage.objects(bucket_id,name,owner_id,metadata) values ('cms-images',$1,$2,$3)",[`${uid}/${randomUUID()}.png`,uid,JSON.stringify({mimetype:'image/png',size:1024})],'42501');
      if (uid===PUBLISHER) {
        await fails('select public.cms_publish($1,$2,$3)',['premature',0,randomUUID()],'PT503');
        await fails('select public.cms_unpublish($1,$2,$3)',['premature',0,randomUUID()],'PT503');
      }
      assert.deepEqual(await rpc('cms_list_documents'),[]);
    }
    await as('anon');await fails('select public.cms_public_snapshot()',[],'PT503');
  });
  await t.test('oversized reviewed-baseline initialization rolls back activation, documents and audit',async()=>{
    await as('postgres');
    const original=await value("select pg_get_functiondef('cms_private.baseline_documents()'::regprocedure) as value");
    try {
      // Local-only future-baseline fixture; production only accepts the pinned baseline.
      await db.exec(`create or replace function cms_private.baseline_documents() returns jsonb
        language sql immutable security invoker set search_path='' as $$
          select jsonb_agg(jsonb_build_object('id','oversize-'||n,'type','page','data',
            jsonb_build_object('title','Large page','slug','oversize-'||n,'heading','Large page','body',repeat('é',40000))) order by 'oversize-'||n)
          from generate_series(1,44) n;
        $$;`);
      const oversized=await value('select cms_private.baseline_documents() as value');
      await as('authenticated',PUBLISHER);
      await assert.rejects(rpc('cms_initialize',[JSON.stringify(oversized),randomUUID()]),e=>e.code==='PT400' && e.message.includes('3,500,000-byte'));
      assert.deepEqual(await rpc('cms_list_documents'),[]);
      assert.equal((await query('select * from public.content_revisions')).rows.length,0);
      await as('anon');await fails('select public.cms_public_snapshot()',[],'PT503');
      await as('postgres');
      assert.equal(await value('select count(*)::integer as value from cms_private.operations'),0);
    } finally {
      await as('postgres');await db.exec(original);
    }
  });
  await t.test('initialization requires publisher and exact bundled baseline; retries do not duplicate it',async()=>{
    const baseline=createSeedDocuments().map(({id,type,published})=>({id,type,data:canonicalContent(type,published)}));
    await as('authenticated',EDITOR);
    await fails('select public.cms_initialize($1,$2)',[JSON.stringify(baseline),randomUUID()],'PT403');
    await as('authenticated',PUBLISHER);
    await fails('select public.cms_initialize($1,$2)',[JSON.stringify([{id:'bad',type:'page',data:page()}]),randomUUID()],'PT400');
    const op=randomUUID();
    const result=await rpc('cms_initialize',[JSON.stringify(baseline),op]);
    assert.equal(result.documents.length,baseline.length);
    assert.equal(result.replayed,false);
    assert.equal((await rpc('cms_initialize',[JSON.stringify(baseline),op])).replayed,true);
    await fails('select public.cms_initialize($1,$2)',[JSON.stringify(baseline),randomUUID()],'PT409');
    await as('anon');
    const snapshot=await rpc('cms_public_snapshot');
    assert.equal(snapshot.documents.length,baseline.length);
    for(const doc of snapshot.documents) assert.deepEqual(Object.keys(doc).sort(),['id','published','type']);
    await as('authenticated',PUBLISHER);
    await fails('select public.cms_publish($1,$2,$3)',['she-wears-the-pants',1,randomUUID()],'PT400');
  });
  let op;let saved;let initialRevision;
  await t.test('editor save is private; exact retries work and stale or reused requests conflict',async()=>{
    await as('authenticated',EDITOR);
    op=randomUUID(); saved=await save('test-page',page(),0,op); assert.equal(saved.document.revision,1);assert.equal(saved.document.published,null);
    assert.equal((await save('test-page',page(),0,op)).replayed,true);
    await assert.rejects(save('test-page',page('Different'),0,op),e=>e.code==='PT409');
    await assert.rejects(save('test-page',page('Lost update'),0),e=>e.code==='PT409');
    const revisions=await rpc('cms_get_revisions',['test-page']);
    assert.equal(revisions.length,1);initialRevision=revisions[0].id;
    assert.equal(revisions[0].actor,EDITOR);assert.equal(revisions[0].action,'save');assert.ok(revisions[0].createdAt);
    await fails('select public.cms_publish($1,$2,$3)',['test-page',1,randomUUID()],'PT403');
    await fails('update public.content_drafts set data=$1 where id=$2',[JSON.stringify(page('Forged')),'test-page'],'42501');
    await fails('insert into public.content_published(id,type,data,revision) values ($1,$2,$3,1)',['test-page','page',JSON.stringify(page())],'42501');
    await fails('delete from public.content_revisions where document_id=$1',['test-page'],'42501');
    await as('anon');assert.equal((await rpc('cms_public_snapshot')).documents.some(d=>d.id==='test-page'),false);
  });
  await t.test('SQL rejects unknown fields, unsafe URLs, wrong types, oversized data and missing alt',async()=>{
    await as('authenticated',EDITOR);
    const bad=[{...page(),dangerous:'<iframe>'},{...page(),title:[]},{...page(),title:'x'.repeat(161)},{...page(),slug:'Not Safe'},
      {...page(),imageSrc:'https://evil.example/a.png',imageAlt:'x'},{...page(),imageSrc:'/api/media?path=../a.png',imageAlt:'x'},
      {...page(),imageSrc:'/she-wears-the-pants.svg',imageAlt:'\n\t'},{...page(),title:'\n\t'}];
    for(const item of bad) await assert.rejects(save('bad-page',item),e=>e.code==='PT400');
    const episode={title:'Episode',episodeTitle:'A video',description:'Description',category:'Podcast',tags:[],youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',imageSrc:'',imageAlt:''};
    for(const youtubeUrl of ['https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ','javascript:alert(1)','https://www.youtube.com/watch?v=dQw4w9WgXcQ&x=1','https://youtu.be/dQw4w9WgXcQ']){
      await assert.rejects(save('bad-episode',{...episode,youtubeUrl},0,randomUUID(),'episode'),e=>e.code==='PT400');
    }
    await assert.rejects(save('bad-episode',{...episode,tags:Array(21).fill('x')},0,randomUUID(),'episode'),e=>e.code==='PT400');
    await assert.rejects(save('bad-episode',{...episode,mainVideoSrc:'https://user:pass@evil.example/video'},0,randomUUID(),'episode'),e=>e.code==='PT400');
    await save('valid-episode',episode,0,randomUUID(),'episode');
    await assert.rejects(save('duplicate-slug',page()),e=>e.code==='PT400');
    assert.equal((await rpc('cms_list_documents')).some(d=>d.id==='bad-page'),false);
  });
  await t.test('published slug conflicts return PT400 and roll back draft revision and audit changes',async()=>{
    await as('authenticated',EDITOR);
    const home=(await rpc('cms_list_documents')).find(d=>d.id==='page-home');
    await save('page-home',{...home.draft,slug:'home-next'},home.revision);
    await save('slug-collision',{...page(),slug:'home'});
    await as('authenticated',PUBLISHER);
    await fails('select public.cms_publish($1,$2,$3)',['slug-collision',1,randomUUID()],'PT400');
    const unchanged=(await rpc('cms_list_documents')).find(d=>d.id==='slug-collision');
    assert.equal(unchanged.revision,1);assert.equal(unchanged.published,null);
    assert.equal((await rpc('cms_get_revisions',['slug-collision'])).length,1);
    assert.equal((await rpc('cms_public_snapshot')).documents.find(d=>d.id==='page-home').published.slug,'home');
  });
  await t.test('publish/save/restore/unpublish atomically preserve the independent published snapshot',async()=>{
    await as('authenticated',PUBLISHER);
    const result=await rpc('cms_publish',['test-page',1,randomUUID()]); assert.equal(result.document.revision,2);assert.equal(result.document.published.title,'Original');
    await as('authenticated',EDITOR);
    const changed=await save('test-page',page('New private text'),2);assert.equal(changed.document.revision,3);assert.equal(changed.document.published.title,'Original');
    const restored=await rpc('cms_restore_revision',['test-page',initialRevision,3,randomUUID()]); assert.equal(restored.document.revision,4);assert.equal(restored.document.draft.title,'Original');assert.equal(restored.document.published.title,'Original');
    await fails('select public.cms_restore_revision($1,$2,$3,$4)',['test-page',randomUUID(),4,randomUUID()],'PT404');
    await as('anon');assert.equal((await rpc('cms_public_snapshot')).documents.find(d=>d.id==='test-page').published.title,'Original');
    await as('authenticated',PUBLISHER);
    await fails('select public.cms_unpublish($1,$2,$3)',['test-page',3,randomUUID()],'PT409');
    const unpublished=await rpc('cms_unpublish',['test-page',4,randomUUID()]);assert.equal(unpublished.document.published,null);assert.equal(unpublished.document.revision,5);
    assert.equal((await rpc('cms_get_revisions',['test-page'])).length,5);
    await as('anon');assert.equal((await rpc('cms_public_snapshot')).documents.some(d=>d.id==='test-page'),false);
    await as('postgres');await fails('update public.content_revisions set action=$1 where document_id=$2',['save','test-page'],'PT403');
  });
  await t.test('membership revocation immediately prevents operations including prior idempotent retries',async()=>{
    await as('postgres');await query('delete from public.cms_members where user_id=$1',[EDITOR]);
    await as('authenticated',EDITOR);assert.equal(await rpc('cms_session'),null);
    await assert.rejects(save('test-page',page(),0,op),e=>e.code==='PT403');
    assert.equal((await query('select * from public.content_revisions')).rows.length,0);
    await as('postgres');await query("insert into public.cms_members(user_id,role) values ($1,'editor')",[EDITOR]);
  });
  await t.test('immutable private images become anonymously downloadable only while referenced by a published snapshot',async()=>{
    const path=`${EDITOR}/${randomUUID()}.png`;
    const src='/api/media?path='+path;
    await as('authenticated',EDITOR);
    await assert.rejects(save('image-page',{...page(),slug:'image-page',imageSrc:src,imageAlt:'Accessible diagram'}),e=>e.code==='PT400');
    await query("insert into storage.objects(bucket_id,name,owner_id,metadata) values ('cms-images',$1,$2,$3)",[path,EDITOR,JSON.stringify({mimetype:'image/png',size:1024})]);
    const asset=await rpc('cms_register_asset',[path]);assert.equal(asset.imageSrc,src);assert.equal(asset.sizeBytes,1024);
    assert.deepEqual(await rpc('cms_register_asset',[path]),asset);
    for (const metadata of [{mimetype:'image/svg+xml',size:100},{mimetype:'image/png',size:4000001},{mimetype:'image/png',size:0},{mimetype:'image/png'}, {mimetype:'image/jpeg',size:100}]) {
      const badPath=`${EDITOR}/${randomUUID()}.png`;
      await query("insert into storage.objects(bucket_id,name,owner_id,metadata) values ('cms-images',$1,$2,$3)",[badPath,EDITOR,JSON.stringify(metadata)]);
      await fails('select public.cms_register_asset($1)',[badPath],'PT400');
    }
    // Storage's permission probe may omit completed metadata. Actual HTTP bucket
    // limits prevent these invalid fixture uploads; registration independently rejects them.
    await query("select set_config('test.storage_operation','object.sign',false)");
    assert.equal((await query('select * from storage.objects where name=$1',[path])).rows.length,1);
    await as('authenticated',STRANGER);
    assert.equal((await query('select * from storage.objects where name=$1',[path])).rows.length,0);
    await as('authenticated',EDITOR);
    const forbiddenPath=`${PUBLISHER}/${randomUUID()}.png`;
    await fails("insert into storage.objects(bucket_id,name,owner_id,metadata) values ('cms-images',$1,$2,$3)",[forbiddenPath,EDITOR,JSON.stringify({mimetype:'image/png',size:1024})],'42501');
    await fails("insert into storage.objects(bucket_id,name,owner_id,metadata) values ('cms-images',$1,$2,$3)",[`${EDITOR}/${randomUUID()}.svg`,EDITOR,JSON.stringify({mimetype:'image/svg+xml',size:1024})],'42501');
    await query("select set_config('test.storage_operation','object.get_authenticated',false)");
    assert.equal((await query('select * from storage.objects where name=$1',[path])).rows.length,1);
    assert.equal((await query('update storage.objects set metadata=$1 where name=$2 returning id',[JSON.stringify({mimetype:'image/png',size:20}),path])).rows.length,0);
    assert.equal((await query('delete from storage.objects where name=$1 returning id',[path])).rows.length,0);
    await save('image-page',{...page(),slug:'image-page',imageSrc:src,imageAlt:'Accessible diagram'});
    await as('anon');assert.equal((await query('select * from storage.objects where name=$1',[path])).rows.length,0);
    await as('authenticated',PUBLISHER);await rpc('cms_publish',['image-page',1,randomUUID()]);
    await as('anon');assert.equal((await query('select * from storage.objects where name=$1',[path])).rows.length,1);
    await query("select set_config('test.storage_operation','object.list',false)");assert.equal((await query('select * from storage.objects')).rows.length,0);
    await query("select set_config('test.storage_operation','object.sign',false)");assert.equal((await query('select * from storage.objects')).rows.length,0);
    await query("select set_config('test.storage_operation','object.get_authenticated',false)");
    await as('authenticated',PUBLISHER);await rpc('cms_unpublish',['image-page',2,randomUUID()]);
    await as('anon');assert.equal((await query('select * from storage.objects where name=$1',[path])).rows.length,0);
  });
  await t.test('complete public snapshot UTF-8 budget rejects publication and rolls back every attempted change',async()=>{
    await as('postgres');
    // Fixture: 43 individually valid 40k-character pages, with two-byte UTF-8 text.
    await query(`insert into public.content_drafts(id,type,data,revision,updated_by)
      select 'budget-'||n,'page',jsonb_build_object('title','Budget '||n,'slug','budget-'||n,'heading','Budget page','body',repeat('é',40000)),1,$1::uuid
      from generate_series(1,43) n`,[EDITOR]);
    await query(`insert into public.content_published(id,type,data,revision)
      select id,type,data,revision from public.content_drafts where id like 'budget-%'`);
    await as('authenticated',EDITOR);
    await save('budget-candidate',{...page(),slug:'budget-candidate',body:'é'.repeat(40000)});
    await as('authenticated',PUBLISHER);
    const before=await value('select public.cms_public_snapshot()::text as value');
    const bytes=Buffer.byteLength(before,'utf8');
    assert.ok(bytes<=3500000 && bytes>3420000,`fixture byte length ${bytes}`);
    assert.ok(before.length+40000<3500000,'character counting would incorrectly allow the next publication');
    const mutationId=randomUUID();
    await assert.rejects(rpc('cms_publish',['budget-candidate',1,mutationId]),e=>e.code==='PT400' && e.message.includes('3,500,000-byte'));
    const unchanged=(await rpc('cms_list_documents')).find(d=>d.id==='budget-candidate');
    assert.equal(unchanged.revision,1);assert.equal(unchanged.published,null);
    assert.equal((await rpc('cms_get_revisions',['budget-candidate'])).length,1);
    const after=await value('select public.cms_public_snapshot()::text as value');
    const digest=text=>createHash('sha256').update(text).digest('hex');
    assert.equal(digest(after),digest(before));
    await as('postgres');
    assert.equal(await value('select count(*)::integer as value from cms_private.operations where actor=$1 and operation_id=$2',[PUBLISHER,mutationId]),0);
    // Remove only owner-created fixture publications so later tests stay small.
    await query("delete from public.content_published where id like 'budget-%'");
  });
  await t.test('250-document limit is enforced on creation without blocking existing edits',async()=>{
    await as('postgres');
    await query(`insert into public.content_drafts(id,type,data,revision,updated_by)
      select 'limit-'||n,'category',jsonb_build_object('name','Limit '||n,'slug','limit-'||n,'description',''),1,$1::uuid
      from generate_series(1,250-(select count(*)::integer from public.content_drafts)) n`,[EDITOR]);
    await as('authenticated',EDITOR);
    await assert.rejects(save('beyond-limit',{...page(),slug:'beyond-limit'}),e=>e.code==='PT400');
    assert.equal((await save('test-page',page('Still editable'),5)).document.revision,6);
  });
  await t.test('bucket remains private with upload MIME and size limits; only expected grants exist',async()=>{
    await as('postgres');
    const bucket=(await query("select * from storage.buckets where id='cms-images'")).rows[0];
    assert.equal(bucket.public,false);assert.equal(Number(bucket.file_size_limit),4000000);assert.deepEqual(bucket.allowed_mime_types,['image/jpeg','image/png','image/webp']);
    for(const table of ['cms_members','content_drafts','content_published','content_revisions','cms_assets']){
      for(const role of ['anon','authenticated']) for(const privilege of ['INSERT','UPDATE','DELETE','TRUNCATE']){
        assert.equal(await value('select has_table_privilege($1,$2,$3) as value',[role,`public.${table}`,privilege]),false,`${role} ${privilege} ${table}`);
      }
    }
  });
});
