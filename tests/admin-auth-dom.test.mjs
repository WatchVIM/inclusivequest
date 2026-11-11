import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
import { createDraft, createSeedDocuments } from '../src/cms/content-model.js';

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/admin' });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLDialogElement', 'HTMLInputElement', 'Node', 'Event', 'KeyboardEvent', 'MutationObserver', 'File', 'FileReader']) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
const React = await import('react');
const { render, screen, within, fireEvent, cleanup, waitFor, act } = await import('@testing-library/react');
const userEvent = (await import('@testing-library/user-event')).default;
const output = await build({ entryPoints: ['src/admin/AdminApp.jsx'], bundle: true, write: false, format: 'esm', platform: 'node', packages: 'external', loader: { '.css': 'empty' }, define: { __ADMIN_PREVIEW_ENABLED__: 'false', 'import.meta.env': '{"VITE_CMS_ENABLED":"false","VITE_VERCEL_ENV":"preview"}' } });
const temp = new URL('../.admin-auth-dom-test-bundle.mjs', import.meta.url);
await writeFile(temp, output.outputFiles[0].text);
const AdminApp = (await import(temp.href)).default;
await unlink(temp);
afterEach(() => { cleanup(); window.localStorage.clear(); });
const copy = value => JSON.parse(JSON.stringify(value));
const failure = (code, message) => Object.assign(new Error(message), { code });
const defer = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

function fixture({ role = 'publisher', authenticated = true, passwordSetup = false, overrides = {}, documents } = {}) {
  let callback;
  const state = { session: authenticated ? { user: { id: 'editor-one', email: 'editor@example.test' }, role, ...(passwordSetup ? { requiresPasswordSetup: true } : {}) } : null, records: documents ? copy(documents) : createSeedDocuments(), calls: [], revisions: [] };
  const repository = {
    configured: true,
    initialize: async () => { state.calls.push(['initialize']); state.records = createSeedDocuments(); return copy(state.records); },
    getSession: async () => state.session,
    onAuthStateChange: next => { callback = next; return () => { callback = null; }; },
    requestSignIn: async (email, password) => { state.calls.push(['signIn', email, password]); },
    completePasswordSetup: async () => { state.calls.push(['setup']); state.session = null; callback?.('SIGNED_OUT'); return { requiresFreshSignIn: true }; },
    signOut: async () => { state.calls.push(['signOut']); state.session = null; callback?.('SIGNED_OUT'); },
    loadWorkspace: async () => { state.calls.push(['load']); return { member: { role: state.session.role }, documents: copy(state.records) }; },
    saveDraft: async (record, expected) => {
      state.calls.push(['save', copy(record), expected]);
      const current = state.records.find(item => item.id === record.id);
      if (current && current.revision !== expected) throw failure('REVISION_CONFLICT', 'A newer draft exists.');
      const saved = { ...copy(record), revision: expected + 1 };
      state.records = current ? state.records.map(item => item.id === saved.id ? saved : item) : [...state.records, saved];
      return copy(saved);
    },
    publish: async (id, expected) => {
      state.calls.push(['publish', id, expected]);
      const saved = state.records.find(item => item.id === id);
      saved.published = copy(saved.draft); saved.revision += 1; return copy(saved);
    },
    unpublish: async (id, expected) => {
      state.calls.push(['unpublish', id, expected]);
      const saved = state.records.find(item => item.id === id);
      saved.published = null; saved.revision += 1; return copy(saved);
    },
    uploadImage: async (file, metadata) => { state.calls.push(['upload', file.name, metadata]); return { imageSrc: '/api/media?path=11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.png', previewUrl: 'https://example.test/signed/image.png' }; },
    previewDocuments: async (records, mode) => {
      state.calls.push(['preview', mode]);
      const selected = mode === 'published' ? records.filter(record => record.published).map(record => ({ ...record, draft: record.published })) : records;
      return copy(selected).map(record => ({ ...record, draft: { ...record.draft, imageSrc: record.draft.imageSrc?.startsWith('/api/media?') ? 'https://example.test/signed/image.png' : record.draft.imageSrc } }));
    },
    listRevisions: async id => { state.calls.push(['history', id]); return copy(state.revisions); },
    restoreRevision: async (id, revisionId, expected) => {
      state.calls.push(['restore', id, revisionId, expected]);
      const record = state.records.find(item => item.id === id);
      record.draft = copy(state.revisions.find(item => item.id === revisionId).data); record.revision += 1;
      return copy(record);
    },
    ...overrides
  };
  return { repository, state, emit: async next => { state.session = next; await act(async () => { callback?.('TEST_EVENT', next); await new Promise(resolve => setTimeout(resolve, 5)); }); } };
}
async function open(options) {
  const setup = fixture(options);
  render(React.createElement(AdminApp, { repository: setup.repository }));
  const user = userEvent.setup({ document: dom.window.document });
  if (setup.state.session?.requiresPasswordSetup) await screen.findByRole('heading', { name: 'Set your password' });
  else if (setup.state.session) await screen.findByRole('button', { name: 'Save draft', exact: true });
  else await screen.findByRole('button', { name: 'Sign in' });
  return { ...setup, user };
}
async function section(user, name) { await user.click(within(screen.getByRole('navigation', { name: 'Content sections' })).getByRole('button', { name: new RegExp('^' + name + ' ') })); }

// All requests in this file use an injected in-memory repository. No live Auth, mail or database calls.

test('blog photo replacement stays private through save and reload, opens the article preview and publishes only after confirmation', async () => {
  const post = createDraft('post', 'post-photo-test');
  Object.assign(post.draft, { title: 'My access story', slug: 'my-access-story', excerpt: 'A community story about access.', imageSrc: '/old-photo.png', imageAlt: 'Original portrait' });
  post.published = copy(post.draft);
  const { user, state } = await open({ documents: [...createSeedDocuments(), post] });
  await section(user, 'Blog posts');
  fireEvent.change(screen.getByLabelText('Alternative text'), { target: { value: 'Replacement portrait' } });
  await act(async () => fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [new File(['fixture'], 'portrait.png', { type: 'image/png' })] } }));
  const saved = () => state.records.find(record => record.id === post.id);
  assert.equal(saved().published.imageSrc, '/old-photo.png');
  assert.equal(saved().draft.imageSrc, '/old-photo.png');
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  assert.match(saved().draft.imageSrc, /^\/api\/media\?path=/);
  assert.equal(saved().published.imageSrc, '/old-photo.png');
  await user.click(screen.getByRole('button', { name: /Reload/ }));
  assert.match(screen.getByLabelText('Stored image reference').value, /^\/api\/media\?path=/);
  await user.click(screen.getByRole('button', { name: 'Preview draft', exact: true }));
  const preview = screen.getByRole('dialog', { name: 'Draft website preview' });
  assert.ok(within(preview).getByRole('heading', { name: 'My access story' }));
  assert.equal(within(preview).getByRole('img', { name: 'Replacement portrait' }).src, 'https://example.test/signed/image.png');
  await user.click(within(preview).getByRole('button', { name: 'Close Draft website preview' }));
  await user.click(screen.getByRole('button', { name: 'View published website', exact: true }));
  const published = screen.getByRole('dialog', { name: 'Published website preview' });
  assert.equal(within(published).getByRole('img', { name: 'Original portrait' }).getAttribute('src'), '/old-photo.png');
  await user.click(within(published).getByRole('button', { name: 'Close Published website preview' }));
  await user.click(screen.getByRole('button', { name: 'Publish', exact: true }));
  assert.equal(saved().published.imageSrc, '/old-photo.png');
  await user.click(screen.getByRole('button', { name: 'Keep editing' }));
  assert.equal(state.calls.filter(call => call[0] === 'publish').length, 0);
  await user.click(screen.getByRole('button', { name: 'Publish', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Continue', exact: true }));
  assert.equal(saved().published.imageSrc, saved().draft.imageSrc);
  assert.equal(state.calls.filter(call => call[0] === 'publish').length, 1);
});
test('configured admin requires sign-in and reports password failures generically', async () => {
  const { user, state } = await open({ authenticated: false, overrides: { requestSignIn: async () => { throw new Error('Email delivery is unavailable.'); } } });
  assert.equal(screen.queryByRole('button', { name: 'Open review workspace' }), null);
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'editor@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'fixture-password' } });
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  assert.match(screen.getByRole('status').textContent, /Unable to sign in/);
  assert.doesNotMatch(screen.getByRole('status').textContent, /on its way/);
  assert.equal(state.calls.length, 0);
});

test('sign-in sends only the provided address and never opens a review workspace', async () => {
  const { user, state } = await open({ authenticated: false });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'editor@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'fixture-password' } });
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  assert.deepEqual(state.calls, [['signIn', 'editor@example.test', 'fixture-password']]);
  assert.equal(screen.getByLabelText('Password').value, '');
  assert.equal(screen.getByLabelText('Email address').autocomplete, 'username');
  assert.equal(screen.getByLabelText('Password').autocomplete, 'current-password');
  assert.equal(screen.queryByLabelText('Page heading'), null);
});

test('nonstaff denial hides every private draft and offers sign-out', async () => {
  const setup = fixture({ overrides: { getSession: async () => { throw failure('ACCESS_DENIED', 'Not staff'); } } });
  render(React.createElement(AdminApp, { repository: setup.repository }));
  await screen.findByRole('heading', { name: 'Editor access required' });
  assert.match(screen.getByRole('status').textContent, /Supabase project membership alone does not grant access/);
  assert.ok(screen.getByRole('button', { name: 'Sign out' }));
  assert.equal(screen.queryByLabelText('Page heading'), null);
  assert.equal(setup.state.calls.length, 0);
});

test('load errors fail closed and can be retried', async () => {
  const setup = fixture(); let shouldFail = true;
  const normalLoad = setup.repository.loadWorkspace;
  setup.repository.loadWorkspace = async () => { if (shouldFail) throw new Error('Offline'); return normalLoad(); };
  render(React.createElement(AdminApp, { repository: setup.repository }));
  const user = userEvent.setup({ document: dom.window.document });
  await screen.findByRole('button', { name: 'Retry loading admin' });
  assert.equal(screen.queryByLabelText('Page heading'), null);
  shouldFail = false; await user.click(screen.getByRole('button', { name: 'Retry loading admin' }));
  await screen.findByLabelText('Page heading');
});

test('draft save persists expected revision and keeps published content unchanged', async () => {
  const { user, state } = await open();
  fireEvent.change(screen.getByLabelText('Page heading'), { target: { value: 'Private new heading' } });
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  assert.match(screen.getByRole('status').textContent, /Draft saved to the server/);
  const save = state.calls.find(call => call[0] === 'save');
  assert.equal(save[2], 0);
  assert.equal(state.records[0].draft.heading, 'Private new heading');
  assert.equal(state.records[0].published.heading, 'Accessible Podcasts.');
  assert.equal(screen.getByRole('button', { name: 'Save draft', exact: true }).disabled, true);
  assert.equal(window.localStorage.length, 0);
});

test('failed save preserves fields and never announces a successful save', async () => {
  const { user } = await open({ overrides: { saveDraft: async () => { throw new Error('Network disconnected'); } } });
  fireEvent.change(screen.getByLabelText('Page heading'), { target: { value: 'Keep this work' } });
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  assert.match(screen.getByRole('status').textContent, /Could not save draft.*Network disconnected/);
  assert.equal(screen.getByLabelText('Page heading').value, 'Keep this work');
  assert.equal(screen.getByRole('button', { name: 'Save draft', exact: true }).disabled, false);
});

test('in-flight save locks editing and navigation and prevents repeated requests', async () => {
  const held = defer(); let saves = 0;
  const { user, state } = await open({ overrides: { saveDraft: async record => { saves += 1; await held.promise; return { ...record, revision: 1 }; } } });
  fireEvent.change(screen.getByLabelText('Page heading'), { target: { value: 'One save' } });
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  assert.ok(screen.getByLabelText('Page heading').closest('fieldset').disabled);
  assert.equal(screen.getByRole('button', { name: 'Reload content' }).disabled, true);
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  assert.equal(saves, 1);
  await act(async () => held.resolve());
  assert.equal(screen.getByLabelText('Page heading').value, 'One save');
  assert.equal(state.records[0].published.heading, 'Accessible Podcasts.');
});

test('revision conflicts retain unsaved text and require explicit discard before reload', async () => {
  const { user, state } = await open();
  state.records[0].revision = 2; state.records[0].draft.heading = 'Other editor version';
  fireEvent.change(screen.getByLabelText('Page heading'), { target: { value: 'My unsaved version' } });
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  assert.equal(screen.getByLabelText('Page heading').value, 'My unsaved version');
  await user.click(screen.getByRole('button', { name: 'Reload latest saved version' }));
  await user.click(screen.getByRole('button', { name: 'Keep editing' }));
  assert.equal(screen.getByLabelText('Page heading').value, 'My unsaved version');
  await user.click(screen.getByRole('button', { name: 'Reload latest saved version' }));
  await user.click(screen.getByRole('button', { name: 'Continue', exact: true }));
  assert.equal(screen.getByLabelText('Page heading').value, 'Other editor version');
  assert.ok(screen.getByText('Revision 2'));
});

test('publisher confirms publishing and unpublishing separately', async () => {
  const { user, state } = await open();
  fireEvent.change(screen.getByLabelText('Page heading'), { target: { value: 'Approved live heading' } });
  assert.equal(screen.getByRole('button', { name: 'Publish', exact: true }).disabled, true);
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Publish', exact: true }));
  assert.equal(state.calls.some(call => call[0] === 'publish'), false);
  await user.click(screen.getByRole('button', { name: 'Keep editing' }));
  assert.equal(state.records[0].published.heading, 'Accessible Podcasts.');
  await user.click(screen.getByRole('button', { name: 'Publish', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Continue', exact: true }));
  assert.equal(state.records[0].published.heading, 'Approved live heading');
  await user.click(screen.getByRole('button', { name: 'Unpublish', exact: true }));
  assert.notEqual(state.records[0].published, null);
  await user.click(screen.getByRole('button', { name: 'Continue', exact: true }));
  assert.equal(state.records[0].published, null);
  assert.equal(state.records[0].draft.heading, 'Approved live heading');
});

test('editors cannot use publishing controls and server denial hides workspace', async () => {
  const { user, state } = await open({ role: 'editor', overrides: { saveDraft: async () => { throw failure('ACCESS_DENIED', 'Role revoked'); } } });
  assert.equal(screen.getByRole('button', { name: 'Publish', exact: true }).disabled, true);
  assert.equal(screen.getByRole('button', { name: 'Unpublish', exact: true }).disabled, true);
  await user.click(screen.getByRole('button', { name: 'Publish', exact: true }));
  assert.equal(state.calls.some(call => call[0] === 'publish'), false);
  fireEvent.change(screen.getByLabelText('Page heading'), { target: { value: 'Lost access' } });
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  assert.ok(screen.getByRole('heading', { name: 'Editor access required' }));
  assert.equal(screen.queryByLabelText('Page heading'), null);
});

test('refresh keeps unsaved fields; expiry hides content and same-user reauthentication restores it', async () => {
  const { state, emit } = await open();
  const session = copy(state.session);
  fireEvent.change(screen.getByLabelText('Page heading'), { target: { value: 'Retain across refresh' } });
  await emit(session);
  assert.equal(screen.getByLabelText('Page heading').value, 'Retain across refresh');
  assert.equal(state.calls.filter(call => call[0] === 'load').length, 1);
  await emit(null);
  assert.equal(screen.queryByLabelText('Page heading'), null);
  assert.equal(screen.queryByText('Retain across refresh'), null);
  await emit(session);
  assert.equal(screen.getByLabelText('Page heading').value, 'Retain across refresh');
  assert.equal(window.localStorage.length, 0);
});

test('changing authenticated identity clears the previous user unsaved draft', async () => {
  const { emit } = await open();
  fireEvent.change(screen.getByLabelText('Page heading'), { target: { value: 'Private to previous account' } });
  await emit({ user: { id: 'second-editor', email: 'second@example.test' }, role: 'editor' });
  assert.equal(screen.getByLabelText('Page heading').value, 'Accessible Podcasts.');
  assert.equal(screen.getByRole('button', { name: 'Publish', exact: true }).disabled, true);
});

test('session-expired save preserves fields without a false saved message', async () => {
  const { user, state, emit } = await open({ overrides: { saveDraft: async () => { throw failure('SESSION_EXPIRED', 'Expired'); } } });
  fireEvent.change(screen.getByLabelText('Page heading'), { target: { value: 'Recover after expiry' } });
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  assert.equal(screen.queryByLabelText('Page heading'), null);
  assert.match(screen.getByRole('status').textContent, /session expired/);
  await emit(copy(state.session));
  assert.equal(screen.getByLabelText('Page heading').value, 'Recover after expiry');
});

test('sign-out requires unsaved discard confirmation and clears private state after success', async () => {
  const { user, state, emit } = await open(); const session = copy(state.session);
  fireEvent.change(screen.getByLabelText('Page heading'), { target: { value: 'Unsaved before sign-out' } });
  await user.click(screen.getByRole('button', { name: 'Sign out', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Keep editing' }));
  assert.equal(state.calls.some(call => call[0] === 'signOut'), false);
  await user.click(screen.getByRole('button', { name: 'Sign out', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Continue', exact: true }));
  await screen.findByRole('button', { name: 'Sign in' });
  await emit(session);
  assert.equal(screen.getByLabelText('Page heading').value, 'Accessible Podcasts.');
});

test('upload requires alt text, rejects unsupported files and leaves image as unsaved private draft', async () => {
  const { user, state } = await open();
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [new File(['valid image fixture'], 'image.png', { type: 'image/png' })] } });
  assert.match(screen.getByRole('status').textContent, /Alternative text/);
  assert.equal(state.calls.some(call => call[0] === 'upload'), false);
  fireEvent.change(screen.getByLabelText('Alternative text'), { target: { value: 'A community conversation' } });
  fireEvent.change(input, { target: { files: [new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' })] } });
  assert.match(screen.getByRole('status').textContent, /SVG/);
  await act(async () => fireEvent.change(input, { target: { files: [new File(['valid image fixture'], 'image.png', { type: 'image/png' })] } }));
  assert.deepEqual(state.calls.find(call => call[0] === 'upload'), ['upload', 'image.png', { documentId: 'page-home', alt: 'A community conversation' }]);
  assert.match(screen.getByLabelText('Stored image reference').value, /^\/api\/media\?path=/);
  await waitFor(() => assert.equal(screen.getByAltText('A community conversation').src, 'https://example.test/signed/image.png'));
  assert.equal(state.records[0].draft.imageSrc, '');
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  assert.match(state.records[0].draft.imageSrc, /^\/api\/media\?path=/);
  assert.equal(state.records[0].published.imageSrc, '');
  assert.equal(window.localStorage.length, 0);
});

test('new content cannot upload until saved and section navigation does not silently drop fields', async () => {
  const { user, state } = await open();
  await section(user, 'Blog posts'); await user.click(screen.getByRole('button', { name: '+ Add post' }));
  assert.equal(screen.getByRole('button', { name: 'Upload image', exact: true }).disabled, true);
  fireEvent.change(screen.getByLabelText('Post title'), { target: { value: 'A new story' } });
  await section(user, 'Pages'); await user.click(screen.getByRole('button', { name: 'Keep editing' }));
  assert.equal(screen.getByLabelText('Post title').value, 'A new story');
  fireEvent.change(screen.getByLabelText('Post slug'), { target: { value: 'a-new-story' } });
  fireEvent.change(screen.getByLabelText('Summary'), { target: { value: 'Our latest community story.' } });
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  assert.equal(screen.getByRole('button', { name: 'Upload image', exact: true }).disabled, false);
  assert.equal(state.records.find(record => record.type === 'post').published, null);
});

test('revision restore creates a new saved draft and leaves published snapshot unchanged', async () => {
  const { user, state } = await open();
  state.revisions = [{ id: 'revision-old', action: 'save', createdAt: '2026-10-18T10:00:00Z', data: { ...state.records[0].draft, heading: 'Older saved heading' } }];
  fireEvent.change(screen.getByLabelText('Page heading'), { target: { value: 'Unsaved work' } });
  await user.click(screen.getByRole('button', { name: 'Revision history' }));
  await user.click(screen.getByRole('button', { name: 'Restore as draft' }));
  assert.equal(state.calls.some(call => call[0] === 'restore'), false);
  await user.click(screen.getByRole('button', { name: 'Continue', exact: true }));
  assert.equal(screen.getByLabelText('Page heading').value, 'Older saved heading');
  assert.equal(state.records[0].published.heading, 'Accessible Podcasts.');
  assert.match(screen.getByRole('status').textContent, /Nothing was published/);
});

test('private draft website preview stays separate from published preview', async () => {
  const { user } = await open();
  fireEvent.change(screen.getByLabelText('Page heading'), { target: { value: 'Only in private preview' } });
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Preview draft', exact: true }));
  assert.ok(within(screen.getByRole('dialog')).getByRole('heading', { name: /Only in private preview/ }));
  await user.click(screen.getByRole('button', { name: 'Close Draft website preview' }));
  await user.click(screen.getByRole('button', { name: 'View published website' }));
  assert.ok(within(screen.getByRole('dialog')).getByRole('heading', { name: /Accessible Podcasts/ }));
  assert.equal(window.location.hash, '');
  assert.equal(window.localStorage.length, 0);
});


test('empty publisher workspace requires explicit initialization before editing collections', async () => {
  const setup = fixture(); setup.state.records = [];
  render(React.createElement(AdminApp, { repository: setup.repository }));
  const user = userEvent.setup({ document: dom.window.document });
  await screen.findByRole('button', { name: 'Import current website content' });
  await section(user, 'Blog posts');
  assert.equal(screen.queryByRole('button', { name: '+ Add post' }), null);
  await user.click(screen.getByRole('button', { name: 'Import current website content' }));
  assert.equal(setup.state.calls.some(call => call[0] === 'initialize'), false);
  await user.click(screen.getByRole('button', { name: 'Keep editing' }));
  await user.click(screen.getByRole('button', { name: 'Import current website content' }));
  await user.click(screen.getByRole('button', { name: 'Continue', exact: true }));
  assert.equal(screen.getByLabelText('Page heading').value, 'Accessible Podcasts.');
  assert.match(screen.getByRole('status').textContent, /Current website content imported/);
});

test('empty editor workspace cannot initialize published content', async () => {
  const setup = fixture({ role: 'editor' }); setup.state.records = [];
  render(React.createElement(AdminApp, { repository: setup.repository }));
  await screen.findByText('Initial content setup requires a publisher.');
  assert.equal(screen.queryByRole('button', { name: 'Import current website content' }), null);
  assert.equal(setup.state.calls.some(call => call[0] === 'initialize'), false);
});


test('failed publish leaves published snapshot intact and reports no success', async () => {
  const { user, state } = await open({ overrides: { publish: async () => { throw new Error('Publish service unavailable'); } } });
  await user.click(screen.getByRole('button', { name: 'Publish', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Continue', exact: true }));
  assert.match(screen.getByRole('status').textContent, /Could not publish.*Publish service unavailable/);
  assert.doesNotMatch(screen.getByRole('status').textContent, /successfully/);
  assert.equal(state.records[0].published.heading, 'Accessible Podcasts.');
});

test('failed sign-out preserves unsaved fields and never claims the session ended', async () => {
  const { user } = await open({ overrides: { signOut: async () => { throw new Error('Sign-out network error'); } } });
  fireEvent.change(screen.getByLabelText('Page heading'), { target: { value: 'Still signed in with changes' } });
  await user.click(screen.getByRole('button', { name: 'Sign out', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Continue', exact: true }));
  assert.match(screen.getByRole('status').textContent, /Could not sign out/);
  assert.equal(screen.getByLabelText('Page heading').value, 'Still signed in with changes');
});

test('late save results cannot restore a private workspace after session loss', async () => {
  const held = defer();
  const { user, emit } = await open({ overrides: { saveDraft: async record => { await held.promise; return { ...record, revision: 1 }; } } });
  fireEvent.change(screen.getByLabelText('Page heading'), { target: { value: 'Save in flight' } });
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  await emit(null);
  await act(async () => held.resolve());
  assert.ok(screen.getByRole('button', { name: 'Sign in' }));
  assert.equal(screen.queryByLabelText('Page heading'), null);
  assert.doesNotMatch(screen.getByRole('status').textContent, /Draft saved/);
});

test('failed upload keeps the prior image and remove-image changes remain unsaved until saving', async () => {
  const { user, state } = await open({ overrides: { uploadImage: async () => { throw new Error('Storage unavailable'); } } });
  await section(user, 'Founder');
  const original = screen.getByLabelText('Stored image reference').value;
  assert.equal(screen.getByLabelText('Stored image reference').readOnly, true);
  await act(async () => fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [new File(['fixture'], 'image.png', { type: 'image/png' })] } }));
  assert.match(screen.getByRole('status').textContent, /Could not upload image.*Storage unavailable/);
  assert.equal(screen.getByLabelText('Stored image reference').value, original);
  await user.click(screen.getByRole('button', { name: 'Remove image from draft' }));
  assert.equal(screen.getByLabelText('Stored image reference').value, '');
  assert.equal(state.records.find(record => record.type === 'founder').draft.imageSrc, original);
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  assert.equal(state.records.find(record => record.type === 'founder').draft.imageSrc, '');
  assert.equal(state.records.find(record => record.type === 'founder').published.imageSrc, original);
});


test('configured preview states the publishing target in banner, confirmation and success message', async () => {
  const { user } = await open();
  const banner = screen.getByLabelText('Publishing environment');
  assert.match(banner.textContent, /Connected CMS preview/);
  assert.match(banner.textContent, /Changes update this preview’s published content/);
  assert.match(banner.textContent, /Production is not connected for this review/);
  assert.ok(screen.getByText('Publish to preview site'));
  await user.click(screen.getByRole('button', { name: 'Publish', exact: true }));
  assert.match(screen.getByRole('dialog').textContent, /published version on this preview site/);
  await user.click(screen.getByRole('button', { name: 'Continue', exact: true }));
  assert.match(screen.getByRole('status').textContent, /available to this preview site/);
  assert.doesNotMatch(screen.getByRole('status').textContent, /public website/);
});

test('production build explicitly labels publishing as a public website change', async () => {
  const setup = fixture();
  render(React.createElement(AdminApp, { repository: setup.repository, deploymentEnvironment: 'production' }));
  await screen.findByRole('button', { name: 'Save draft', exact: true });
  const banner = screen.getByLabelText('Publishing environment');
  assert.match(banner.textContent, /Production content workspace/);
  assert.match(banner.textContent, /Publishing changes the public website/);
  assert.doesNotMatch(banner.textContent, /Production is not connected/);
});


test('authenticated sponsors reuse private save, upload, targeting checks, preview and confirmed publication', async () => {
  const { user, state } = await open();
  await section(user, 'Sponsors'); await user.click(screen.getByRole('button', { name: '+ Add sponsor' }));
  assert.equal(screen.getByLabelText('Enable when published').checked, false);
  assert.equal(screen.getByRole('button', { name: 'Upload image', exact: true }).disabled, true);
  await user.selectOptions(screen.getByLabelText('Sponsor placement'), 'episode');
  assert.equal(screen.getByLabelText('Episode targeting').value, 'undecided');
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  const stored = () => state.records.find(item => item.type === 'sponsor');
  assert.equal(stored().published, null); assert.equal(stored().draft.enabled, false);
  assert.equal(screen.getByRole('button', { name: 'Upload image', exact: true }).disabled, false);
  fireEvent.change(screen.getByLabelText('Sponsor name'), { target: { value: 'Approved partner' } });
  fireEvent.change(screen.getByLabelText('Destination link'), { target: { value: 'https://example.com/' } });
  fireEvent.change(screen.getByLabelText('Alternative text'), { target: { value: 'Approved partner logo' } });
  await act(async () => fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [new File(['fixture'], 'sponsor.png', { type: 'image/png' })] } }));
  assert.equal(state.calls.find(call => call[0] === 'upload')[2].documentId, stored().id);
  await user.click(screen.getByLabelText('Enable when published'));
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  assert.equal(stored().draft.enabled, true); assert.equal(stored().published, null);
  assert.equal(screen.getByRole('button', { name: 'Publish', exact: true }).disabled, true);
  assert.ok(screen.getByText(/Resolve episode targeting before publishing/));
  await user.selectOptions(screen.getByLabelText('Episode targeting'), 'episode');
  const target = state.records.find(item => item.type === 'episode');
  await user.selectOptions(screen.getByLabelText('Target episode'), target.id);
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  assert.equal(screen.getByRole('button', { name: 'Publish', exact: true }).disabled, false);
  await user.click(screen.getByRole('button', { name: 'Preview draft', exact: true }));
  const preview = screen.getByRole('dialog', { name: 'Draft website preview' });
  const ad = within(preview).getByRole('complementary', { name: 'Podcast episode pages sponsorship' });
  assert.equal(ad.closest('.synced-player-shell'), null);
  assert.equal(within(ad).getByRole('link').getAttribute('rel'), 'sponsored noopener noreferrer');
  assert.ok(within(ad).getByRole('img', { name: 'Approved partner logo' }));
  await user.click(within(preview).getByRole('button', { name: 'Close Draft website preview' }));
  await user.click(screen.getByRole('button', { name: 'View published website', exact: true }));
  const publishedPreview = screen.getByRole('dialog', { name: 'Published website preview' });
  assert.equal(within(publishedPreview).queryByRole('link', { name: /Visit Approved partner/ }), null);
  await user.click(within(publishedPreview).getByRole('button', { name: 'Close Published website preview' }));
  await user.click(screen.getByRole('button', { name: 'Publish', exact: true }));
  assert.equal(state.calls.some(call => call[0] === 'publish'), false);
  await user.click(screen.getByRole('button', { name: 'Continue', exact: true }));
  assert.equal(stored().published.episodeId, target.id);
  await user.click(screen.getByRole('button', { name: 'Unpublish', exact: true }));
  assert.notEqual(stored().published, null);
  await user.click(screen.getByRole('button', { name: 'Continue', exact: true }));
  assert.equal(stored().published, null); assert.equal(stored().draft.name, 'Approved partner');
  assert.equal(window.localStorage.length, 0);
});

test('sponsor editor cannot publish and unsafe off-draft destinations do not save', async () => {
  const { user, state } = await open({ role: 'editor' });
  await section(user, 'Sponsors'); await user.click(screen.getByRole('button', { name: '+ Add sponsor' }));
  fireEvent.change(screen.getByLabelText('Destination link'), { target: { value: 'javascript:alert(1)' } });
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  assert.equal(document.activeElement, screen.getByLabelText('Destination link'));
  assert.equal(state.calls.some(call => call[0] === 'save'), false);
  fireEvent.change(screen.getByLabelText('Destination link'), { target: { value: '' } });
  await user.click(screen.getByRole('button', { name: 'Save draft', exact: true }));
  assert.equal(state.records.find(item => item.type === 'sponsor').published, null);
  assert.equal(screen.getByRole('button', { name: 'Publish', exact: true }).disabled, true);
  await user.click(screen.getByRole('button', { name: 'Publish', exact: true }));
  assert.equal(state.calls.some(call => call[0] === 'publish'), false);
});

test('per-episode sponsor preview opens its target and disappears when another episode is selected', async () => {
  const documents = createSeedDocuments(); const target = documents.find(item => item.type === 'episode');
  const second = { ...copy(target), id: 'second-episode', draft: { ...target.draft, title: 'Second show', episodeTitle: 'Second episode' }, published: { ...target.published, title: 'Second show', episodeTitle: 'Second episode' } };
  documents.push(second);
  const sponsor = createDraft('sponsor', 'sponsor-targeted');
  sponsor.draft = { ...sponsor.draft, placement: 'episode', targeting: 'episode', episodeId: second.id, enabled: true, name: 'Targeted partner', imageSrc: '/inclusive-quest-logo.png', imageAlt: 'Targeted partner logo', destinationUrl: 'https://example.com/' };
  documents.push(sponsor);
  const { user } = await open({ documents }); await section(user, 'Sponsors');
  await user.click(screen.getByRole('button', { name: 'Preview draft', exact: true }));
  const preview = screen.getByRole('dialog', { name: 'Draft website preview' });
  assert.ok(within(preview).getByRole('link', { name: /Visit Targeted partner/ }));
  const originalCard = [...preview.querySelectorAll('button.title-card')].find(button => button.textContent.includes(target.draft.title));
  await user.click(originalCard);
  assert.equal(within(preview).queryByRole('link', { name: /Visit Targeted partner/ }), null);
});

test('sponsor history restores only a private draft and leaves its published advertiser unchanged', async () => {
  const documents = createSeedDocuments(); const sponsor = createDraft('sponsor', 'sponsor-history');
  sponsor.draft = { ...sponsor.draft, enabled: true, name: 'Published partner', imageSrc: '/inclusive-quest-logo.png', imageAlt: 'Partner logo', destinationUrl: 'https://example.com/' };
  sponsor.published = copy(sponsor.draft); sponsor.revision = 4; documents.push(sponsor);
  const { user, state } = await open({ documents }); await section(user, 'Sponsors');
  state.revisions.push({ id: 'sponsor-old', action: 'save', data: { ...sponsor.draft, enabled: false, name: 'Earlier private partner' } });
  await user.click(screen.getByRole('button', { name: 'Revision history', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Restore as draft', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Continue', exact: true }));
  assert.equal(screen.getByLabelText('Sponsor name').value, 'Earlier private partner');
  assert.equal(screen.getByLabelText('Enable when published').checked, false);
  assert.equal(state.records.find(item => item.id === sponsor.id).published.name, 'Published partner');
  assert.equal(state.calls.some(call => call[0] === 'publish'), false);
});

test('setup session renders password completion before any private workspace load and requires fresh login',async()=>{
 const {user,state}=await open({passwordSetup:true});
 assert.equal(state.calls.some(call=>call[0]==='load'),false);
 assert.equal(screen.queryByLabelText('Page heading'),null);
 assert.equal(screen.getByLabelText('New password').autocomplete,'new-password');
 fireEvent.change(screen.getByLabelText('New password'),{target:{value:'fictional setup passphrase'}});
 fireEvent.change(screen.getByLabelText('Confirm new password'),{target:{value:'different passphrase'}});
 await user.click(screen.getByRole('button',{name:'Save password and sign out'}));
 assert.match(screen.getByRole('status').textContent,/must match/);assert.equal(state.calls.length,0);
 fireEvent.change(screen.getByLabelText('Confirm new password'),{target:{value:'fictional setup passphrase'}});
 await user.click(screen.getByRole('button',{name:'Save password and sign out'}));
 assert.ok(screen.getByRole('button',{name:'Sign in'}));
 assert.match(screen.getByRole('status').textContent,/password is saved/);
 assert.equal(state.calls.filter(call=>call[0]==='setup').length,1);
 assert.equal(screen.queryByLabelText('New password'),null);assert.equal(screen.queryByLabelText('Page heading'),null);
});
test('setup repeated clicks stay single-flight and provider errors stay generic with fields cleared',async()=>{
 const pending=defer();let submissions=0;
 const {user}=await open({passwordSetup:true,overrides:{completePasswordSetup:()=>{submissions++;return pending.promise;}}});
 fireEvent.change(screen.getByLabelText('New password'),{target:{value:'fictional setup passphrase'}});
 fireEvent.change(screen.getByLabelText('Confirm new password'),{target:{value:'fictional setup passphrase'}});
 await user.dblClick(screen.getByRole('button',{name:'Save password and sign out'}));
 assert.equal(submissions,1);assert.equal(screen.getByLabelText('New password').value,'');
 await act(async()=>pending.reject(new Error('private provider detail')));
 assert.match(screen.getByRole('status').textContent,/Could not confirm/);
 assert.doesNotMatch(screen.getByRole('status').textContent,/private provider/);
 assert.equal(screen.getByLabelText('Confirm new password').value,'');
});
test('password saved but logout failed is explicit and never opens workspace',async()=>{
 const {user,state}=await open({passwordSetup:true,overrides:{completePasswordSetup:async()=>{throw failure('PASSWORD_SAVED_SIGNOUT_REQUIRED','provider detail');}}});
 for(const name of ['New password','Confirm new password'])fireEvent.change(screen.getByLabelText(name),{target:{value:'fictional setup passphrase'}});
 await user.click(screen.getByRole('button',{name:'Save password and sign out'}));
 assert.match(screen.getByRole('status').textContent,/password was saved.*sign-out could not be confirmed/);
 assert.equal(state.calls.some(call=>call[0]==='load'),false);
 await user.click(screen.getByRole('button',{name:'Sign out',exact:true}));
 assert.ok(screen.getByRole('button',{name:'Sign in'}));
});
test('setup fields clear when identity changes or the session disappears',async()=>{
 const {emit,state}=await open({passwordSetup:true});
 fireEvent.change(screen.getByLabelText('New password'),{target:{value:'fictional setup passphrase'}});
 await emit({...state.session,user:{id:'another-user',email:'another@example.test'}});
 assert.equal(screen.getByLabelText('New password').value,'');
 await emit(null);assert.ok(screen.getByRole('button',{name:'Sign in'}));
 assert.equal(screen.queryByLabelText('New password'),null);
 assert.equal(screen.queryByLabelText('Page heading'),null);
});
test('recovery event wins over an earlier pending ordinary-session check before workspace opens',async()=>{
 const initial=defer();let reads=0;
 const setup=fixture({overrides:{getSession:async()=>++reads===1?initial.promise:setup.state.session}});
 const ordinary=copy(setup.state.session);
 render(React.createElement(AdminApp,{repository:setup.repository}));
 await setup.emit({...ordinary,requiresPasswordSetup:true});
 await screen.findByRole('heading',{name:'Set your password'});
 await act(async()=>initial.resolve(ordinary));
 assert.ok(screen.getByRole('heading',{name:'Set your password'}));
 assert.equal(setup.state.calls.some(call=>call[0]==='load'),false);
 assert.equal(screen.queryByLabelText('Page heading'),null);
});
