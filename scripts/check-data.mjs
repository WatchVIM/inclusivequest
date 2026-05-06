import assert from 'node:assert/strict';
import { BRAND, CREATOR_CHECKLIST, FEATURES, MERCH, TITLES } from '../src/content.js';

assert.equal(BRAND.name, 'InclusiveQest', 'Brand name should be InclusiveQest');
assert.ok(BRAND.logoSrc.endsWith('.png'), 'Logo should point to a PNG in /public');
assert.ok(TITLES.length >= 3, 'Expected at least 3 sample titles');
assert.ok(
  TITLES.every((item) => item.id && item.title && item.mainVideoSrc && item.aslVideoSrc && item.captionsSrc),
  'Every title needs id, title, main video, ASL sidecar video, and captions'
);
assert.ok(FEATURES.length >= 5, 'Expected at least 5 platform features');
assert.ok(MERCH.length >= 3, 'Expected at least 3 merch products');
assert.ok(CREATOR_CHECKLIST.length >= 5, 'Expected at least 5 creator checklist items');

console.log('InclusiveQest repo checks passed.');
