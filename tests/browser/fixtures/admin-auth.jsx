// Local Vite-only browser fixture. Not referenced by the production entry point.
import React from 'react';
import { createRoot } from 'react-dom/client';
import AdminApp from '../../../src/admin/AdminApp.jsx';
import { createSeedDocuments } from '../../../src/cms/content-model.js';
import '../../../src/styles.css';

const copy = value => structuredClone(value);
const params = new URLSearchParams(location.search);
let session = params.has('signed-out') ? null : { user: { id: 'fixture-editor', email: 'editor@example.test' }, role: params.get('role') || 'publisher' };
let records = createSeedDocuments();
let callback;
const calls = [];
const fail = (code, message) => Object.assign(new Error(message), { code });
const repository = {
  configured: true,
  getSession: async () => session,
  onAuthStateChange: fn => { callback = fn; return () => { callback = null; }; },
  requestSignIn: async email => { calls.push(['signIn', email]); },
  signOut: async () => { calls.push(['signOut']); session = null; callback?.(); },
  loadWorkspace: async () => ({ member: { role: session.role }, documents: copy(records) }),
  saveDraft: async (record, revision) => {
    calls.push(['save', record.id, revision]);
    const current = records.find(item => item.id === record.id);
    if (current && current.revision !== revision) throw fail('REVISION_CONFLICT', 'A newer version exists.');
    const saved = { ...copy(record), revision: revision + 1 };
    records = current ? records.map(item => item.id === record.id ? saved : item) : [...records, saved];
    return copy(saved);
  },
  publish: async (id, revision) => {
    if (session.role !== 'publisher') throw fail('ACCESS_DENIED', 'Publisher role required.');
    calls.push(['publish', id, revision]); const record = records.find(item => item.id === id);
    record.published = copy(record.draft); record.revision += 1; return copy(record);
  },
  unpublish: async id => { calls.push(['unpublish', id]); const record = records.find(item => item.id === id); record.published = null; record.revision += 1; return copy(record); },
  previewDocuments: async (documents, mode) => copy(mode === 'published' ? documents.filter(record => record.published).map(record => ({ ...record, draft: record.published })) : documents),
  uploadImage: async () => { throw new Error('Upload fixture not enabled'); },
  listRevisions: async () => [],
  restoreRevision: async () => { throw new Error('No revision fixture'); }
};
window.adminFixture = {
  calls,
  expire() { session = null; callback?.(); },
  signIn() { session = { user: { id: 'fixture-editor', email: 'editor@example.test' }, role: params.get('role') || 'publisher' }; callback?.(); },
  concurrentEdit() { records[0].draft.heading = 'Changed by another editor'; records[0].revision += 1; },
  getRecords() { return copy(records); }
};
createRoot(document.getElementById('root')).render(<AdminApp repository={repository} deploymentEnvironment="preview" />);
