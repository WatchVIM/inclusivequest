import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraft, createSeedDocuments, validateDocument, publicationIssues } from '../src/cms/content-model.js';
import { canonicalContent } from '../src/cms/canonical-content.js';
import { buildPublicContent, parsePublicSnapshot } from '../src/cms/public-reader.js';
import { visibleSponsor } from '../src/sponsors/sponsor-model.js';
import { contentHandler } from '../api/content.js';
import { CLIENT_PROJECT_URL } from '../src/cms/backend-config.js';
const sponsor = (extra = {}) => ({ ...createDraft('sponsor', 'sponsor-home').draft, enabled: true, name: 'Approved advertiser', imageSrc: '/inclusive-quest-logo.png', imageAlt: 'Approved advertiser logo', destinationUrl: 'https://example.com/', ...extra });
const record = (id, data, draft = data) => ({ id, type: 'sponsor', published: data, draft, revision: 1 });

test('CMS sponsors start off, empty and undecided without adding published seeds', () => {
  const item = createDraft('sponsor', 'sponsor-new');
  assert.equal(item.draft.enabled, false); assert.equal(item.draft.targeting, 'undecided'); assert.equal(item.draft.episodeId, '');
  assert.equal(item.published, null); assert.deepEqual(validateDocument('sponsor', item.draft), {});
  assert.equal(createSeedDocuments().some(item => item.type === 'sponsor'), false);
});
test('draft save allows incomplete enabled content but publication requires complete resolved targeting', () => {
  const draft = { ...createDraft('sponsor', 'sponsor-new').draft, placement: 'episode', enabled: true };
  assert.deepEqual(validateDocument('sponsor', draft), {});
  for (const key of ['name', 'imageSrc', 'imageAlt', 'destinationUrl', 'targeting']) assert.ok(publicationIssues('sponsor', draft)[key], key);
  assert.deepEqual(validateDocument('sponsor', sponsor({ placement: 'episode', targeting: 'episode', episodeId: '' })), {});
  assert.ok(publicationIssues('sponsor', sponsor({ placement: 'episode', targeting: 'episode', episodeId: '' })).episodeId);
  assert.ok(validateDocument('sponsor', sponsor({ enabled: 'true' })).enabled);
  assert.ok(validateDocument('sponsor', sponsor({ targeting: 'shared' })).targeting);
  assert.ok(validateDocument('sponsor', sponsor({ episodeId: 'unwanted-target' })).episodeId);
  assert.ok(validateDocument('sponsor', sponsor({ imageAlt: '' })).imageAlt);
});
test('unsafe destinations are blocked even in off drafts and canonical sponsor fields exclude extras', () => {
  for (const destinationUrl of ['javascript:alert(1)', 'https://localhost/', 'https://example.com:443/', 'https://example.com/%ZZ', 'https://example.com/%', 'https://a:b@example.com', 'https://example.com/white space']) {
    assert.ok(validateDocument('sponsor', sponsor({ destinationUrl, enabled: false })).destinationUrl, destinationUrl);
  }
  const clean = canonicalContent('sponsor', { ...sponsor(), privateNote: 'must not escape', role: 'publisher' });
  assert.deepEqual(Object.keys(clean).sort(), ['placement', 'enabled', 'name', 'imageSrc', 'imageAlt', 'destinationUrl', 'targeting', 'episodeId'].sort());
});
test('publish checks require a currently published episode and reject overlapping placements', () => {
  const episodes = createSeedDocuments(); const episodeId = episodes.find(item => item.type === 'episode').id;
  const targeted = sponsor({ placement: 'episode', targeting: 'episode', episodeId });
  assert.deepEqual(publicationIssues('sponsor', targeted, episodes, 'new'), {});
  assert.ok(publicationIssues('sponsor', targeted, [], 'new').episodeId);
  assert.ok(publicationIssues('sponsor', targeted, [...episodes, record('shared', sponsor({ placement: 'episode', targeting: 'shared' }))], 'new').placement);
  assert.ok(publicationIssues('sponsor', sponsor(), [record('old', sponsor())], 'new').placement);
  assert.deepEqual(publicationIssues('sponsor', sponsor({ enabled: false }), [record('old', sponsor())], 'new'), {});
  assert.deepEqual(publicationIssues('sponsor', targeted, [...episodes, record('self', targeted)], 'self'), {});
});
test('public adapter never leaks off, unpublished, unresolved, invalid or draft-only sponsors', () => {
  const documents = [record('live', sponsor(), sponsor({ name: 'Private changed advertiser' })),
    record('off', sponsor({ enabled: false, name: 'Disabled advertiser' })), record('draft', null, sponsor({ name: 'Draft advertiser' })),
    record('undecided', sponsor({ placement: 'episode' })), record('unsafe', sponsor({ destinationUrl: 'javascript:x' }))];
  const content = buildPublicContent(documents);
  assert.equal(content.SPONSORS.length, 1); assert.equal(content.SPONSORS[0].name, 'Approved advertiser');
  assert.doesNotMatch(JSON.stringify(content.SPONSORS), /Private|Disabled|Draft/);
  assert.equal(buildPublicContent().SPONSORS.length, 0);
  assert.equal(buildPublicContent(documents, { preview: true }).SPONSORS.find(item => item.id === 'live').name, 'Private changed advertiser');
});
test('current episode selection is exact and conflicts fail closed rather than choosing an advertiser', () => {
  const first = sponsor({ placement: 'episode', targeting: 'episode', episodeId: 'first' });
  const second = sponsor({ placement: 'episode', targeting: 'episode', episodeId: 'second', name: 'Second advertiser' });
  assert.equal(visibleSponsor([first, second], 'episode', 'first').name, 'Approved advertiser');
  assert.equal(visibleSponsor([first, second], 'episode', 'second').name, 'Second advertiser');
  assert.equal(visibleSponsor([first, second], 'episode', 'missing'), null);
  assert.equal(visibleSponsor([first], 'episode'), null);
  assert.equal(visibleSponsor([first, { ...first }], 'episode', 'first'), null);
  assert.equal(visibleSponsor([first, sponsor({ placement: 'episode', targeting: 'shared' })], 'episode', 'first'), null);
  assert.equal(visibleSponsor([sponsor({ placement: 'episode' })], 'episode', 'first'), null);
});
test('public snapshot strips disabled/unresolved/unpublished/orphaned sponsors and unknown fields', () => {
  const published = data => ({ id: data.id, type: 'sponsor', published: data.published });
  const documents = [record('live', { ...sponsor(), privateNote: 'never serialize' }), record('off', sponsor({ enabled: false, name: 'Disabled secret' })),
    record('draft', null), record('unresolved', sponsor({ placement: 'episode' })),
    record('orphan', sponsor({ placement: 'episode', targeting: 'episode', episodeId: 'missing' }))].map(published);
  const result = parsePublicSnapshot({ schemaVersion: 1, documents });
  assert.equal(result.length, 1); assert.equal(result[0].id, 'live'); assert.equal(result[0].published.privateNote, undefined);
  assert.doesNotMatch(JSON.stringify(result), /Disabled secret|never serialize/);
  assert.throws(() => parsePublicSnapshot({ schemaVersion: 1, documents: [record('leak', sponsor())] }), /Invalid public/);
});
test('anonymous content endpoint cannot serialize off sponsor content from a misconfigured backend', async () => {
  const env = { VITE_CMS_ENABLED: 'true', VITE_SUPABASE_URL: CLIENT_PROJECT_URL, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_' + 'a'.repeat(40) };
  const documents = [{ id: 'off', type: 'sponsor', published: sponsor({ enabled: false, name: 'Off campaign secret' }) }, { id: 'on', type: 'sponsor', published: sponsor() }];
  const create = () => ({ rpc: async () => ({ data: { schemaVersion: 1, documents } }) });
  const response = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await contentHandler({ env, create })({ method: 'GET' }, response);
  assert.equal(response.code, 200); assert.equal(response.body.documents.length, 1);
  assert.doesNotMatch(JSON.stringify(response.body), /Off campaign secret/);
});

test('CMS sponsor saves require stored artwork references, not external or signed preview URLs', () => {
  for (const imageSrc of ['/sponsor-preview-placeholder.svg', '/arbitrary-logo.png', 'https://example.com/ad.png', 'https://example.test/signed/image.png', '/api/media?path=invalid.png']) {
    assert.ok(validateDocument('sponsor', sponsor({ imageSrc })).imageSrc, imageSrc);
    assert.ok(publicationIssues('sponsor', sponsor({ imageSrc })).imageSrc, imageSrc);
  }
  const imageSrc = '/api/media?path=11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.png';
  assert.deepEqual(validateDocument('sponsor', sponsor({ imageSrc })), {});
  assert.equal(buildPublicContent([record('signed-preview', sponsor(), sponsor({ imageSrc: 'https://example.test/signed/image.png' }))], { preview: true }).SPONSORS[0].imageSrc, 'https://example.test/signed/image.png');
});
