import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://preview.example.test/admin/sponsors' });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Node', 'Event', 'KeyboardEvent', 'MutationObserver']) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
dom.window.scrollTo = function () {};
const React = await import('react');
const { render, screen, within, fireEvent, cleanup } = await import('@testing-library/react');
const userEvent = (await import('@testing-library/user-event')).default;
const output = await build({ entryPoints: ['src/sponsors/SponsorReviewPage.jsx'], bundle: true, write: false, format: 'esm', platform: 'node', packages: 'external', loader: { '.css': 'empty' }, define: { __ADMIN_PREVIEW_ENABLED__: 'true', 'import.meta.env.VITE_CMS_ENABLED': '"false"' } });
const temp = new URL('../.sponsor-dom-test-bundle.mjs', import.meta.url); await writeFile(temp, output.outputFiles[0].text);
const SponsorReviewPage = (await import(temp.href)).default; await unlink(temp);
afterEach(() => { cleanup(); window.localStorage.clear(); });
const open = () => { render(React.createElement(SponsorReviewPage)); return userEvent.setup({ document: dom.window.document }); };
const placements = () => within(screen.getByRole('group', { name: 'Choose sponsor placement' }));
async function sampleOn(user) { await user.click(screen.getByRole('button', { name: 'Load local sample' })); await user.click(screen.getByRole('checkbox', { name: 'Enabled in review preview' })); await user.click(screen.getByRole('button', { name: 'Keep preview changes' })); }

test('production gate exposes no editor or sponsor content', () => {
  render(React.createElement(SponsorReviewPage, { allowReview: false }));
  assert.ok(screen.getByRole('heading', { name: 'Sponsor preview is not available here.' }));
  assert.equal(screen.queryByRole('textbox', { name: 'Sponsor name' }), null);
  assert.equal(screen.queryByRole('link', { name: /Visit .*sponsor/ }), null);
});
test('off defaults render no ad, local sample stays off until kept on', async () => {
  const user = open();
  assert.equal(screen.queryByRole('complementary', { name: 'Homepage sponsorship' }), null);
  await user.click(screen.getByRole('button', { name: 'Load local sample' }));
  assert.equal(screen.getByRole('checkbox', { name: 'Enabled in review preview' }).checked, false);
  assert.equal(screen.queryByRole('complementary', { name: 'Homepage sponsorship' }), null);
  await user.click(screen.getByRole('checkbox', { name: 'Enabled in review preview' }));
  assert.equal(screen.queryByRole('complementary', { name: 'Homepage sponsorship' }), null);
  await user.click(screen.getByRole('button', { name: 'Keep preview changes' }));
  const ad = screen.getByRole('complementary', { name: 'Homepage sponsorship' });
  const link = within(ad).getByRole('link', { name: 'Visit Example sponsor · layout sample (opens in a new tab)' });
  assert.equal(link.getAttribute('rel'), 'sponsored noopener noreferrer'); assert.equal(link.getAttribute('target'), '_blank');
  assert.equal(within(ad).getByRole('img').getAttribute('alt'), 'Sponsor image placeholder. Layout sample, not an advertiser.');
  assert.equal(window.localStorage.length, 0);
});
test('slots switch independently and episode ad stays outside video/interpreter area', async () => {
  const user = open(); await sampleOn(user);
  await user.click(placements().getByRole('button', { name: 'Podcast episode pages' })); await sampleOn(user);
  const ad = screen.getByRole('complementary', { name: 'Podcast episode pages sponsorship' });
  assert.equal(ad.closest('.synced-player-shell'), null);
  assert.ok(ad.previousElementSibling.classList.contains('synced-player-shell'));
  await user.click(screen.getByRole('checkbox', { name: 'Enabled in review preview' })); await user.click(screen.getByRole('button', { name: 'Keep preview changes' }));
  assert.equal(screen.queryByRole('complementary', { name: 'Podcast episode pages sponsorship' }), null);
  await user.click(screen.getByRole('button', { name: 'View homepage' }));
  assert.ok(screen.getByRole('complementary', { name: 'Homepage sponsorship' }));
});
test('unsafe input cannot enter rendered preview and focuses its labelled error', async () => {
  const user = open(); await sampleOn(user);
  fireEvent.change(screen.getByRole('textbox', { name: 'Destination link' }), { target: { value: 'javascript:alert(1)' } });
  await user.click(screen.getByRole('button', { name: 'Keep preview changes' }));
  assert.equal(document.activeElement, screen.getByRole('textbox', { name: 'Destination link' }));
  assert.equal(document.activeElement.getAttribute('aria-invalid'), 'true');
  assert.equal(screen.getByRole('complementary', { name: 'Homepage sponsorship' }).querySelector('a').getAttribute('href'), 'https://example.com/');
});
test('switching cannot silently discard dirty fields; discard and clear are isolated', async () => {
  const user = open(); await sampleOn(user);
  fireEvent.change(screen.getByRole('textbox', { name: 'Sponsor name' }), { target: { value: 'Unkept edit' } });
  await user.click(placements().getByRole('button', { name: 'Podcast episode pages' }));
  assert.equal(screen.getByRole('textbox', { name: 'Sponsor name' }).value, 'Unkept edit');
  assert.match(screen.getAllByRole('status')[0].textContent, /Keep your changes or discard/);
  await user.click(screen.getByRole('button', { name: 'Discard field changes' }));
  await user.click(placements().getByRole('button', { name: 'Podcast episode pages' })); await sampleOn(user);
  await user.click(screen.getByRole('button', { name: 'Clear review placement' }));
  assert.equal(screen.getByRole('checkbox', { name: 'Enabled in review preview' }).checked, false);
  await user.click(screen.getByRole('button', { name: 'View homepage' })); assert.ok(screen.getByRole('complementary', { name: 'Homepage sponsorship' }));
});
test('broken sponsor artwork retains an accessible advertiser link and sample wording', async () => {
  const user = open(); await sampleOn(user);
  const ad = screen.getByRole('complementary', { name: 'Homepage sponsorship' });
  fireEvent.error(within(ad).getByRole('img'));
  assert.equal(within(ad).queryByRole('img'), null);
  assert.ok(within(ad).getByRole('link', { name: /Example sponsor.*opens in a new tab/ }));
});
test('preview toolbar navigates back after embedded site navigation and repeated clicks', async () => {
  const user = open(); await sampleOn(user);
  const nav = screen.getByRole('navigation', { name: 'Main navigation' });
  await user.click(within(nav).getByRole('button', { name: 'About', exact: true }));
  assert.ok(screen.getByRole('heading', { name: 'About Inclusive Quest', exact: true }));
  await user.click(screen.getByRole('button', { name: 'View homepage' }));
  assert.ok(screen.getByRole('complementary', { name: 'Homepage sponsorship' }));
  await user.click(screen.getByRole('button', { name: 'View episode page' }));
  await user.click(within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('button', { name: 'Explore', exact: true }));
  await user.click(screen.getByRole('button', { name: 'View episode page' }));
  assert.ok(screen.getByText('Built-in Sign Language. Clear captions. Every conversation.'));
});
