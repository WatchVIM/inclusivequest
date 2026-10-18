import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeedDocuments, createDraft, validateDocument, validateDraftCollection, parseYouTubeUrl, isSafeImageUrl, publicationIssues, documentStatus, exportDrafts, importDrafts } from '../src/cms/content-model.js';
import { adminRepository, SetupRequiredError } from '../src/cms/admin-repository.js';
import { buildPublicContent, parsePublicSnapshot, fetchPublicContent, safePublicAssetUrl } from '../src/cms/public-reader.js';

const clone = value => JSON.parse(JSON.stringify(value));
const episode = () => ({ ...createDraft('episode', 'test-episode').draft, title: 'IQ conversations', episodeTitle: 'A more accessible world', description: 'An interview.', youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ', category: 'Podcast', tags: ['accessibility'] });

test('all existing content seeds validate and preserve original published references', () => {
  const records = createSeedDocuments();
  assert.doesNotThrow(() => validateDraftCollection(records));
  records.forEach(record => { assert.deepEqual(record.draft, record.published); assert.equal(documentStatus(record), 'Published reference'); });
  const altered = createSeedDocuments(); altered[0].draft.heading = 'Changed';
  assert.notEqual(altered[0].draft.heading, altered[0].published.heading);
  assert.notEqual(altered[0].draft.heading, createSeedDocuments()[0].draft.heading);
});

test('normalizes supported YouTube formats to one safe embed host', () => {
  for (const input of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=abc', 'https://youtu.be/dQw4w9WgXcQ?t=20', 'https://youtube.com/shorts/dQw4w9WgXcQ', 'https://m.youtube.com/live/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ']) {
    assert.deepEqual(parseYouTubeUrl(input), { videoId: 'dQw4w9WgXcQ', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' });
  }
});

test('rejects executable, deceptive, playlist-only and malformed YouTube links', () => {
  for (const input of ['', null, 'javascript:alert(1)', 'http://youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ', 'https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ', 'https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com:123/watch?v=dQw4w9WgXcQ', 'https://youtube.com/playlist?list=dQw4w9WgXcQ', 'https://youtu.be/short', '<iframe src="https://youtube.com"></iframe>', 'https://youtu.be/dQw4w9WgXcQ/extra']) assert.equal(parseYouTubeUrl(input), null, String(input));
});

test('rejects dangerous image URLs and requires useful alt text', () => {
  for (const value of ['javascript:alert(1)', 'data:image/svg+xml,x', '//evil.test/image.png', '/\\evil.test/image.png', 'https://name:secret@host.test/image.png']) { assert.equal(isSafeImageUrl(value), false); assert.equal(safePublicAssetUrl(value), ''); }
  assert.equal(isSafeImageUrl('/inclusive-quest-logo.png'), true);
  assert.equal(isSafeImageUrl('https://cdn.example.test/photo.jpg'), true);
  assert.ok(validateDocument('episode', {...episode(), imageSrc:'/image.jpg', imageAlt:''}).imageAlt);
  assert.deepEqual(validateDocument('episode', {...episode(), imageSrc:'/image.jpg', imageAlt:'An interpreter signing.'}), {});
});

test('validates titles, tags, slugs, text limits and templates', () => {
  assert.ok(validateDocument('episode', {...episode(), tags:['']}).tags);
  assert.ok(validateDocument('episode', {...episode(), tags:Array(21).fill('tag')}).tags);
  assert.ok(validateDocument('episode', {...episode(), episodeTitle:''}).episodeTitle);
  assert.ok(validateDocument('episode', {...episode(), description:'x'.repeat(10001)}).description);
  assert.ok(validateDocument('post', {...createDraft('post','post-one').draft, title:'Story', slug:'Invalid Slug', excerpt:'Summary', template:'unknown'}).slug);
  assert.ok(validateDocument('post', {...createDraft('post','post-one').draft, title:'Story', slug:'story', excerpt:'Summary', template:'unknown'}).template);
  assert.throws(() => createDraft('dangerous','abc'));
});

test('publication readiness allows validated YouTube or paired licensed media', () => {
  assert.deepEqual(publicationIssues('episode', episode()), {});
  assert.ok(publicationIssues('episode', {...episode(), youtubeUrl:''}).youtubeUrl);
  assert.deepEqual(publicationIssues('episode', {...episode(), youtubeUrl:'', mainVideoSrc:'/episode.mp4', aslVideoSrc:'/interpreter.mp4'}), {});
});

test('review download/import preserves drafts without manufacturing published records', () => {
  const records = createSeedDocuments(); records[0].draft.heading = 'Review heading';
  const fresh = { id:'episode-new', type:'episode', draft:episode(), published:null, revision:1 }; records.push(fresh);
  const serialized = exportDrafts(records); const parsed = JSON.parse(serialized);
  assert.equal(parsed.kind, 'inclusive-quest-draft-review');
  assert.ok(parsed.drafts.every(item => !Object.hasOwn(item,'published')));
  parsed.drafts.find(item => item.id === 'episode-new').published = episode();
  const restored = importDrafts(JSON.stringify(parsed), createSeedDocuments());
  assert.equal(restored[0].draft.heading,'Review heading');
  assert.equal(restored[0].published.heading,'Accessible Podcasts.');
  assert.equal(restored.find(item => item.id === 'episode-new').published, null);
  assert.equal(documentStatus(restored.find(item => item.id === 'episode-new')), 'Draft only');
  assert.equal(documentStatus(restored[0]), 'Unpublished changes');
});

test('draft imports reject malformed, oversized, duplicate and type-changing files', () => {
  const records = createSeedDocuments(); const payload = JSON.parse(exportDrafts(records));
  assert.throws(() => importDrafts('{bad',records));
  assert.throws(() => importDrafts('x'.repeat(1024*1024+1),records));
  assert.throws(() => importDrafts(JSON.stringify({...payload,schemaVersion:2}),records));
  assert.throws(() => importDrafts(JSON.stringify({...payload,drafts:[...payload.drafts,payload.drafts[0]]}),records));
  payload.drafts[0].type = 'testimonial';
  assert.throws(() => importDrafts(JSON.stringify(payload), records), /type cannot be changed/);
});

test('public adapter never reads draft fields without explicit preview', () => {
  const records = createSeedDocuments(); records[0].draft.heading = 'Private draft heading';
  records.push({id:'new-episode',type:'episode',draft:episode(),published:null,revision:1});
  const published = buildPublicContent(records); const preview = buildPublicContent(records,{preview:true});
  assert.equal(published.HOME.heading,'Accessible Podcasts.');
  assert.equal(preview.HOME.heading,'Private draft heading');
  assert.equal(published.TITLES.length,1); assert.equal(preview.TITLES.length,2);
  assert.equal(preview.TITLES[1].youtubeUrl,'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});

test('published YouTube snapshot drives website model including tags and image alt', () => {
  const documents = [{id:'published-video',type:'episode',published:{...episode(),imageSrc:'/image.jpg',imageAlt:'Episode artwork'}}];
  const result = buildPublicContent(parsePublicSnapshot({schemaVersion:1,documents}));
  assert.equal(result.TITLES.length,1); assert.equal(result.TITLES[0].id,'published-video');
  assert.equal(result.TITLES[0].episodeTitle,'A more accessible world');
  assert.deepEqual(result.TITLES[0].tags,['accessibility']);
  assert.equal(result.TITLES[0].imageAlt,'Episode artwork');
});

test('public snapshot boundary rejects draft-bearing, duplicate, malformed and wrong-version API responses', () => {
  const record = {id:'video',type:'episode',published:episode()};
  for (const payload of [{schemaVersion:2,documents:[record]},{schemaVersion:1,documents:[{...record,draft:episode()}]},{schemaVersion:1,documents:[record,record]},{schemaVersion:1,documents:[{...record,published:{...episode(),youtubeUrl:'javascript:x'}}]}, {schemaVersion:1,documents:[{id:'bad'}]}]) assert.throws(()=>parsePublicSnapshot(payload));
});

test('public reader uses only same-origin read endpoint and falls back safely', async () => {
  let call;
  const content = await fetchPublicContent({fetchImpl:async (path, options) => { call={path,options}; return {ok:true,headers:{get:()=> 'application/json'},json:async()=>({schemaVersion:1,documents:[{id:'video',type:'episode',published:episode()}]})}; }});
  assert.equal(call.path,'/api/content'); assert.equal(call.options.method,'GET'); assert.equal(content.TITLES[0].id,'video');
  for (const fetchImpl of [async()=>{throw new Error('offline');},async()=>({ok:false}),async()=>({ok:true,headers:{get:()=> 'text/html'}}),async()=>({ok:true,json:async()=>({bad:true})})]) {
    const fallback = await fetchPublicContent({fetchImpl}); assert.equal(fallback.TITLES[0].id,'she-wears-the-pants');
  }
});

test('public adapter handles empty collections, unpublishing and malformed input without draft leakage', () => {
  const empty = buildPublicContent([]); assert.deepEqual(empty.TITLES,[]); assert.equal(empty.HOME.heading,'Accessible Podcasts.');
  const seeds=createSeedDocuments(); const record=seeds.find(item=>item.type==='episode'); record.published=null;
  assert.equal(buildPublicContent(seeds).TITLES.length,0);
  assert.equal(buildPublicContent(null).TITLES.length,1);
});

test('admin persistence, authentication, image upload and publishing fail closed', async () => {
  assert.equal(await adminRepository.getSession(),null);
  assert.deepEqual(adminRepository.capabilities,{signIn:false,saveDraft:false,publish:false,upload:false});
  for (const action of ['signIn','saveDraft','publish','upload']) await assert.rejects(()=>adminRepository[action](),SetupRequiredError);
});
