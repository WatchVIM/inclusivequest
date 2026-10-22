import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';

const dom = new JSDOM('<!doctype html><html><head><meta name="description"></head><body></body></html>', { url: 'https://preview.example.test/' });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Node', 'Event', 'KeyboardEvent', 'MutationObserver']) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
dom.window.scrollTo = function () {};
const React = await import('react');
const { render, screen, within, fireEvent, cleanup, act } = await import('@testing-library/react');
const userEvent = (await import('@testing-library/user-event')).default;
const output = await build({ stdin: { contents: "export { default as App } from './src/App.jsx'; export { ContentProvider } from './src/cms/ContentProvider.jsx'; export { createSeedDocuments } from './src/cms/content-model.js'; export { default as AdminApp } from './src/admin/AdminApp.jsx';", resolveDir: process.cwd(), loader: 'jsx' }, bundle: true, write: false, format: 'esm', platform: 'node', packages: 'external', loader: { '.css': 'empty' }, define: { __ADMIN_PREVIEW_ENABLED__: 'true', 'import.meta.env.VITE_CMS_ENABLED': '"false"' } });
const temp = new URL('../.refinements-dom-test-bundle.mjs', import.meta.url);
await writeFile(temp, output.outputFiles[0].text);
const { App, ContentProvider, createSeedDocuments, AdminApp } = await import(temp.href);
await unlink(temp);
let spoken = [];
let cancellations = 0;
function speech() {
  spoken = []; cancellations = 0;
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  window.speechSynthesis = { cancel: () => { cancellations++; }, speak: utterance => spoken.push(utterance), paused: false, resume() {} };
}
function open({ preview = false, documents = createSeedDocuments(), page = 'Home' } = {}) {
  window.history.replaceState(null, '', '#/' + page.toLowerCase());
  render(React.createElement(ContentProvider, { previewDocuments: documents }, React.createElement(App, { previewMode: preview })));
  return userEvent.setup({ document: dom.window.document });
}
const nav = () => within(screen.getByRole('navigation', { name: 'Main navigation' }));
async function go(user, page) { await user.click(nav().getByRole('button', { name: page, exact: true })); }
async function panel(user) { await user.click(screen.getByRole('button', { name: 'Accessibility', exact: true })); }
function update(documents, id, changes) { const item = documents.find(item => item.id === id); item.draft = { ...(item.draft || item.published), ...changes }; }
function finishSpeech() {
  let index = 0;
  act(() => { while (index < spoken.length) { assert.ok(index < 1000, 'speech terminates'); spoken[index++].onend?.(); } });
  return spoken.map(item => item.text).join(' ');
}
afterEach(() => { cleanup(); window.localStorage.clear(); window.history.replaceState(null, '', '/'); delete window.speechSynthesis; delete window.SpeechSynthesisUtterance; window.getSelection()?.removeAllRanges(); });

test('home removes retired tagline, strikes Not Intelligence and keeps interpreter labels blank', () => {
  open({ preview: true });
  assert.equal(document.querySelector('.hero-iq-question s').textContent, 'Not Intelligence.');
  assert.doesNotMatch(document.body.textContent, /See Every Story|See Every Voice/);
  assert.equal(document.querySelector('.caption-box').textContent, 'Unveiling Access, One Quest at a Time.');
  const interpreter = document.querySelector('.interpreter-card');
  assert.equal(interpreter.textContent.trim(), '');
  assert.equal(interpreter.querySelector('img').getAttribute('src'), '/inclusive-quest-logo.png');
  assert.match(document.querySelector('.footer-tagline').textContent, /^Unveiling Access\. One Quest at a Time\.$/);
  const footer = within(screen.getByRole('navigation', { name: 'Footer links' }));
  for (const button of nav().getAllByRole('button')) assert.ok(footer.getByRole('link', { name: button.textContent, exact: true }));
});

test('dedicated interpreter image is shared across three placements without overwriting homepage artwork', async () => {
  const documents = createSeedDocuments();
  update(documents, 'page-home', { interpreterImageSrc: '/approved-interpreter.png', interpreterImageAlt: 'Approved interpreter illustration', interpreterTitle: 'Interpretation', interpreterSubtitle: 'Accessible conversation', imageSrc: '/homepage.png', imageAlt: 'Homepage artwork' });
  const user = open({ preview: true, documents });
  assert.equal(screen.getAllByRole('img', { name: 'Approved interpreter illustration' }).length, 2);
  assert.equal(screen.getAllByRole('img', { name: 'Approved interpreter illustration' })[0].getAttribute('src'), '/approved-interpreter.png');
  assert.equal(screen.getByRole('img', { name: 'Homepage artwork' }).getAttribute('src'), '/homepage.png');
  assert.equal(document.querySelector('.interpreter-card strong').textContent, 'Interpretation');
  await go(user, 'Watch');
  assert.equal(document.querySelector('.watch-interpreter-mark').getAttribute('src'), '/approved-interpreter.png');
  assert.equal(document.querySelector('.watch-interpreter-mark').getAttribute('alt'), 'Approved interpreter illustration');
});

test('About has the logo immediately below its heading and no duplicate Founder Bio heading', async () => {
  const user = open({ preview: true }); await go(user, 'About');
  const heading = screen.getByRole('heading', { name: 'About Inclusive Quest' });
  assert.ok(heading.nextElementSibling.classList.contains('about-signature-logo'));
  assert.equal(screen.queryByRole('heading', { name: 'Founder Bio' }), null);
  assert.equal(document.querySelector('#bio-label').textContent, 'Founder Bio');
  for (const word of ['Mission', 'Vision', 'Values', 'Founder', 'Quest', 'bridge', 'community', 'accessible']) {
    assert.ok([...document.querySelectorAll('.gradient-word')].some(element => element.textContent === word), word);
  }
});

test('blank founder heading can be replaced by an editable heading without duplicating the label', async () => {
  const documents = createSeedDocuments();
  update(documents, documents.find(item => item.type === 'founder').id, { heading: 'Meet our founder' });
  const user = open({ preview: true, documents }); await go(user, 'About');
  assert.ok(screen.getByRole('heading', { name: 'Meet our founder' }));
  assert.equal(document.querySelector('.bio-section').getAttribute('aria-labelledby'), 'bio-heading');
});

test('platform and podcaster headings retain requested accents and Listeners/Watchers item', async () => {
  const user = open({ preview: true }); await go(user, 'For Platforms');
  assert.ok(screen.getByText('Listeners/Watchers'));
  assert.ok([...document.querySelectorAll('h1 .gradient-word, h2 .gradient-word')].some(element => element.textContent === 'build'));
  await go(user, 'For Podcasters');
  for (const word of ['people', 'checklist']) assert.ok([...document.querySelectorAll('.gradient-word')].some(element => element.textContent === word));
});

test('Blog remains available with no posts and renders authored dated stories with the established logo', async () => {
  let user = open({ preview: true }); await go(user, 'Blog');
  assert.ok(screen.getByText('Stories will appear here when they are published.'));
  assert.equal(document.querySelectorAll('.content-card').length, 0);
  cleanup();
  const documents = createSeedDocuments();
  documents.push({ id: 'post-test', type: 'post', draft: { title: 'Access in practice', slug: 'access-in-practice', excerpt: 'A reviewed story.', body: 'First paragraph.\n\nSecond paragraph.', template: 'story', date: '2026-10-22', author: 'Alma / Inclusive Quest', imageSrc: '', imageAlt: '' } });
  user = open({ preview: true, documents }); await go(user, 'Blog');
  assert.ok(screen.getByText('By Alma / Inclusive Quest'));
  assert.equal(document.querySelector('time').getAttribute('datetime'), '2026-10-22');
  assert.equal(document.querySelector('.blog-brand-stamp').getAttribute('src'), '/inclusive-quest-logo.png');
  await user.click(screen.getByRole('button', { name: 'Read story →' }));
  assert.ok(screen.getByRole('heading', { name: 'Access in practice' }));
  assert.ok(screen.getByText('Second paragraph.'));
  assert.equal(nav().getByRole('button', { name: 'Blog' }).getAttribute('aria-current'), 'page');
  await user.click(screen.getByRole('button', { name: '← All stories' }));
  assert.ok(screen.getByRole('heading', { name: 'Stories & updates' }));
  assert.equal(window.location.hash, '#/home', 'Preview navigation does not modify the outside URL');
  assert.equal(window.localStorage.length, 0);
});

test('coming-soon episodes show the host and cannot load YouTube or direct video', async () => {
  const documents = createSeedDocuments();
  const episode = documents.find(item => item.type === 'episode');
  update(documents, episode.id, { hostName: 'Approved host', comingSoon: true, youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ', mainVideoSrc: '/episode.mp4', aslVideoSrc: '/interpreter.mp4' });
  const user = open({ preview: true, documents }); await go(user, 'Explore');
  fireEvent.change(screen.getByLabelText('Search podcasts by topic or interpreter'), { target: { value: 'Approved host' } });
  assert.ok(screen.getByText('Hosted by Approved host'));
  await user.click(screen.getByRole('button', { name: 'View Episode' }));
  assert.equal(screen.getByRole('button', { name: 'Coming soon', exact: true }).disabled, true);
  assert.equal(screen.queryByRole('button', { name: 'Load YouTube video' }), null);
  assert.equal(document.querySelector('video, iframe'), null);
});

test('Read this page reads actual complete text in bounded chunks, not hidden or control text', async () => {
  speech(); const user = open(); await panel(user);
  const hidden = document.createElement('p'); hidden.hidden = true; hidden.textContent = 'SECRET HIDDEN TEXT'; document.querySelector('main').appendChild(hidden);
  const cssHidden = document.createElement('p'); cssHidden.style.display = 'none'; cssHidden.textContent = 'CSS HIDDEN TEXT'; document.querySelector('main').appendChild(cssHidden);
  await user.click(screen.getByRole('button', { name: 'Read this page', exact: true }));
  assert.equal(spoken.length, 1, 'Only one utterance is queued at a time');
  const all = finishSpeech();
  assert.match(all, /Accessible Podcasts/);
  assert.match(all, /What's Your IQ\?/);
  assert.match(all, /Be the first to know when IQ launches/);
  assert.doesNotMatch(all, /SECRET HIDDEN|CSS HIDDEN|Start Watching|Accessibility preferences/);
  assert.ok(spoken.length > 3);
  assert.ok(spoken.every(item => item.text.length <= 240 && !/\s{2,}/.test(item.text)));
  assert.match(screen.getByRole('status').textContent, /Finished reading/);
});

test('Read this Section follows keyboard focus, then visible section after scrolling', async () => {
  speech(); const user = open();
  fireEvent.focusIn(screen.getByLabelText('Email address'));
  await panel(user);
  await user.click(screen.getByRole('button', { name: 'Read this Section' }));
  let all = finishSpeech();
  assert.match(all, /Be the first to know/); assert.doesNotMatch(all, /What's Your IQ/);
  spoken = [];
  fireEvent.scroll(window);
  document.querySelectorAll('main section, main article').forEach(element => { element.getBoundingClientRect = () => ({ top: 1500, bottom: 1600 }); });
  document.querySelector('.testimonials-section').getBoundingClientRect = () => ({ top: 120, bottom: 500 });
  await user.click(screen.getByRole('button', { name: 'Read this Section' }));
  all = finishSpeech();
  assert.match(all, /Voices from our community/); assert.doesNotMatch(all, /Be the first to know/);
});

test('Escape stops speech, stale utterances cannot restart it, and accessibility focus is restored', async () => {
  speech(); const user = open(); await panel(user);
  await user.click(screen.getByRole('button', { name: 'Read this page', exact: true }));
  const old = spoken[0]; const count = cancellations;
  await user.keyboard('{Escape}');
  assert.ok(cancellations > count);
  assert.equal(screen.queryByRole('region', { name: 'Accessibility preferences' }), null);
  assert.equal(document.activeElement, screen.getByRole('button', { name: 'Accessibility', exact: true }));
  act(() => old.onend());
  assert.equal(spoken.length, 1);
});

test('navigation focuses main, mobile Escape restores toggle, and repeated current-page choice stays usable', async () => {
  const user = open({ preview: true });
  const toggle = screen.getByRole('button', { name: 'Toggle navigation' });
  await user.click(toggle);
  assert.equal(document.activeElement, within(screen.getByRole('navigation', { name: 'Mobile navigation' })).getByRole('button', { name: 'Home', exact: true }));
  await user.keyboard('{Escape}'); assert.equal(document.activeElement, toggle);
  await user.click(toggle);
  await user.click(within(screen.getByRole('navigation', { name: 'Mobile navigation' })).getByRole('button', { name: 'Home', exact: true }));
  assert.equal(document.activeElement, screen.getByRole('main'));
  assert.equal(screen.queryByRole('navigation', { name: 'Mobile navigation' }), null);
  await go(user, 'About'); assert.equal(document.activeElement, screen.getByRole('main'));
});

test('speech unavailable and isolated previews disable speech controls without changing outside settings', async () => {
  const user = open({ preview: true }); await panel(user);
  for (const name of ['Read this page', 'Read this Section', 'Stop reading']) assert.equal(screen.getByRole('button', { name, exact: true }).disabled, true);
  assert.match(screen.getByRole('status').textContent, /unavailable/);
  assert.equal(window.localStorage.length, 0);
});


test('speech preserves inline spacing, visual block boundaries and keyboard selection', async () => {
  speech(); const user = open(); await panel(user);
  await user.click(screen.getByRole('checkbox', { name: 'Read selected, focused or hovered text aloud' }));
  await user.click(screen.getByRole('button', { name: 'Close accessibility preferences' }));
  const passage = document.createElement('p'); passage.tabIndex = 0;
  passage.innerHTML = '<span>Mission</span> <span>Vision</span><strong style="display:block">A new line.</strong>';
  document.querySelector('main').appendChild(passage);
  fireEvent.focusIn(passage);
  assert.equal(finishSpeech(), 'Mission Vision A new line.');
  spoken = [];
  const range = document.createRange(); range.selectNodeContents(passage.firstElementChild);
  window.getSelection().removeAllRanges(); window.getSelection().addRange(range); fireEvent.keyUp(passage, { key: 'Shift' });
  assert.equal(finishSpeech(), 'Mission');
});

test('browser speech failure is honest and a later retry can read again', async () => {
  speech(); const user = open(); await panel(user);
  window.speechSynthesis.speak = () => { throw new Error('Unavailable voice'); };
  await user.click(screen.getByRole('button', { name: 'Read this page', exact: true }));
  assert.match(screen.getByRole('status').textContent, /could not start/);
  window.speechSynthesis.speak = utterance => spoken.push(utterance);
  await user.click(screen.getByRole('button', { name: 'Read this page', exact: true }));
  assert.match(finishSpeech(), /Accessible Podcasts/);
});

test('review editor exposes separate interpreter, optional founder, author/date and coming-soon controls', async () => {
  render(React.createElement(AdminApp));
  const user = userEvent.setup({ document: dom.window.document });
  await user.click(screen.getByRole('button', { name: 'Open review workspace' }));
  for (const label of ['Interpreter title (optional)', 'Interpreter subtitle (optional)', 'Interpreter image URL / asset path', 'Interpreter image alternative text']) assert.equal(screen.getByLabelText(label).value, '');
  const sections = within(screen.getByRole('navigation', { name: 'Content sections' }));
  await user.click(sections.getByRole('button', { name: /^Founder / }));
  assert.equal(screen.getByLabelText('Founder heading (optional)').value, '');
  await user.click(sections.getByRole('button', { name: /^Blog posts / }));
  await user.click(screen.getByRole('button', { name: '+ Add post' }));
  assert.equal(screen.getByLabelText('Post date').type, 'date');
  assert.equal(screen.getByLabelText('Author').value, 'Alma / Inclusive Quest');
  cleanup();
  render(React.createElement(AdminApp));
  await user.click(screen.getByRole('button', { name: 'Open review workspace' }));
  await user.click(within(screen.getByRole('navigation', { name: 'Content sections' })).getByRole('button', { name: /^YouTube episodes / }));
  assert.ok(screen.getByLabelText('Host name'));
  const comingSoon = screen.getByRole('checkbox', { name: 'Coming soon (no playback)' });
  const original = comingSoon.checked;
  await user.click(comingSoon); assert.equal(comingSoon.checked, !original);
  assert.equal(window.localStorage.length, 0);
});

test('Escape with selected main text cannot restart speech on keyup', async () => {
  speech(); const user = open(); await panel(user);
  await user.click(screen.getByRole('checkbox', { name: 'Read selected, focused or hovered text aloud' }));
  await user.click(screen.getByRole('button', { name: 'Close accessibility preferences' }));
  const passage = document.querySelector('.hero-iq-question'); passage.tabIndex = 0; act(() => passage.focus());
  const range = document.createRange(); range.selectNodeContents(passage);
  window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
  fireEvent.mouseUp(passage); const before = spoken.length;
  fireEvent.keyDown(passage, { key: 'Escape' }); fireEvent.keyUp(passage, { key: 'Escape' });
  assert.equal(spoken.length, before);
});

test('Stop and Escape invalidate pending hovered speech instead of restarting one second later', async () => {
  speech(); const user = open(); await panel(user);
  await user.click(screen.getByRole('checkbox', { name: 'Read selected, focused or hovered text aloud' }));
  fireEvent.mouseOver(document.querySelector('.hero-iq-question'));
  await user.click(screen.getByRole('button', { name: 'Stop reading' }));
  await act(() => new Promise(resolve => window.setTimeout(resolve, 1050)));
  assert.equal(spoken.length, 0);
  fireEvent.mouseOver(document.querySelector('.hero-iq-question'));
  fireEvent.keyDown(window, { key: 'Escape' });
  await act(() => new Promise(resolve => window.setTimeout(resolve, 1050)));
  assert.equal(spoken.length, 0);
});
