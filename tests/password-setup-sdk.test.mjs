import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const initial=new JSDOM('',{url:'https://preview.example.test/admin'});
function globals(dom){
 for(const key of ['window','document','localStorage'])globalThis[key]=dom.window[key];
 Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
}
globals(initial);globalThis.BroadcastChannel=undefined;
const {createClient}=await import('@supabase/supabase-js');
const {createAdminRepository}=await import('../src/cms/admin-repository.js');
const {CLIENT_PROJECT_URL}=await import('../src/cms/backend-config.js');
const id='11111111-1111-4111-8111-111111111111';
const user={id,email:'abawn@watchvim.us',aud:'authenticated',role:'authenticated',created_at:'2026-01-01T00:00:00Z'};
const jwt=method=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated',role:'authenticated',amr:[{method}],user_metadata:{label:'Fictional café 🌱'}})).toString('base64url'),'fixture-signature'].join('.');
async function fixture(t,{method='recovery',kind='implicit',invalid=false}={}){
 const access=jwt(method),state={updates:0,requests:[],fetches:0};
 const suffix=kind==='pkce'?'?code=fixture-code':kind==='missing-pkce'?'?code=unusable-code':kind==='expired'?'#error=access_denied&error_code=otp_expired&error_description=fixture-private-error&type=recovery':`#access_token=${access}&refresh_token=fixture-refresh&expires_in=3600&token_type=bearer&type=${method}`;
 const dom=new JSDOM('',{url:'https://preview.example.test/admin'+suffix});globals(dom);
 if(kind==='pkce')localStorage.setItem('inclusive-quest-cms-auth-v1-code-verifier',JSON.stringify('fixture-verifier/recovery'));
 const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
 const fetch=async(input,options={})=>{
  const url=new URL(String(input));state.fetches++;
  state.requests.push({path:url.pathname,grant:url.searchParams.get('grant_type'),method:options.method});
  assert.equal(url.searchParams.has('password'),false);assert.equal(url.searchParams.has('access_token'),false);
  if(url.pathname==='/auth/v1/token'){
   assert.equal(url.searchParams.get('grant_type'),'pkce');
   const body=JSON.parse(options.body);assert.equal(body.auth_code,'fixture-code');
   return response({access_token:access,refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user});
  }
  if(url.pathname==='/auth/v1/user'){
   if(invalid)return response({msg:'private invalid token',error_code:'bad_jwt'},401);
   if(options.method==='PUT'){state.updates++;assert.deepEqual(JSON.parse(options.body),{password:'fictional recovery passphrase',code_challenge:null,code_challenge_method:null});}
   return response(user);
  }
  if(url.pathname==='/rest/v1/rpc/cms_session')return response({role:'editor'});
  if(url.pathname==='/auth/v1/logout')return response({});
  throw new Error('Unexpected mocked Auth route');
 };
 let sdk;
 const repo=createAdminRepository({config:{url:CLIENT_PROJECT_URL,publishableKey:'sb_publishable_'+'f'.repeat(40)},callbackHash:window.location.hash,origin:window.location.origin,create:(url,key,options)=>{sdk=createClient(url,key,{...options,global:{fetch},auth:{...options.auth,autoRefreshToken:false}});return sdk;}});
 const stop=repo.onAuthStateChange(()=>{});
 t.after(async()=>{stop();await sdk.auth.stopAutoRefresh();dom.window.close();});
 return {repo,state,sdk};
}
for(const method of ['invite','recovery'])test('real SDK '+method+' callback verifies, clears fragment and gates password setup before workspace',async t=>{
 const {repo,state,sdk}=await fixture(t,{method});
 const session=await repo.getSession();assert.equal(session.requiresPasswordSetup,true);assert.equal(window.location.hash,'');
 assert.equal(state.updates,0);
 await assert.rejects(()=>repo.loadWorkspace(),{code:'PASSWORD_SETUP_REQUIRED'});
 assert.equal(state.requests.some(r=>r.path==='/rest/v1/rpc/cms_list_documents'),false);
 // Reload equivalent: no callback hash/hint. Verified token AMR retains the setup gate.
 const reopened=createAdminRepository({client:sdk,callbackHash:'',origin:window.location.origin});
 assert.equal((await reopened.getSession()).requiresPasswordSetup,true);
 await repo.completePasswordSetup('fictional recovery passphrase','fictional recovery passphrase',id);
 assert.equal(state.updates,1);assert.equal(await repo.getSession(),null);
 assert.equal(localStorage.getItem('inclusive-quest-cms-auth-v1'),null);
});
test('real SDK PKCE recovery exchange routes to setup and clears the code',async t=>{
 const {repo,state}=await fixture(t,{kind:'pkce'});
 assert.equal((await repo.getSession()).requiresPasswordSetup,true);
 assert.equal(window.location.search,'');assert.equal(state.updates,0);
 assert.ok(state.requests.some(r=>r.grant==='pkce'));
});
for(const kind of ['expired','missing-pkce','invalid'])test('real SDK '+kind+' callback fails closed without credential updates or callback URL residue',async t=>{
 const {repo,state}=await fixture(t,{kind:kind==='invalid'?'implicit':kind,invalid:kind==='invalid'});
 await assert.rejects(()=>repo.getSession(),/invalid|expired/);
 assert.equal(state.updates,0);assert.equal(window.location.hash,'');assert.equal(window.location.search,'');
 await assert.rejects(()=>repo.completePasswordSetup('fictional recovery passphrase','fictional recovery passphrase',id),/Could not confirm/);
 assert.equal(state.updates,0);
});
