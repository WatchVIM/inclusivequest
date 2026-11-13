import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createSeedDocuments } from '../src/cms/content-model.js';
import { canonicalContent } from '../src/cms/canonical-content.js';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const [bootstrap,schema,oldSchema,sponsors,refinements]=await Promise.all([
  read('../supabase/tests/bootstrap.sql'),read('../supabase/schema/cms.sql'),read('../supabase/tests/fixtures/cms-before-sponsors.sql'),
  read('../supabase/review-migrations/sponsor-cms.sql'),read('../supabase/review-migrations/refinements-cms.sql')
]);
const {PGlite}=await import(process.env.CMS_PGLITE_MODULE||'@electric-sql/pglite');
const EDITOR='00000000-0000-4000-8000-000000000001';
const PUBLISHER='00000000-0000-4000-8000-000000000002';
const STRANGER='00000000-0000-4000-8000-000000000003';
const page=()=>({title:'Home',slug:'refinement-home',heading:'Accessible podcasts',subtitle:'',body:'Community stories',imageSrc:'',imageAlt:''});
const post=()=>({title:'Story',slug:'refinement-story',excerpt:'Summary',body:'The story',template:'story',imageSrc:'',imageAlt:''});
const episode=()=>({title:'Podcast',episodeTitle:'Upcoming conversation',description:'Details soon',category:'Podcast',tags:[],youtubeUrl:'',imageSrc:'',imageAlt:''});

for(const mode of ['fresh schema','existing CMS upgrade']) test(`Content refinement database: ${mode}`,async t=>{
  const db=new PGlite();t.after(()=>db.close());await db.exec(bootstrap);await db.exec(mode==='fresh schema'?schema:oldSchema);
  const query=(sql,args=[])=>db.query(sql,args);
  const value=async(sql,args=[])=>(await query(sql,args)).rows[0]?.value;
  const as=async(role,uid='')=>{await db.exec('reset role');await query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec(`set role ${role}`);};
  const rpc=(name,args=[])=>value(`select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) as value`,args);
  const save=(id,type,data,revision=0)=>rpc('cms_save_draft',[id,type,JSON.stringify(data),revision,randomUUID()]);
  const publish=(id,revision)=>rpc('cms_publish',[id,revision,randomUUID()]);
  const reject=(promise,code='PT400')=>assert.rejects(promise,error=>{assert.equal(error.code,code,error.message);return true;});
  await query('insert into auth.users(id) values ($1),($2),($3)',[EDITOR,PUBLISHER,STRANGER]);
  await query("insert into public.cms_members(user_id,role) values ($1,'editor'),($2,'publisher')",[EDITOR,PUBLISHER]);
  const baseline=await value('select cms_private.baseline_documents() as value');
  await as('authenticated',PUBLISHER);const initOperation=randomUUID();await rpc('cms_initialize',[JSON.stringify(baseline),initOperation]);

  if(mode==='existing CMS upgrade') await t.test('review-only upgrade preserves every existing row, baseline and permission grant',async()=>{
    await as('postgres');await db.exec(sponsors);
    const tables=['public.cms_members','public.content_drafts','public.content_published','public.content_revisions','public.cms_assets','cms_private.operations','cms_private.state'];
    const rows=async()=>Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await query(`select * from ${table} order by to_jsonb(${table.split('.')[1]})::text`)).rows])));
    const before=await rows();
    const permissions=await query("select n.nspname,p.proname,p.proacl::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','cms_private') order by n.nspname,p.proname");
    const originalBaseline=await value('select cms_private.baseline_documents() as value');
    await db.exec(refinements);
    assert.deepEqual(await rows(),before);
    assert.deepEqual(await value('select cms_private.baseline_documents() as value'),originalBaseline);
    assert.deepEqual((await query("select n.nspname,p.proname,p.proacl::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','cms_private') order by n.nspname,p.proname")).rows,permissions.rows);
    assert.ok(before['public.content_published'].some(row=>row.data.name==='Y.S.'),'historical client content is preserved, not replaced by new seeds');
    await as('authenticated',PUBLISHER);assert.equal((await rpc('cms_initialize',[JSON.stringify(baseline),initOperation])).replayed,true);
  });

  await t.test('new fields validate independently without requiring them on existing documents',async()=>{
    await as('authenticated',EDITOR);
    await save('old-post','post',post());
    await save('dated-post','post',{...post(),slug:'dated-post',date:'2024-02-29',author:'Alma / Inclusive Quest'});
    for(const date of ['2026-02-29','2026-04-31','0000-01-01','2026-1-1','tomorrow',false,{}]) await reject(save(`bad-date-${randomUUID()}`,'post',{...post(),slug:'bad-date',date}));
    await reject(save('long-author','post',{...post(),author:'x'.repeat(161)}));
    await save('old-episode','episode',episode());
    await save('future-episode','episode',{...episode(),comingSoon:true,hostName:'Approved host'});
    for(const comingSoon of ['true','false',null,1,{}]) await reject(save(`bad-soon-${randomUUID()}`,'episode',{...episode(),comingSoon}));
    await reject(save('long-host','episode',{...episode(),hostName:'x'.repeat(161)}));
    for(const interpreterImageSrc of ['https://remote.example/photo.png','javascript:x','//remote.example/photo.png','/api/media?path=../private']) await reject(save(`bad-image-${randomUUID()}`,'page',{...page(),interpreterImageSrc,interpreterImageAlt:'Photo'}));
    await reject(save('missing-image-alt','page',{...page(),interpreterImageSrc:'/inclusive-quest-logo.png'}));
    await reject(save('bad-title','page',{...page(),interpreterTitle:'x'.repeat(161)}));
    await reject(save('bad-subtitle','page',{...page(),interpreterSubtitle:'x'.repeat(301)}));
    await save('blank-labels','page',{...page(),interpreterTitle:'',interpreterSubtitle:'',interpreterImageSrc:'',interpreterImageAlt:''});
    const founder=canonicalContent('founder',createSeedDocuments().find(record=>record.type==='founder').draft);
    await save('optional-founder-heading','founder',{...founder,heading:''});
    await reject(save('bad-founder-heading','founder',{...founder,heading:'x'.repeat(201)}));
  });

  await t.test('only publishers may publish explicit coming-soon episodes without playable media',async()=>{
    await as('authenticated',EDITOR);await reject(publish('future-episode',1),'PT403');
    await as('authenticated',PUBLISHER);await reject(publish('old-episode',1));
    const published=await publish('future-episode',1);assert.equal(published.document.published.comingSoon,true);assert.equal(published.document.published.youtubeUrl,'');
    await as('anon');const snapshot=await rpc('cms_public_snapshot');
    assert.ok(snapshot.documents.some(record=>record.id==='future-episode'&&record.published.hostName==='Approved host'));
    assert.ok(!snapshot.documents.some(record=>record.id==='dated-post'),'draft-only metadata stays private');
  });

  await t.test('coming-soon publication rejects every source while preserving prior published content',async()=>{
    const sources={youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',mainVideoSrc:'https://example.test/main.mp4',aslVideoSrc:'https://example.test/interpreter.mp4',captionsSrc:'https://example.test/captions.vtt'};
    await as('authenticated',PUBLISHER);
    const original={...episode(),youtubeUrl:sources.youtubeUrl};
    await save('existing-playable','episode',original);await publish('existing-playable',1);
    const snapshotBefore=await rpc('cms_public_snapshot');
    for(const [field,source] of Object.entries(sources)) {
      const id=`coming-soon-${field}`;
      const saved=await save(id,'episode',{...episode(),comingSoon:true,[field]:source});
      assert.equal(saved.document.draft[field],source,'private draft retains the source');
      await assert.rejects(publish(id,1),error=>error.code==='PT400'&&error.message.includes('Remove media links')&&error.message.includes(field));
      assert.deepEqual(await rpc('cms_public_snapshot'),snapshotBefore,'rejected publication cannot change any existing public content');
    }
    await save('existing-playable','episode',{...original,comingSoon:true},2);
    await reject(publish('existing-playable',3));
    const record=(await rpc('cms_list_documents')).find(item=>item.id==='existing-playable');
    assert.equal(record.revision,3);assert.equal(record.draft.comingSoon,true);assert.deepEqual(record.published,original);
    assert.deepEqual(await rpc('cms_public_snapshot'),snapshotBefore);
  });

  await t.test('dedicated interpreter images require registration and are public only while published',async()=>{
    const path=`${EDITOR}/${randomUUID()}.png`;const src='/api/media?path='+path;
    const data={...page(),slug:'interpreter-home',interpreterImageSrc:src,interpreterImageAlt:'Approved interpreter',interpreterTitle:'',interpreterSubtitle:''};
    await as('authenticated',EDITOR);await reject(save('interpreter-home','page',data));
    await query("insert into storage.objects(bucket_id,name,owner_id,metadata) values ('cms-images',$1,$2,$3)",[path,EDITOR,JSON.stringify({mimetype:'image/png',size:1024})]);
    await rpc('cms_register_asset',[path]);await save('interpreter-home','page',data);
    await query("select set_config('test.storage_operation','object.get_authenticated',false)");
    const canRead=async()=>(await query('select id from storage.objects where name=$1',[path])).rows.length===1;
    await as('anon');assert.equal(await canRead(),false);
    await as('authenticated',STRANGER);assert.equal(await canRead(),false);
    await as('authenticated',EDITOR);await query("select set_config('test.storage_operation','object.sign',false)");assert.equal(await canRead(),true);
    await as('authenticated',PUBLISHER);await publish('interpreter-home',1);
    await as('anon');await query("select set_config('test.storage_operation','object.get_authenticated',false)");assert.equal(await canRead(),true);
    for(const operation of ['object.sign','object.list']) {await query("select set_config('test.storage_operation',$1,false)",[operation]);assert.equal(await canRead(),false);}
    await as('authenticated',PUBLISHER);await rpc('cms_unpublish',['interpreter-home',2,randomUUID()]);
    await as('anon');await query("select set_config('test.storage_operation','object.get_authenticated',false)");assert.equal(await canRead(),false);
    await as('authenticated',EDITOR);await query("select set_config('test.storage_operation','object.sign',false)");assert.equal(await canRead(),true,'staff retain private draft previews');
  });
});
