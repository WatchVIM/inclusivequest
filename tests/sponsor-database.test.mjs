import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createSeedDocuments } from '../src/cms/content-model.js';
import { canonicalContent } from '../src/cms/canonical-content.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [schema, bootstrap, previous, upgrade] = await Promise.all([
  read('../supabase/schema/cms.sql'), read('../supabase/tests/bootstrap.sql'),
  read('../supabase/tests/fixtures/cms-before-sponsors.sql'), read('../supabase/review-migrations/sponsor-cms.sql')
]);
const { PGlite } = await import(process.env.CMS_PGLITE_MODULE || '@electric-sql/pglite');
const EDITOR='00000000-0000-4000-8000-000000000001';
const PUBLISHER='00000000-0000-4000-8000-000000000002';
const STRANGER='00000000-0000-4000-8000-000000000003';
const slot = (overrides={}) => ({placement:'home',enabled:false,name:'',imageSrc:'',imageAlt:'',destinationUrl:'',targeting:'undecided',episodeId:'',...overrides});
const complete = (overrides={}) => slot({enabled:true,name:'Sponsor example',imageSrc:'/inclusive-quest-logo.png',imageAlt:'Sponsor example logo',destinationUrl:'https://sponsor.example/support?source=podcast#details',...overrides});
const episode = name => ({title:'Podcast',episodeTitle:name,description:'Accessible conversation',category:'Podcast',tags:[],youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',imageSrc:'',imageAlt:''});

for (const mode of ['fresh schema','existing CMS upgrade']) {
  test(`Sponsor database: ${mode} preserves the CMS security and publication contract`, async t => {
    const db = new PGlite();
    t.after(()=>db.close());
    await db.exec(bootstrap);
    await db.exec(mode==='fresh schema' ? schema : previous);
    const query=(sql,args=[])=>db.query(sql,args);
    const value=async(sql,args=[])=> (await query(sql,args)).rows[0]?.value;
    const as=async(role,uid='')=> { await db.exec('reset role'); await query("select set_config('request.jwt.claim.sub',$1,false)",[uid]); await db.exec(`set role ${role}`); };
    const rpc=(name,args=[])=>value(`select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) as value`,args);
    const save=(id,data,revision=0,operation=randomUUID(),type='sponsor')=>rpc('cms_save_draft',[id,type,JSON.stringify(data),revision,operation]);
    const publish=(id,revision,operation=randomUUID())=>rpc('cms_publish',[id,revision,operation]);
    const unpublish=(id,revision)=>rpc('cms_unpublish',[id,revision,randomUUID()]);
    const rejected=(promise,code='PT400')=>assert.rejects(promise,error=> { assert.equal(error.code,code,error.message); return true; });
    const documents=()=>rpc('cms_list_documents');
    const record=async id=>(await documents()).find(doc=>doc.id===id);
    const snapshot=()=>rpc('cms_public_snapshot');
    const publicHas=async id=>(await snapshot()).documents.some(doc=>doc.id===id);
    const directHas=async id=>(await query('select id from public.content_published where id=$1',[id])).rows.length===1;
    await query('insert into auth.users(id) values ($1),($2),($3)',[EDITOR,PUBLISHER,STRANGER]);
    await query("insert into public.cms_members(user_id,role) values ($1,'editor'),($2,'publisher')",[EDITOR,PUBLISHER]);
    await as('authenticated',PUBLISHER);
    const baseline=createSeedDocuments().map(({id,type,published})=>({id,type,data:canonicalContent(type,published)}));
    const initOperation=randomUUID();
    await rpc('cms_initialize',[JSON.stringify(baseline),initOperation]);

    if (mode==='existing CMS upgrade') {
      await t.test('upgrade preserves existing baseline, roles, revisions, assets and operation receipts',async()=>{
        const before=await snapshot();
        const beforeDocuments=await documents();
        const path=`${PUBLISHER}/${randomUUID()}.png`;
        await query("insert into storage.objects(bucket_id,name,owner_id,metadata) values ('cms-images',$1,$2,$3)",[path,PUBLISHER,JSON.stringify({mimetype:'image/png',size:100})]);
        await rpc('cms_register_asset',[path]);
        await as('postgres');
        const beforeAudit=(await query('select * from public.content_revisions order by document_id,revision')).rows;
        const beforeAssets=(await query('select * from public.cms_assets')).rows;
        await db.exec(upgrade);
        assert.deepEqual((await query('select * from public.content_revisions order by document_id,revision')).rows,beforeAudit);
        assert.deepEqual((await query('select * from public.cms_assets')).rows,beforeAssets);
        await as('authenticated',PUBLISHER);
        assert.deepEqual(await snapshot(),before);
        assert.deepEqual(await documents(),beforeDocuments);
        assert.equal((await documents()).filter(doc=>doc.type==='sponsor').length,0,'upgrade creates no sponsor content');
        assert.equal((await rpc('cms_session')).role,'publisher');
        assert.equal((await rpc('cms_initialize',[JSON.stringify(baseline),initOperation])).replayed,true);
        await as('authenticated',EDITOR);
        assert.equal((await rpc('cms_session')).role,'editor');
      });
    }

    await t.test('no new API or private-helper grants bypass existing editor/publisher boundaries',async()=>{
      await as('postgres');
      for (const helper of ['cms_private.valid_sponsor_destination(text)','cms_private.assert_sponsor_publication(text,jsonb)']) {
        for (const role of ['anon','authenticated','service_role']) assert.equal(await value('select has_function_privilege($1,$2,\'EXECUTE\') as value',[role,helper]),false,`${role}: ${helper}`);
      }
      const functions=(await query("select p.proname,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'cms_%'")).rows;
      assert.equal(functions.length,10);
      for (const f of functions) { assert.equal(f.prosecdef,false); assert.ok(f.proconfig.includes('search_path=""')); }
      await as('anon');
      await rejected(save('anonymous-sponsor',slot()),'42501');
      await as('authenticated',STRANGER);
      await rejected(save('stranger-sponsor',slot()),'PT403');
      await as('authenticated',EDITOR);
      await save('empty-sponsor',slot());
      await rejected(publish('empty-sponsor',1),'PT403');
      await rejected(unpublish('empty-sponsor',1),'PT403');
      await as('authenticated',PUBLISHER);
      await publish('empty-sponsor',1);
      assert.equal((await record('empty-sponsor')).published.enabled,false);
      assert.equal(await publicHas('empty-sponsor'),false,'public RPC filters off snapshots for staff too');
      await as('anon');
      assert.equal(await publicHas('empty-sponsor'),false);
      assert.equal(await directHas('empty-sponsor'),false);
      await as('authenticated',STRANGER);
      assert.equal(await directHas('empty-sponsor'),false);
    });

    await t.test('server independently rejects unknown fields, malformed types, destinations, images and targeting',async()=>{
      await as('authenticated',EDITOR);
      const bad=[
        {...slot(),arbitrary:'<iframe>'}, {...slot(),enabled:'false'}, {...slot(),enabled:0}, {...slot(),enabled:null},
        {...slot(),name:null}, {...slot(),imageAlt:[]}, {...slot(),name:'x'.repeat(161)}, {...slot(),imageAlt:'x'.repeat(501)},
        {...slot(),destinationUrl:'https://example.test/'+'x'.repeat(2000)}, {...slot(),placement:'footer'}, {...slot(),targeting:'all'},
        {...slot(),targeting:'shared'}, {...slot(),episodeId:'some-episode'},
        {...slot(),placement:'episode',targeting:'shared',episodeId:'some-episode'},
        {...slot(),placement:'episode',targeting:'episode',episodeId:'../episode'},
        {...slot(),imageSrc:'/inclusive-quest-logo.png',imageAlt:' \n\t'},
      ];
      for (const field of Object.keys(slot())) { const missing=slot(); delete missing[field]; bad.push(missing); }
      for (const destinationUrl of ['javascript:alert(1)','http://example.test','//example.test','https://name:secret@example.test','https://example.test:443/a','https://example.test:8443/a','https://example.test\\@evil.test','https://example.test/ white','https://example.test/\n','https://localhost/a','https://example.test/%no','<iframe src="https://example.test">']) bad.push({...slot(),destinationUrl});
      for (const imageSrc of ['https://example.test/logo.png','//example.test/logo.png','/unknown.png','/api/media?path=../secret','/api/media?path='+encodeURIComponent(`${EDITOR}/${randomUUID()}.png`),`/api/media?path=${EDITOR}/${randomUUID()}.svg`]) bad.push({...slot(),imageSrc,imageAlt:'Logo'});
      for (const data of bad) await rejected(save('invalid-sponsor',data));
      assert.equal((await documents()).some(doc=>doc.id==='invalid-sponsor'),false);
      for (const destinationUrl of ['https://example.test','https://example.test?source=home','https://example.test#support','https://example.test/a%20b']) {
        await save('valid-url-'+randomUUID(),slot({destinationUrl}));
      }
      await save('incomplete-enabled',slot({enabled:true}));
      await as('authenticated',PUBLISHER);
      await rejected(publish('incomplete-enabled',1));
      assert.equal((await record('incomplete-enabled')).revision,1);
    });

    await t.test('public snapshots, history, restore and operation replay remain separate from sponsor drafts',async()=>{
      await as('authenticated',EDITOR);
      const saved=await save('home-sponsor',complete());
      const first=(await rpc('cms_get_revisions',['home-sponsor']))[0].id;
      await as('anon');
      assert.equal(await publicHas('home-sponsor'),false);
      await as('authenticated',PUBLISHER);
      const operation=randomUUID();
      const published=await publish('home-sponsor',saved.document.revision,operation);
      assert.equal(published.document.revision,2);
      assert.equal((await publish('home-sponsor',1,operation)).replayed,true);
      await as('anon');
      const publicRecord=(await snapshot()).documents.find(doc=>doc.id==='home-sponsor');
      assert.deepEqual(Object.keys(publicRecord).sort(),['id','published','type']);
      assert.equal(publicRecord.published.name,'Sponsor example');
      assert.equal(await directHas('home-sponsor'),true);
      await as('authenticated',EDITOR);
      await save('home-sponsor',complete({enabled:false,name:'Private renewal negotiation'}),2);
      await as('anon');
      assert.equal((await snapshot()).documents.find(doc=>doc.id==='home-sponsor').published.name,'Sponsor example');
      await as('authenticated',PUBLISHER);
      await rejected(publish('home-sponsor',2),'PT409');
      await publish('home-sponsor',3);
      assert.equal(await publicHas('home-sponsor'),false);
      assert.equal(await directHas('home-sponsor'),true,'staff retain the deliberately off published reference');
      await as('anon');
      assert.equal(await directHas('home-sponsor'),false);
      await as('authenticated',EDITOR);
      const restored=await rpc('cms_restore_revision',['home-sponsor',first,4,randomUUID()]);
      assert.equal(restored.document.draft.enabled,true);
      assert.equal(restored.document.published.enabled,false);
      await as('anon');
      assert.equal(await publicHas('home-sponsor'),false,'restoring historical enabled content is not publication');
      await as('authenticated',PUBLISHER);
      await publish('home-sponsor',5);
      assert.equal((await rpc('cms_get_revisions',['home-sponsor'])).length,6);
      await as('postgres');
      await query('delete from public.cms_members where user_id=$1',[PUBLISHER]);
      await as('authenticated',PUBLISHER);
      await rejected(publish('home-sponsor',1,operation),'PT403');
      await as('postgres');
      await query("insert into public.cms_members(user_id,role) values ($1,'publisher')",[PUBLISHER]);
    });

    await t.test('overlapping home publication rolls back draft revision, history and idempotency receipt',async()=>{
      await as('authenticated',EDITOR);
      await save('home-collision',complete({name:'Another sponsor'}));
      await as('authenticated',PUBLISHER);
      const operation=randomUUID();
      await rejected(publish('home-collision',1,operation));
      const unchanged=await record('home-collision');
      assert.equal(unchanged.revision,1); assert.equal(unchanged.published,null);
      assert.equal((await rpc('cms_get_revisions',['home-collision'])).length,1);
      await as('postgres');
      assert.equal(await value('select count(*)::integer as value from cms_private.operations where actor=$1 and operation_id=$2',[PUBLISHER,operation]),0);
      await as('authenticated',PUBLISHER);
      await save('home-collision',complete({enabled:false}),1);
      await publish('home-collision',2);
      assert.equal((await record('home-collision')).published.enabled,false,'off snapshots do not reserve slots');
      await unpublish('home-sponsor',6);
    });

    await t.test('enabled episode publication requires resolved targeting and an actually published episode',async()=>{
      await as('authenticated',EDITOR);
      await save('episode-a',episode('Episode A'),0,randomUUID(),'episode');
      await save('episode-b',episode('Episode B'),0,randomUUID(),'episode');
      await save('episode-undecided',complete({placement:'episode'}));
      await save('episode-no-target',complete({placement:'episode',targeting:'episode'}));
      await save('episode-missing',complete({placement:'episode',targeting:'episode',episodeId:'not-an-episode'}));
      await save('episode-wrong-type',complete({placement:'episode',targeting:'episode',episodeId:'page-home'}));
      await save('episode-sponsor-a',complete({placement:'episode',targeting:'episode',episodeId:'episode-a'}));
      await as('authenticated',PUBLISHER);
      for (const id of ['episode-undecided','episode-no-target','episode-missing','episode-wrong-type','episode-sponsor-a']) await rejected(publish(id,1));
      await publish('episode-a',1); await publish('episode-b',1);
      await publish('episode-sponsor-a',1);
      await as('anon');
      assert.equal(await publicHas('episode-sponsor-a'),true);
      await as('authenticated',PUBLISHER);
      await rejected(unpublish('episode-a',2));
      assert.equal((await record('episode-a')).revision,2);
    });

    await t.test('per-episode sponsors coexist only on distinct episodes; shared slot conflicts both ways',async()=>{
      await as('authenticated',EDITOR);
      await save('episode-sponsor-b',complete({placement:'episode',targeting:'episode',episodeId:'episode-b'}));
      await save('episode-duplicate-a',complete({placement:'episode',targeting:'episode',episodeId:'episode-a'}));
      await save('episode-shared',complete({placement:'episode',targeting:'shared'}));
      await as('authenticated',PUBLISHER);
      await publish('episode-sponsor-b',1);
      await rejected(publish('episode-duplicate-a',1));
      await rejected(publish('episode-shared',1));
      // Saving a disabled draft does not release a currently published reservation.
      await save('episode-sponsor-a',complete({enabled:false,placement:'episode',targeting:'episode',episodeId:'episode-a'}),2);
      await rejected(publish('episode-duplicate-a',1));
      await publish('episode-sponsor-a',3);
      await unpublish('episode-a',2);
      await rejected(publish('episode-duplicate-a',1));
      await unpublish('episode-sponsor-b',2);
      await publish('episode-shared',1);
      await rejected(publish('episode-sponsor-b',3));
      await unpublish('episode-b',2); // A shared slot does not require any one episode.
      await unpublish('episode-shared',2);
    });

    await t.test('disabled sponsor media stays private and registered immutable images use existing publication access',async()=>{
      const path=`${EDITOR}/${randomUUID()}.png`;
      const imageSrc='/api/media?path='+path;
      const data=complete({enabled:false,imageSrc});
      await as('authenticated',EDITOR);
      await rejected(save('media-sponsor',data));
      await query("insert into storage.objects(bucket_id,name,owner_id,metadata) values ('cms-images',$1,$2,$3)",[path,EDITOR,JSON.stringify({mimetype:'image/png',size:1024})]);
      await rpc('cms_register_asset',[path]);
      await save('media-sponsor',data);
      await query("select set_config('test.storage_operation','object.get_authenticated',false)");
      const canDownload=async()=>(await query('select id from storage.objects where name=$1',[path])).rows.length===1;
      await as('anon'); assert.equal(await canDownload(),false);
      await as('authenticated',PUBLISHER); await publish('media-sponsor',1);
      await as('anon'); assert.equal(await canDownload(),false,'off public snapshot must not expose its image');
      await as('authenticated',PUBLISHER);
      await save('media-sponsor',{...data,enabled:true},2); await publish('media-sponsor',3);
      await as('anon'); assert.equal(await canDownload(),true);
      await query("select set_config('test.storage_operation','object.list',false)"); assert.equal(await canDownload(),false);
      await query("select set_config('test.storage_operation','object.sign',false)"); assert.equal(await canDownload(),false);
      await query("select set_config('test.storage_operation','object.get_authenticated',false)");
      await as('authenticated',EDITOR);
      await save('media-sponsor',{...data,enabled:false},4);
      await as('anon'); assert.equal(await canDownload(),true,'draft off is not a public change');
      await as('authenticated',PUBLISHER); await publish('media-sponsor',5);
      await as('anon'); assert.equal(await canDownload(),false);
      await as('authenticated',EDITOR);
      await query("select set_config('test.storage_operation','object.sign',false)"); assert.equal(await canDownload(),true,'staff keep draft previews');
      // Deleting the actual object through the owner fixture makes later re-publication fail.
      await as('postgres'); await query('delete from storage.objects where name=$1',[path]);
      await as('authenticated',PUBLISHER);
      await rejected(save('media-sponsor',{...data,enabled:true},6));
      await unpublish('media-sponsor',6); // Removal must remain possible after an operator removed media.
    });
  });
}
