import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedDocuments, createDraft, validateDocument, publicationIssues, DEFAULT_POST_AUTHOR, exportDrafts, importDrafts } from '../src/cms/content-model.js';
import { canonicalContent } from '../src/cms/canonical-content.js';
import { buildPublicContent, parsePublicSnapshot } from '../src/cms/public-reader.js';
import { createAdminRepository } from '../src/cms/admin-repository.js';
import { BRAND, TESTIMONIALS } from '../src/content.js';

const post = () => ({ ...createDraft('post', 'post-one').draft, title: 'A community story', slug: 'community-story', excerpt: 'Summary' });
const episode = () => ({ ...createDraft('episode', 'episode-one').draft, title: 'Show', episodeTitle: 'Next conversation', description: 'A future conversation' });
const home = () => canonicalContent('page', createSeedDocuments()[0].draft);
const publicRecord = (type, data, id=type) => ({ id, type, published: data });

test('refined seed copy removes only requested material and leaves unknown interpreter details blank', () => {
  const content = buildPublicContent();
  assert.equal(BRAND.tagline, ''); assert.equal(BRAND.footerTagline, 'Unveiling Access. One Quest at a Time.');
  assert.equal(content.HOME.subtitle, ''); assert.equal(content.FOUNDER.heading, '');
  for (const field of ['interpreterImageSrc', 'interpreterImageAlt', 'interpreterTitle', 'interpreterSubtitle']) assert.equal(content.HOME[field], '');
  assert.deepEqual(TESTIMONIALS.map(item => item.name), ['James McGowan', 'Juliana Vadala']);
  assert.equal(content.TITLES[0].comingSoon, true); assert.equal(content.TITLES[0].hostName, '');
});

test('new optional fields round-trip without changing old documents or inventing missing dates', () => {
  const oldHome = home();
  for (const key of Object.keys(oldHome).filter(key => key.startsWith('interpreter'))) delete oldHome[key];
  const oldPost = post(); delete oldPost.author; delete oldPost.date;
  const oldEpisode = episode(); delete oldEpisode.hostName; delete oldEpisode.comingSoon;
  for (const [type, data] of [['page', oldHome], ['post', oldPost], ['episode', oldEpisode]]) assert.deepEqual(canonicalContent(type, data), data);
  const content = buildPublicContent([publicRecord('page', oldHome, 'page-home'), publicRecord('post', oldPost), publicRecord('episode', oldEpisode)]);
  assert.equal(content.HOME.interpreterImageSrc, ''); assert.equal(content.POSTS[0].author, DEFAULT_POST_AUTHOR);
  assert.equal(content.POSTS[0].date, ''); assert.equal(content.TITLES[0].comingSoon, false); assert.equal(content.TITLES[0].hostName, '');
  assert.equal(post().author, DEFAULT_POST_AUTHOR);
});

test('basic post dates reject impossible dates and authors are bounded plain text', () => {
  for (const date of ['', '2024-02-29', '2026-10-22', '0001-01-01']) assert.deepEqual(validateDocument('post', { ...post(), date }), {});
  for (const date of ['2026-02-29', '2026-04-31', '0000-01-01', '10/22/2026', '2026-1-1', 'tomorrow', false, {}, '2026-10-22T00:00:00Z']) assert.ok(validateDocument('post', { ...post(), date }).date, String(date));
  assert.ok(validateDocument('post', { ...post(), author: 'x'.repeat(161) }).author);
  const data = { ...post(), author: 'Alma', date: '2026-10-22' };
  assert.deepEqual(canonicalContent('post', data), data);
});

test('coming-soon publication is explicit and never turns a string into a playback decision', () => {
  assert.ok(publicationIssues('episode', episode()).youtubeUrl);
  assert.deepEqual(publicationIssues('episode', { ...episode(), comingSoon: true, hostName: 'Approved host' }), {});
  for (const comingSoon of ['true', 'false', 1, null]) assert.ok(validateDocument('episode', { ...episode(), comingSoon }).comingSoon);
  assert.ok(validateDocument('episode', { ...episode(), hostName: 'x'.repeat(161) }).hostName);
});

test('coming-soon drafts can retain media but publication rejects every populated source', () => {
  const sources = { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', mainVideoSrc: 'https://example.test/main.mp4', aslVideoSrc: 'https://example.test/interpreter.mp4', captionsSrc: 'https://example.test/captions.vtt' };
  for (const [field, value] of Object.entries(sources)) {
    const data = { ...episode(), comingSoon: true, [field]: value };
    assert.deepEqual(validateDocument('episode', data), {}, `${field} can remain in a private draft`);
    assert.match(publicationIssues('episode', data)[field], /Remove media links/);
  }
  assert.deepEqual(publicationIssues('episode', { ...episode(), comingSoon: true, youtubeUrl: '', mainVideoSrc: null, aslVideoSrc: '', captionsSrc: null }), {});
});

test('interpreter image fields validate safe sources, alt text and optional label limits', () => {
  for (const interpreterImageSrc of ['javascript:x', 'data:image/png,x', '//evil.test/image.png', '/\\evil.test/image.png', 'https://evil.test/\\image.png']) assert.ok(validateDocument('page', { ...home(), interpreterImageSrc, interpreterImageAlt: 'Interpreter' }).interpreterImageSrc);
  assert.ok(validateDocument('page', { ...home(), interpreterImageSrc: '/inclusive-quest-logo.png', interpreterImageAlt: '' }).interpreterImageAlt);
  assert.ok(validateDocument('page', { ...home(), interpreterTitle: 'x'.repeat(161) }).interpreterTitle);
  assert.ok(validateDocument('page', { ...home(), interpreterSubtitle: 'x'.repeat(301) }).interpreterSubtitle);
  assert.deepEqual(validateDocument('page', { ...home(), interpreterImageSrc: '/inclusive-quest-logo.png', interpreterImageAlt: 'Approved placeholder' }), {});
});

test('new fields stay private in draft previews, public snapshots and exported draft imports', () => {
  const records = createSeedDocuments();
  Object.assign(records[0].draft, { interpreterTitle: 'Private interpreter', interpreterImageSrc: '/inclusive-quest-logo.png', interpreterImageAlt: 'Private picture' });
  assert.equal(buildPublicContent(records).HOME.interpreterTitle, '');
  assert.equal(buildPublicContent(records, { preview: true }).HOME.interpreterTitle, 'Private interpreter');
  const imported = importDrafts(exportDrafts(records), createSeedDocuments());
  assert.equal(imported[0].draft.interpreterTitle, 'Private interpreter'); assert.equal(imported[0].published.interpreterTitle, '');
  assert.throws(() => parsePublicSnapshot({ schemaVersion: 1, documents: [records[0]] }), /Invalid public content/);
});

test('signed preview resolves each independent image only in memory and reuses identical paths', async () => {
  const uid='11111111-1111-4111-8111-111111111111';
  const path=`${uid}/22222222-2222-4222-8222-222222222222.png`;
  const src=`/api/media?path=${path}`;
  const record={ ...createSeedDocuments()[0], revision: 1 };
  Object.assign(record.draft, { imageSrc: src, imageAlt: 'Generic image', interpreterImageSrc: src, interpreterImageAlt: 'Interpreter' });
  let requests=0;
  const client={ auth:{getUser:async()=>({data:{user:{id:uid}}})}, rpc:async()=>({data:{role:'editor'}}), storage:{from:()=>({createSignedUrl:async(p,seconds)=>{requests++;assert.equal(p,path);assert.equal(seconds,300);return {data:{signedUrl:'https://example.test/private-preview'}};}})} };
  const repo=createAdminRepository({client});
  const preview=await repo.previewDocuments([record]);
  assert.equal(requests,1); assert.equal(preview[0].draft.interpreterImageSrc,'https://example.test/private-preview');
  assert.equal(preview[0].draft.imageSrc,'https://example.test/private-preview'); assert.equal(record.draft.interpreterImageSrc,src);
  assert.equal(record.published.interpreterImageSrc,'');
});
