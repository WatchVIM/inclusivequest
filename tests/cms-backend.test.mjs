import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdminRepository, ConflictError } from '../src/cms/admin-repository.js';
import { CLIENT_PROJECT_URL, readBackendConfig, imagePathFromSource, detectImageType } from '../src/cms/backend-config.js';
import { canonicalContent } from '../src/cms/canonical-content.js';
import { createSeedDocuments } from '../src/cms/content-model.js';
import { contentHandler } from '../api/content.js';
import { mediaHandler } from '../api/media.js';
const uid='11111111-1111-4111-8111-111111111111';
const op='22222222-2222-4222-8222-222222222222';
const path=`${uid}/${op}.png`;
const key='sb_publishable_'+'a'.repeat(40);
const env={VITE_CMS_ENABLED:'true',VITE_SUPABASE_URL:CLIENT_PROJECT_URL,VITE_SUPABASE_PUBLISHABLE_KEY:key};
const saved=()=>({...createSeedDocuments()[0],revision:2});
function mockClient(overrides={}) {
  const calls=[];
  const client={
    auth:{ getUser:async()=>({data:{user:{id:uid,email:'editor@example.test'}}}),signInWithOtp:async data=>{calls.push(['signin',data]);return {};},signOut:async()=>({}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
    rpc:async(name,args)=>{calls.push([name,args]);return {data:name==='cms_session'?{role:'publisher'}:{document:saved()}}},
    ...overrides
  };
  return {client,calls};
}
function response() {
  return {headers:{},code:null,body:null,setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(b){this.body=b;return this;},send(b){this.body=b;return this;},end(){return this;}};
}

test('backend configuration rejects other projects, disabled flags and secret keys',()=>{
  assert.deepEqual(readBackendConfig(env),{url:CLIENT_PROJECT_URL,publishableKey:key});
  for(const bad of [{...env,VITE_CMS_ENABLED:'false'},{...env,VITE_SUPABASE_URL:'https://other.supabase.co'},{...env,VITE_SUPABASE_PUBLISHABLE_KEY:'sb_secret_'+ 'a'.repeat(40)},{...env,VITE_SUPABASE_PUBLISHABLE_KEY:'eyJlegacy-jwt'}]) assert.equal(readBackendConfig(bad),null);
});
test('canonical content strips legacy seed extras and canonicalizes YouTube URLs',()=>{
  const seed=createSeedDocuments().find(x=>x.type==='episode');
  const value=canonicalContent('episode',{...seed.draft,youtubeUrl:'https://youtu.be/dQw4w9WgXcQ?t=1'});
  assert.equal(value.youtubeUrl,'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.ok(!('id'in value));assert.ok(!('poster'in value));
});
test('sign in is invite-only with exact same-origin admin callback',async()=>{
  const {client,calls}=mockClient();const repo=createAdminRepository({client,origin:'https://preview.example.test'});
  await repo.requestSignIn('editor@example.test');
  assert.deepEqual(calls[0],['signin',{email:'editor@example.test',options:{shouldCreateUser:false,emailRedirectTo:'https://preview.example.test/admin'}}]);
  await assert.rejects(()=>repo.requestSignIn('bad'),/email/);
});
test('membership is verified live before mutation and cannot be supplied by the caller',async()=>{
  let writes=0;
  const {client}=mockClient({rpc:async(name)=>{if(name==='cms_session')return {error:{code:'PT403'}}; writes++; return {data:{document:saved()}};}});
  const repo=createAdminRepository({client,uuid:()=>op});
  await assert.rejects(()=>repo.saveDraft(saved(),1),{code:'ACCESS_DENIED'});
  assert.equal(writes,0);
});
test('uncertain save retries reuse an operation ID, and explicit revision conflict is visible',async()=>{
  let count=0; const ids=[];
  const {client}=mockClient({rpc:async(name,args)=>{
    if(name==='cms_session')return {data:{role:'editor'}};
    ids.push(args.p_operation_id);if(++count===1) return {error:{message:'Network interrupted'}};
    if(count===2)return {data:{document:saved(),replayed:true}};
    return {error:{code:'PT409'}};
  }});
  let n=0;const repo=createAdminRepository({client,uuid:()=>`${op}-${++n}`});
  await assert.rejects(()=>repo.saveDraft(saved(),1));
  assert.equal((await repo.saveDraft(saved(),1)).revision,2);
  assert.equal(ids[0],ids[1]);
  await assert.rejects(()=>repo.saveDraft(saved(),1),ConflictError);
  assert.notEqual(ids[1],ids[2]);
});
test('session loss blocks mutations',async()=>{
  const {client}=mockClient();client.auth.getUser=async()=>({error:{name:'AuthSessionMissingError'}});
  const repo=createAdminRepository({client});assert.equal(await repo.getSession(),null);
  await assert.rejects(()=>repo.publish('page-home',1),{code:'SESSION_EXPIRED'});
});
test('image URL parser and content signatures reject arbitrary paths and SVG',()=>{
  assert.equal(imagePathFromSource('/api/media?path='+path),path);
  for(const bad of ['/api/media?path=../secret','/api/media?path=https://evil.test/a.png','//evil.test/a.png','/api/media?path='+path+'&x=1']) assert.equal(imagePathFromSource(bad),null);
  assert.equal(detectImageType(new Uint8Array([137,80,78,71,13,10,26,10])),'image/png');
  assert.equal(detectImageType(new TextEncoder().encode('<svg>')) ,null);
});
test('image upload rejects invalid MIME bytes, size and missing alt before storage',async()=>{
  const {client}=mockClient();const repo=createAdminRepository({client});
  const file=new Blob(['<svg>'],{type:'image/png'});
  await assert.rejects(()=>repo.uploadImage(file,{alt:'Logo'}),/contents/);
  await assert.rejects(()=>repo.uploadImage(file,{alt:''}),/alternative/);
  await assert.rejects(()=>repo.uploadImage(new Blob(['x'],{type:'image/svg+xml'}),{alt:'Logo'}),/JPEG/);
});
test('public content endpoint ignores caller credentials and rejects draft-bearing responses',async()=>{
  let options; const published={schemaVersion:1,documents:[{id:'page-home',type:'page',published:saved().published}]};
  const create=(url,key,opts)=>{options=opts;return {rpc:async()=>({data:published})};};
  const res=response();await contentHandler({env,create})({method:'GET',headers:{authorization:'Bearer staff'}},res);
  assert.equal(res.code,200);assert.equal(res.headers['Cache-Control'],'no-store');assert.equal(options.auth.persistSession,false);assert.ok(!options.global);
  published.documents[0].draft=saved().draft;
  const bad=response();await contentHandler({env,create})({method:'GET'},bad);assert.equal(bad.code,503);
  const unconfigured=response();await contentHandler({env:{},create})({method:'GET'},unconfigured);assert.equal(unconfigured.code,503);
});
test('public media endpoint relies on anonymous download policy, never caller auth or URL fetch',async()=>{
  let downloaded;const png=new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0])],{type:'image/png'});
  const create=(url,key,options)=>{assert.ok(!options.global);return {storage:{from:bucket=>{assert.equal(bucket,'cms-images');return {download:async p=>{downloaded=p;return {data:png};}};}}};};
  const res=response();await mediaHandler({env,create})({method:'GET',query:{path},headers:{authorization:'Bearer staff'}},res);
  assert.equal(res.code,200);assert.equal(downloaded,path);assert.equal(res.headers['Content-Type'],'image/png');assert.equal(res.headers['X-Content-Type-Options'],'nosniff');
  const bad=response();await mediaHandler({env,create})({method:'GET',query:{path:'https://evil.test'}},bad);assert.equal(bad.code,400);
  const draft=response();await mediaHandler({env,create:()=>({storage:{from:()=>({download:async()=>({error:{message:'denied'}})})}})})({method:'GET',query:{path}},draft);assert.equal(draft.code,404);
});

test('invitation callback uses SDK implicit mode while ordinary sign-in stays PKCE', async()=>{
  const { authFlowForHash } = await import('../src/cms/admin-repository.js');
  assert.equal(authFlowForHash('#type=invite&access_token=fixture&refresh_token=fixture'), 'implicit');
  for (const hash of ['', '#type=magiclink&access_token=fixture&refresh_token=fixture', '#type=invite', '#code=fixture']) assert.equal(authFlowForHash(hash),'pkce');
  const {client}=mockClient();let options;
  createAdminRepository({config:readBackendConfig(env),callbackHash:'#type=invite&access_token=fixture&refresh_token=fixture',create:(url,key,opts)=>{options=opts;return client;}});
  assert.equal(options.auth.flowType,'implicit');assert.equal(options.auth.detectSessionInUrl,true);
});
test('invalid callback is surfaced without echoing tokens, and retry can recover',async()=>{
  const {client}=mockClient();client.auth.initialize=async()=>({error:{message:'bad fixture callback'}});
  const repo=createAdminRepository({client});
  await assert.rejects(()=>repo.getSession(),{code:'SESSION_EXPIRED'});
  assert.equal((await repo.getSession()).role,'publisher');
});
test('published preview omits draft-only records and never persists signed URLs',async()=>{
  const record=saved(); record.draft.imageSrc='/api/media?path='+path;record.draft.imageAlt='Diagram';record.published.imageSrc='/api/media?path='+path;record.published.imageAlt='Diagram';
  const {client}=mockClient();client.storage={from:()=>({createSignedUrl:async(p,seconds)=>{assert.equal(p,path);assert.equal(seconds,300);return {data:{signedUrl:'https://preview.example.test/temporary'}};}})};
  const repo=createAdminRepository({client});const input=[record,{...saved(),id:'draft-only',published:null}];
  const preview=await repo.previewDocuments(input,'published');assert.equal(preview.length,1);assert.equal(preview[0].draft.imageSrc,'https://preview.example.test/temporary');assert.equal(input[0].draft.imageSrc,'/api/media?path='+path);
});
test('public content response refuses oversized snapshots within the Vercel response budget',async()=>{
  const documents=Array.from({length:130},(_,i)=>({id:`post-${i}`,type:'post',published:{title:'Post',slug:`post-${i}`,excerpt:'Summary',template:'story',body:'x'.repeat(40000),imageSrc:'',imageAlt:''}}));
  const res=response();await contentHandler({env,create:()=>({rpc:async()=>({data:{schemaVersion:1,documents}})})})({method:'GET'},res);
  assert.equal(res.code,503);assert.ok(Buffer.byteLength(JSON.stringify(res.body))<500);
});
test('media accepts at most four million bytes and uploads enforce the same limit',async()=>{
  const {MAX_IMAGE_BYTES}=await import('../src/cms/backend-config.js');assert.equal(MAX_IMAGE_BYTES,4_000_000);
  const {client}=mockClient();const repo=createAdminRepository({client});
  await assert.rejects(()=>repo.uploadImage(new Blob([new Uint8Array(MAX_IMAGE_BYTES+1)],{type:'image/png'}),{alt:'Diagram'}),/4 MB/);
  const blob=new Blob([new Uint8Array([137,80,78,71,13,10,26,10]),new Uint8Array(MAX_IMAGE_BYTES-8)],{type:'image/png'});
  const create=()=>({storage:{from:()=>({download:async()=>({data:blob})})}});
  const res=response();await mediaHandler({env,create})({method:'GET',query:{path}},res);assert.equal(res.code,200);assert.equal(res.body.length,MAX_IMAGE_BYTES);
  const large=response();await mediaHandler({env,create:()=>({storage:{from:()=>({download:async()=>({data:{size:MAX_IMAGE_BYTES+1}})})}})})({method:'GET',query:{path}},large);assert.equal(large.code,404);
});
