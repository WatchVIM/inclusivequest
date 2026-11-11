import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminRepository,passwordSetupFeedback} from '../src/cms/admin-repository.js';
const id='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222';
const password='fictional long passphrase';
const token=(subject=id,method='recovery')=>['fixture',Buffer.from(JSON.stringify({sub:subject,amr:[{method}]})).toString('base64url'),'fixture'].join('.');
function fixture(){
 let callback;const state={id,method:'recovery',updates:0,logout:0,calls:[],member:true};
 const client={auth:{
  getSession:async()=>({data:{session:state.id?{access_token:token(state.id,state.method),user:{id:state.id}}:null}}),
  getUser:async jwt=>{state.calls.push(['verified',Boolean(jwt)]);return {data:{user:state.id?{id:state.id,email:'abawn@watchvim.us'}:null}};},
  updateUser:async data=>{state.updates++;assert.deepEqual(data,{password});return {data:{user:{id:state.id}}};},
  signOut:async()=>{state.logout++;state.id=null;callback?.('SIGNED_OUT',null);return {};},
  signInWithPassword:async()=>{state.id=id;state.method='password';return {};},
  onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}};}
 },rpc:async name=>{state.calls.push([name]);return {data:name==='cms_session'&&state.member?{role:'editor'}:null};}};
 const repo=createAdminRepository({client,origin:'https://preview.example.test'});repo.onAuthStateChange(()=>{});
 return {repo,state,client,event:(name,userId)=>callback?.(name,{user:{id:userId}})};
}
test('password feedback requires length and exact confirmation without trimming',()=>{
 assert.match(passwordSetupFeedback('short','short'),/12/);
 assert.match(passwordSetupFeedback(password,'different'),/match/);
 assert.match(passwordSetupFeedback('x'.repeat(129),'x'.repeat(129)),/128/);
 assert.equal(passwordSetupFeedback(password,password),'');
});
test('verified recovery session cannot load workspace and updates only after explicit submission',async()=>{
 const {repo,state}=fixture();
 assert.equal((await repo.getSession()).requiresPasswordSetup,true);
 assert.equal(state.updates,0);
 await assert.rejects(()=>repo.loadWorkspace(),{code:'PASSWORD_SETUP_REQUIRED'});
 assert.equal(state.calls.some(x=>x[0]==='cms_list_documents'),false);
 assert.deepEqual(await repo.completePasswordSetup(password,password,id),{requiresFreshSignIn:true});
 assert.equal(state.updates,1);assert.equal(state.logout,1);assert.equal(await repo.getSession(),null);
 assert.equal((await repo.requestSignIn('abawn@watchvim.us',password)).requiresPasswordSetup,undefined);
});
test('unknown, expired, changed identity, bad confirmation and ordinary sessions cannot set passwords',async()=>{
 for(const kind of ['nonmember','expired','changed','password','confirmation']){
  const {repo,state}=fixture();
  if(kind==='nonmember')state.member=false;
  if(kind==='expired')state.id=null;
  if(kind==='changed')state.id=other;
  if(kind==='password')state.method='password';
  await assert.rejects(()=>repo.completePasswordSetup(password,kind==='confirmation'?'different':password,id),/Could not confirm/);
  assert.equal(state.updates,0);
 }
});
test('repeated submits are serialized and password saved plus signout failure is explicit',async()=>{
 const {repo,state,client}=fixture();let finish;
 client.auth.updateUser=async()=>{state.updates++;return new Promise(resolve=>{finish=()=>resolve({data:{user:{id}}});});};
 const pending=repo.completePasswordSetup(password,password,id);
 while(!finish)await new Promise(resolve=>setTimeout(resolve,0));
 await assert.rejects(()=>repo.completePasswordSetup(password,password,id),/Could not confirm/);
 client.auth.signOut=async()=>{throw new Error('private network detail');};finish();
 await assert.rejects(()=>pending,{code:'PASSWORD_SAVED_SIGNOUT_REQUIRED'});
 assert.equal(state.updates,1);
 await assert.rejects(()=>repo.loadWorkspace(),{code:'PASSWORD_SETUP_REQUIRED'});
 await assert.rejects(()=>repo.completePasswordSetup(password,password,id),/Could not confirm/);
 assert.equal(state.updates,1);
});
test('identity change during preflight aborts update and hides provider errors',async()=>{
 const {repo,state,client,event}=fixture();let n=0;
 client.auth.getUser=async()=>{if(++n===2){state.id=other;event('SIGNED_IN',other);}return {data:{user:{id:state.id}}};};
 await assert.rejects(()=>repo.completePasswordSetup(password,password,id),/Could not confirm/);assert.equal(state.updates,0);
 const next=fixture();next.client.auth.updateUser=async()=>({error:{message:'private password policy detail'}});
 await assert.rejects(()=>next.repo.completePasswordSetup(password,password,id),error=>/Could not confirm/.test(error.message)&&!error.message.includes('private'));
});
test('callback type by itself cannot authorize a password update',async()=>{
 const {client,state}=fixture();state.method='password';
 const repo=createAdminRepository({client,origin:'https://preview.example.test',callbackHash:'#type=invite'});
 await assert.rejects(()=>repo.completePasswordSetup(password,password,id),/Could not confirm/);assert.equal(state.updates,0);
});
test('session change while update is pending cannot reopen workspace or silently repeat the update',async()=>{
 const {repo,state,client,event}=fixture();let finish;
 client.auth.updateUser=async()=>{state.updates++;return new Promise(resolve=>{finish=()=>resolve({data:{user:{id}}});});};
 const pending=repo.completePasswordSetup(password,password,id);
 while(!finish)await new Promise(resolve=>setTimeout(resolve,0));
 state.id=other;event('SIGNED_IN',other);finish();
 await assert.rejects(()=>pending,{code:'PASSWORD_SAVED_SIGNOUT_REQUIRED'});
 await assert.rejects(()=>repo.loadWorkspace(),{code:'PASSWORD_SETUP_REQUIRED'});
 assert.equal(state.updates,1);
});
