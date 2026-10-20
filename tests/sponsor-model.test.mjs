import test from 'node:test';
import assert from 'node:assert/strict';
import { createSponsorSlot, validateSponsorSlot, safeSponsorDestination, safeSponsorImage, visibleSponsor } from '../src/sponsors/sponsor-model.js';
const sponsor = (placement = 'home') => ({ ...createSponsorSlot(placement), enabled: true, name: 'Example sponsor', imageSrc: '/sponsor-preview-placeholder.svg', imageAlt: 'Layout sample, not an advertiser.', destinationUrl: 'https://example.com/' });

test('both sponsor slots are empty and off by default', () => {
  for (const placement of ['home', 'episode']) { const slot = createSponsorSlot(placement); assert.equal(slot.enabled, false); assert.equal(slot.name, ''); assert.deepEqual(validateSponsorSlot(slot), {}); assert.equal(visibleSponsor([slot], placement), null); }
  assert.throws(() => createSponsorSlot('video'), /Unknown/);
});
test('activation requires all content and explicit boolean state', () => {
  const errors = validateSponsorSlot({ ...createSponsorSlot('home'), enabled: true });
  assert.deepEqual(Object.keys(errors).sort(), ['destinationUrl', 'imageAlt', 'imageSrc', 'name']);
  assert.ok(validateSponsorSlot({ ...sponsor(), enabled: 'false' }).enabled);
  assert.ok(validateSponsorSlot({ ...sponsor(), name: 'x'.repeat(161) }).name);
  assert.ok(validateSponsorSlot({ ...sponsor(), imageAlt: ' ' }).imageAlt);
});
test('sponsor links reject executable, protocol-relative, credentialed and malformed destinations', () => {
  for (const bad of ['javascript:alert(1)', 'data:text/html,bad', '//example.com', 'http://example.com', 'https://a:b@example.com', 'https://example.com:8443/', 'https://example.com/ space', 'https://example.com/\\bad', 'https://example.com/\n']) { assert.equal(safeSponsorDestination(bad), '', bad); assert.ok(validateSponsorSlot({ ...sponsor(), destinationUrl: bad }).destinationUrl, bad); }
  assert.equal(safeSponsorDestination('https://example.com'), 'https://example.com/');
});
test('image references reject executable or protocol-relative paths', () => {
  for (const bad of ['javascript:bad', 'data:image/svg+xml,bad', '//tracker.test/x', '/../../bad', '/a\\b', '/a b']) assert.equal(safeSponsorImage(bad), '', bad);
  assert.equal(safeSponsorImage('/sponsor-preview-placeholder.svg'), '/sponsor-preview-placeholder.svg');
});
test('placement selection is independent, shared episodes are explicit and duplicates fail closed', () => {
  const home = sponsor(); const episode = sponsor('episode');
  assert.equal(visibleSponsor([home, episode], 'home').placement, 'home');
  assert.equal(visibleSponsor([{ ...home, enabled: false }, episode], 'home'), null);
  assert.equal(visibleSponsor([{ ...home, enabled: false }, episode], 'episode').placement, 'episode');
  assert.equal(visibleSponsor([home, { ...home }], 'home'), null);
  assert.equal(visibleSponsor([{ ...home, destinationUrl: 'javascript:bad' }], 'home'), null);
  assert.equal(visibleSponsor(null, 'home'), null);
});
