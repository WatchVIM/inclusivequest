// Local Vite-only browser fixture. Not referenced by the production entry point.
import React from 'react';
import { createRoot } from 'react-dom/client';
import AdminApp from '../../../src/admin/AdminApp.jsx';
import { createSeedDocuments } from '../../../src/cms/content-model.js';
import '../../../src/styles.css';

const copy = value => structuredClone(value);
const params = new URLSearchParams(location.search);
let session = params.has('signed-out') ? null : { user: { id: 'fixture-editor', email: 'editor@example.test' }, role: params.get('role') || 'publisher', ...(params.has('password-setup') ? { requiresPasswordSetup: true } : {}) };
let records = createSeedDocuments();
let callback;
const calls = [];
const revisions = new Map();
const remember = record => { const list = revisions.get(record.id) || []; list.push({ id: crypto.randomUUID(), action: 'save', createdAt: new Date().toISOString(), draft: copy(record.draft) }); revisions.set(record.id, list); };
const fail = (code, message) => Object.assign(new Error(message), { code });
const repository = {
  configured: true,
  getSession: async () => session,
  onAuthStateChange: fn => { callback = fn; return () => { callback = null; }; },
  requestSignIn: async (email, password) => {
    calls.push(['signIn', email]); // Never record even fixture password values.
    if (params.has('login-failure') || password !== 'fixture-password') throw new Error('Private provider details');
    session = { user: { id: 'fixture-editor', email }, role: params.get('role') || 'publisher' };
    callback?.();
  },
  completePasswordSetup: async (password, confirmation, expectedId) => {
    if (!session?.requiresPasswordSetup || session.user.id !== expectedId || password !== confirmation || password.length < 12) throw new Error('Invalid fixture setup');
    calls.push(['setup']); // Never record password values.
    session = null; callback?.('SIGNED_OUT', null); return { requiresFreshSignIn: true };
  },
  signOut: async () => { calls.push(['signOut']); session = null; callback?.(); },
  loadWorkspace: async () => ({ member: { role: session.role }, documents: copy(records) }),
  saveDraft: async (record, revision) => {
    calls.push(['save', record.id, revision]);
    const current = records.find(item => item.id === record.id);
    if (current && current.revision !== revision) throw fail('REVISION_CONFLICT', 'A newer version exists.');
    const saved = { ...copy(record), revision: revision + 1 };
    if (current) remember(current);
    records = current ? records.map(item => item.id === record.id ? saved : item) : [...records, saved];
    return copy(saved);
  },
  publish: async (id, revision) => {
    if (session.role !== 'publisher') throw fail('ACCESS_DENIED', 'Publisher role required.');
    calls.push(['publish', id, revision]); const record = records.find(item => item.id === id);
    record.published = copy(record.draft); record.revision += 1; return copy(record);
  },
  unpublish: async id => { calls.push(['unpublish', id]); const record = records.find(item => item.id === id); record.published = null; record.revision += 1; return copy(record); },
  previewDocuments: async (documents, mode) => {
    const rendered = copy(mode === 'published' ? documents.filter(record => record.published).map(record => ({ ...record, draft: record.published })) : documents);
    for (const record of rendered) for (const key of ['draft', 'published']) if (record[key]?.imageSrc?.startsWith('/api/media?path=')) record[key].imageSrc = '/inclusive-quest-logo.png';
    return rendered;
  },
  uploadImage: async (file, metadata) => {
    calls.push(['upload', file.name, metadata.documentId]);
    return { imageSrc: '/api/media?path=00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.png', previewUrl: '/sponsor-preview-placeholder.svg' };
  },
  listRevisions: async id => copy(revisions.get(id) || []),
  restoreRevision: async (id, revisionId, expectedRevision) => {
    const record = records.find(item => item.id === id);
    if (record.revision !== expectedRevision) throw fail('REVISION_CONFLICT', 'A newer version exists.');
    const revision = (revisions.get(id) || []).find(item => item.id === revisionId);
    if (!revision) throw new Error('Revision not found');
    calls.push(['restore', id, revisionId]); remember(record);
    record.draft = copy(revision.draft); record.revision += 1;
    return copy(record);
  }
};
window.adminFixture = {
  calls,
  expire() { session = null; callback?.(); },
  signIn() { session = { user: { id: 'fixture-editor', email: 'editor@example.test' }, role: params.get('role') || 'publisher' }; callback?.(); },
  concurrentEdit() { records[0].draft.heading = 'Changed by another editor'; records[0].revision += 1; },
  getRecords() { return copy(records); }
};
createRoot(document.getElementById('root')).render(<AdminApp repository={repository} deploymentEnvironment="preview" />);

