import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {url:'http://localhost/admin'});
for (const key of ['window','document','HTMLElement','HTMLDialogElement','HTMLInputElement','Node','Event','KeyboardEvent','MutationObserver','File','FileReader']) globalThis[key]=dom.window[key];
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
const React = await import('react');
const {render,screen,within,fireEvent,cleanup} = await import('@testing-library/react');
const userEvent = (await import('@testing-library/user-event')).default;
const output = await build({entryPoints:['src/admin/AdminApp.jsx'],bundle:true,write:false,format:'esm',platform:'node',packages:'external',loader:{'.css':'empty'},define:{__ADMIN_PREVIEW_ENABLED__:'true','import.meta.env.VITE_CMS_ENABLED':'"false"'}});
const temp=new URL('../.admin-dom-test-bundle.mjs',import.meta.url);
await writeFile(temp,output.outputFiles[0].text);
const AdminApp=(await import(temp.href)).default;
await unlink(temp);
afterEach(()=>{cleanup();window.localStorage.clear();});
async function open(){render(React.createElement(AdminApp));const user=userEvent.setup({document:dom.window.document});await user.click(screen.getByRole('button',{name:'Open review workspace'}));return user;}
async function section(user,name){await user.click(within(screen.getByRole('navigation',{name:'Content sections'})).getByRole('button',{name:new RegExp('^'+name+' ')}));}

test('unsaved new item cannot poison other kept content',async()=>{
 const user=await open();await section(user,'Blog posts');await user.click(screen.getByRole('button',{name:'+ Add post'}));
 await section(user,'Pages');
 assert.ok(screen.getByRole('dialog',{name:'Discard unsaved field changes?'}));
 await user.click(screen.getByRole('button',{name:'Continue',exact:true}));
 fireEvent.change(screen.getByLabelText('Page heading'),{target:{value:'Reviewed heading'}});
 await user.click(screen.getByRole('button',{name:'Keep draft in this tab'}));
 assert.match(screen.getByRole('status').textContent,/Draft kept in this tab/);
 await section(user,'Blog posts');assert.match(screen.getByText('No content here yet. Add your first draft.').textContent,/No content/);
});

test('kept changes appear in actual site preview, reference remains original and URL stays isolated',async()=>{
 const user=await open();
 fireEvent.change(screen.getByLabelText('Page heading'),{target:{value:'Reviewed heading'}});
 await user.click(screen.getByRole('button',{name:'Keep draft in this tab'}));
 await user.click(screen.getByRole('button',{name:'Preview website',exact:true}));
 let dialog=screen.getByRole('dialog',{name:'Draft website preview'});
 assert.ok(within(dialog).getByRole('heading',{name:/Reviewed heading/}));
 assert.equal(dialog.closest('.admin-root'),null,'Site preview must be outside editor CSS selectors');
 await user.click(within(dialog).getByRole('navigation',{name:'Main navigation'}).querySelectorAll('button')[1]);
 assert.equal(window.location.hash,'');
 assert.equal(window.localStorage.length,0);
 await user.click(screen.getByRole('button',{name:'Close Draft website preview'}));
 await user.click(screen.getByRole('button',{name:'View published reference'}));
 dialog=screen.getByRole('dialog',{name:'Published reference preview'});
 assert.ok(within(dialog).getByRole('heading',{name:/Accessible Podcasts/}));
 assert.equal(screen.getByRole('button',{name:'Publish (not connected)'}).disabled,true);
});

test('episode editor validates and renders the new YouTube entry through public pages',async()=>{
 const user=await open();await section(user,'YouTube episodes');await user.click(screen.getByRole('button',{name:'+ Add episode'}));
 for(const [label,value] of [['Show title','Test show'],['Episode title','Test episode'],['Description','Episode description'],['YouTube video URL','https://evil.test/embed/test']]) fireEvent.change(screen.getByLabelText(label,{exact:true}),{target:{value}});
 await user.click(screen.getByRole('button',{name:'Keep draft in this tab'}));
 assert.equal(screen.getByLabelText('YouTube video URL').getAttribute('aria-invalid'),'true');
 fireEvent.change(screen.getByLabelText('YouTube video URL'),{target:{value:'https://youtu.be/dQw4w9WgXcQ'}});
 await user.click(screen.getByRole('button',{name:'Keep draft in this tab'}));
 assert.match(screen.getByRole('status').textContent,/Draft kept in this tab/);
 await user.click(screen.getByRole('button',{name:'Preview website',exact:true}));
 const dialog=screen.getByRole('dialog',{name:'Draft website preview'});
 await user.click(within(within(dialog).getByRole('navigation',{name:'Main navigation'})).getByRole('button',{name:'Explore',exact:true}));
 fireEvent.change(within(dialog).getByLabelText('Search podcasts by topic or interpreter'),{target:{value:'Test episode'}});
 await user.click(within(dialog).getByRole('button',{name:'View Episode'}));
 assert.equal(dialog.querySelectorAll('iframe').length,0);
 await user.click(within(dialog).getByRole('button',{name:'Load YouTube video'}));
 assert.equal(dialog.querySelector('iframe').getAttribute('src'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&cc_load_policy=1');
});

test('cancelled field-change dialog preserves form values and reset restores reference',async()=>{
 const user=await open();fireEvent.change(screen.getByLabelText('Page heading'),{target:{value:'Keep me'}});
 await section(user,'Founder');await user.click(screen.getByRole('button',{name:'Keep editing'}));
 assert.equal(screen.getByLabelText('Page heading').value,'Keep me');
 await user.click(screen.getByRole('button',{name:'Keep draft in this tab'}));
 await user.click(screen.getByRole('button',{name:'Reset draft to published reference'}));
 await user.click(screen.getByRole('button',{name:'Continue',exact:true}));
 assert.equal(screen.getByLabelText('Page heading').value,'Accessible Podcasts.');
});
