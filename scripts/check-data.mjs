import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BRAND, FEATURES, FOUNDER, PODCASTER_CHECKLIST, STATS, TESTIMONIALS, TITLES, WORK_WITH_US_FORMS } from '../src/content.js';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const packageInfo = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(BRAND.name, 'Inclusive Quest');
assert.equal(BRAND.tagline, 'See Every Story. See Every Voice.');
assert.equal(BRAND.contactEmail, 'info@inclusivequest.co');
assert.equal(BRAND.logoSrc, '/inclusive-quest-logo.png');
assert.ok(readFileSync(new URL('../public/inclusive-quest-logo.png', import.meta.url)).length > 1000);
assert.equal(FOUNDER.name, 'Alma Beaty');
assert.ok(FOUNDER.bio.length >= 5);
assert.equal(TESTIMONIALS.length, 2);
assert.deepEqual(TESTIMONIALS.map(item => item.name), ['James McGowan', 'Juliana Vadala']);
assert.ok(FEATURES.find(feature => feature.title === 'Topic Search & Interpreter Profiles'));
assert.equal(STATS.length, 4);
assert.ok(PODCASTER_CHECKLIST.length >= 4);
assert.equal(TITLES[0].title, 'She Wears the Pants');
assert.ok(app.includes('For Platforms') && app.includes('For Podcasters'));
// Watching and exploring must remain two distinct visitor actions.
assert.match(app, /navigate\('Watch'\)[^\n]*Start Watching/);
assert.match(app, /navigate\('Explore'\)[^\n]*Start Exploring/);
assert.ok(!app.includes('Explore Podcasts</button>'));
assert.equal(WORK_WITH_US_FORMS.platforms.url, 'https://tally.so/r/jeDMqQ');
assert.equal(WORK_WITH_US_FORMS.podcasters.url, 'https://tally.so/r/LD1G0j');
for (const form of Object.values(WORK_WITH_US_FORMS)) {
  assert.ok(form.embedUrl.startsWith('https://tally.so/embed/'));
}
assert.ok(app.includes('function WorkWithUsForms()'));
assert.ok(app.includes('className="tally-form-frame"'));
assert.ok(app.includes('<TallySubmissionForm kind="platforms" />'));
assert.ok(app.includes('<TallySubmissionForm kind="podcasters" />'));
assert.ok(!app.includes('Dedicated platform and podcaster forms will be added once approved.'));
assert.ok(app.includes('Captions (default ON)'));
assert.ok(!app.includes('Hide ASL'));
assert.ok(!app.includes('Add to Cart'));
assert.ok(!app.includes('Mux-ready demo'));
assert.ok(!app.includes("'Merch'"));
assert.ok(!/InclusiveQest/i.test([app, index, packageInfo.name, BRAND.name, JSON.stringify(TITLES)].join('\n')));
console.log('Inclusive Quest brand, content, navigation and safety checks passed.');
