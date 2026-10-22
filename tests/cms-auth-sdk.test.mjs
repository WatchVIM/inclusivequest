import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// This uses the installed SDK with an in-process fake HTTP server. No real
// credentials, email, Supabase project or external network is used.
const uid='11111111-1111-4111-8111-111111111111';
const now=Math.floor(Date.now()/1000);
const jwt=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:uid,exp:now+3600,iat:now,aud:'authenticated',role:'authenticated'})).toString('base64url'),'fixture-signature'].join('.');
const dom=new JSDOM('',{url:`https://preview.example.test/admin#access_token=${jwt}&refresh_token=fixture-refresh&expires_in=3600&token_type=bearer&type=invite`});
for(const key of ['window','document','localStorage'])globalThis[key]=dom.window[key];
// Node's BroadcastChannel would keep this isolated test process open.
globalThis.BroadcastChannel=undefined;
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
const {createClient}=await import('@supabase/supabase-js');
const {createAdminRepository}=await import('../src/cms/admin-repository.js');
const {CLIENT_PROJECT_URL}=await import('../src/cms/backend-config.js');

test('real Supabase SDK accepts invitation callback, clears tokens and rechecks membership',async t=>{
  const requests=[];let sdk;
  const user={id:uid,email:'editor@example.test',aud:'authenticated',role:'authenticated',created_at:'2026-10-18T00:00:00Z'};
  const fetch=async(input,options={})=>{
    const url=new URL(String(input));requests.push({path:url.pathname,method:options.method,authorization:new Headers(options.headers).get('authorization')});
    if(url.pathname==='/auth/v1/user')return new Response(JSON.stringify(user),{status:200,headers:{'content-type':'application/json'}});
    if(url.pathname==='/rest/v1/rpc/cms_session')return new Response(JSON.stringify({user:{id:uid},role:'editor'}),{status:200,headers:{'content-type':'application/json'}});
    if(url.pathname==='/auth/v1/logout')return new Response('{}',{status:200,headers:{'content-type':'application/json'}});
    throw new Error('Unexpected SDK request '+url.pathname);
  };
  const repo=createAdminRepository({config:{url:CLIENT_PROJECT_URL,publishableKey:'sb_publishable_'+'f'.repeat(40)},callbackHash:window.location.hash,origin:window.location.origin,create:(url,key,options)=>{sdk=createClient(url,key,{...options,global:{fetch},auth:{...options.auth,autoRefreshToken:false}});return sdk;}});
  t.after(async()=>{await sdk.auth.signOut({scope:'local'});await sdk.auth.stopAutoRefresh();dom.window.close();});
  const session=await repo.getSession();assert.equal(session.user.id,uid);assert.equal(session.role,'editor');
  assert.equal(window.location.hash,'');
  assert.ok(requests.filter(r=>r.path==='/auth/v1/user').length>=2);
  assert.equal(requests.find(r=>r.path==='/rest/v1/rpc/cms_session').authorization,'Bearer '+jwt);
  assert.ok(localStorage.getItem('inclusive-quest-cms-auth-v1'));
});

test('real Supabase SDK creates a PKCE magic-link request with signup disabled',async t=>{
  const normal=new JSDOM('',{url:'https://preview.example.test/admin'});
  for(const key of ['window','document','localStorage'])globalThis[key]=normal.window[key];
  Object.defineProperty(globalThis,'navigator',{value:normal.window.navigator,configurable:true});
  let sdk;let request;
  const fetch=async(input,options={})=>{
    const url=new URL(String(input));
    assert.equal(url.pathname,'/auth/v1/otp');request={url,body:JSON.parse(options.body)};
    return new Response('{}',{status:200,headers:{'content-type':'application/json'}});
  };
  const repo=createAdminRepository({config:{url:CLIENT_PROJECT_URL,publishableKey:'sb_publishable_'+'f'.repeat(40)},callbackHash:'',origin:window.location.origin,create:(url,key,options)=>{sdk=createClient(url,key,{...options,global:{fetch},auth:{...options.auth,autoRefreshToken:false,storageKey:'iq-pkce-sdk-test'}});return sdk;}});
  t.after(async()=>{await sdk.auth.stopAutoRefresh();normal.window.close();});
  await repo.requestSignIn('editor@example.test');
  assert.equal(request.body.email,'editor@example.test');assert.equal(request.body.create_user,false);
  assert.equal(request.body.code_challenge_method,'s256');assert.ok(request.body.code_challenge.length>=40);
  assert.equal(request.url.searchParams.get('redirect_to'),'https://preview.example.test/admin');
});
