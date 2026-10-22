import { createClient } from '@supabase/supabase-js';
import { readBackendConfig, IMAGE_BUCKET, MAX_IMAGE_BYTES, imagePathFromSource, detectImageType } from './backend-config.js';
import { canonicalContent } from './canonical-content.js';
import { validateDraftCollection, createSeedDocuments } from './content-model.js';

export class SetupRequiredError extends Error {
  constructor() { super('Secure sign-in and content storage are not connected. Publishing and uploads are unavailable.'); this.name = 'SetupRequiredError'; this.code = 'SETUP_REQUIRED'; }
}
export class ConflictError extends Error {
  constructor() { super('Someone changed this content since you opened it. Reload the saved version before trying again; your unsaved fields have not been overwritten.'); this.name = 'ConflictError'; this.code = 'REVISION_CONFLICT'; }
}
function backendError(error) {
  if (error?.code === 'PT409') return new ConflictError();
  const session = error?.status === 401 || ['PGRST301', 'PGRST302', 'PT401'].includes(error?.code);
  const denied = ['PT403', '42501'].includes(error?.code);
  const result = new Error(session ? 'Your session expired. Sign in again to continue.' : denied ? 'This account does not have permission for that action.' : error?.message || 'The request could not be completed. Please try again.');
  result.code = session ? 'SESSION_EXPIRED' : denied ? 'ACCESS_DENIED' : error?.code || 'REQUEST_FAILED';
  return result;
}
const unavailable = async () => { throw new SetupRequiredError(); };
const disabledRepository = Object.freeze({
  configured: false,
  capabilities: Object.freeze({ signIn: false, saveDraft: false, publish: false, upload: false }),
  getSession: async () => null, onAuthStateChange: () => () => {},
  requestSignIn: unavailable, signIn: unavailable, signOut: unavailable,
  loadWorkspace: unavailable, initialize: unavailable, listDocuments: unavailable, saveDraft: unavailable,
  publish: unavailable, unpublish: unavailable, uploadImage: unavailable, upload: unavailable,
  listRevisions: unavailable, restoreRevision: unavailable, previewDocuments: unavailable
});

/** Admin-generated invitations use implicit callbacks; normal email sign-in uses PKCE.
 * The SDK, never this helper, consumes/verifies tokens and removes callback fragments. */
export function authFlowForHash(hash = '') {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return params.get('type') === 'invite' && params.has('access_token') && params.has('refresh_token') ? 'implicit' : 'pkce';
}

/** SDK injection makes transport tests independent of live credentials. */
export function createAdminRepository({ config, client, create = createClient, callbackHash = typeof window === 'undefined' ? '' : window.location.hash, origin = typeof window === 'undefined' ? '' : window.location.origin, uuid = () => crypto.randomUUID() } = {}) {
  if (!config && !client) return disabledRepository;
  const db = client || create(config.url, config.publishableKey, { auth: {
    flowType: authFlowForHash(callbackHash), detectSessionInUrl: true, persistSession: true, autoRefreshToken: true,
    storageKey: 'inclusive-quest-cms-auth-v1'
  } });
  const pendingOperations = new Map();
  let identity = null;
  let initializationChecked = false;
  const rpc = async (name, args) => {
    const { data, error } = await db.rpc(name, args);
    if (error) throw backendError(error);
    return data;
  };
  const getSession = async () => {
    if (!initializationChecked && db.auth.initialize) {
      initializationChecked = true;
      const { error } = await db.auth.initialize();
      if (error) {
        const invalid = new Error('The sign-in link is invalid or expired. Request a fresh link and open it in the same browser.');
        invalid.code = 'SESSION_EXPIRED'; throw invalid;
      }
    }
    // Verify with Auth, then check live database membership, never user_metadata.
    const { data, error } = await db.auth.getUser();
    if (error || !data?.user) {
      if (!error || error.name === 'AuthSessionMissingError' || error.status === 401 || error.status === 403) { identity = null; return null; }
      throw backendError(error);
    }
    const member = await rpc('cms_session');
    if (!member || !['editor', 'publisher'].includes(member.role)) throw backendError({ code: 'PT403' });
    if (identity !== data.user.id) pendingOperations.clear();
    identity = data.user.id;
    return { user: { id: data.user.id, email: data.user.email }, role: member.role };
  };
  const requireSession = async () => {
    const session = await getSession();
    if (!session) throw backendError({ code: 'PT401' });
    return session;
  };
  const checkedDocument = value => {
    validateDraftCollection([value]);
    if (!Number.isSafeInteger(value.revision) || value.revision < 1) throw new Error('Invalid saved content response.');
    return value;
  };
  const mutate = async (name, args) => {
    const session = await requireSession();
    const signature = JSON.stringify([session.user.id, name, args]);
    const operationId = pendingOperations.get(signature) || uuid();
    pendingOperations.set(signature, operationId);
    try {
      const result = await rpc(name, { ...args, p_operation_id: operationId });
      const document = checkedDocument(result?.document);
      pendingOperations.delete(signature);
      return document;
    } catch (error) {
      // Reuse after uncertain transport failures; explicit rejection did not commit.
      if (['SESSION_EXPIRED', 'ACCESS_DENIED', 'REVISION_CONFLICT', 'PT400', 'PT404'].includes(error.code)) pendingOperations.delete(signature);
      throw error;
    }
  };
  const listDocuments = async () => {
    await requireSession();
    const records = await rpc('cms_list_documents');
    validateDraftCollection(records);
    return records.map(checkedDocument);
  };
  const repository = {
    configured: true,
    // Implemented features only, not authorization. Server checks every operation.
    capabilities: { signIn: true, saveDraft: true, publish: true, upload: true },
    getSession,
    onAuthStateChange(callback) {
      const { data } = db.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') { identity = null; pendingOperations.clear(); }
        queueMicrotask(() => callback(event, session));
      });
      return () => data.subscription.unsubscribe();
    },
    async requestSignIn(email) {
      if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Enter your invited email address.');
      const callback = new URL('/admin', origin);
      if (callback.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(callback.hostname)) throw new Error('Secure sign-in requires HTTPS.');
      const { error } = await db.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: callback.href } });
      if (error) throw backendError(error);
    },
    async signOut() {
      const { error } = await db.auth.signOut({ scope: 'local' });
      if (error) throw backendError(error);
      identity = null; pendingOperations.clear();
    },
    async loadWorkspace() { const session = await requireSession(); return { member: { role: session.role }, documents: await listDocuments() }; },
    listDocuments,
    async initialize() {
      const session = await requireSession();
      if (session.role !== 'publisher') throw backendError({ code: 'PT403' });
      const documents = createSeedDocuments().map(record => ({id:record.id,type:record.type,data:canonicalContent(record.type,record.published)}));
      const signature = JSON.stringify([session.user.id,'cms_initialize',documents]);
      const operation = pendingOperations.get(signature) || uuid();
      pendingOperations.set(signature,operation);
      const result = await rpc('cms_initialize',{p_documents:documents,p_operation_id:operation});
      validateDraftCollection(result?.documents);
      pendingOperations.delete(signature);
      return result.documents.map(checkedDocument);
    },
    saveDraft(record, expectedRevision) {
      return mutate('cms_save_draft', { p_id: record.id, p_type: record.type, p_data: canonicalContent(record.type, record.draft), p_expected_revision: expectedRevision });
    },
    publish(id, expectedRevision) { return mutate('cms_publish', { p_id: id, p_expected_revision: expectedRevision }); },
    unpublish(id, expectedRevision) { return mutate('cms_unpublish', { p_id: id, p_expected_revision: expectedRevision }); },
    async listRevisions(id) { await requireSession(); return rpc('cms_get_revisions', { p_id: id }); },
    restoreRevision(id, revisionId, expectedRevision) { return mutate('cms_restore_revision', { p_id: id, p_revision_id: revisionId, p_expected_revision: expectedRevision }); },
    async uploadImage(file, { alt = '' } = {}) {
      const session = await requireSession();
      if (!file || file.size <= 0 || file.size > MAX_IMAGE_BYTES || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image up to 4 MB.');
      if (!alt.trim() || alt.length > 500) throw new Error('Add descriptive alternative text before uploading (up to 500 characters).');
      const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      if (detectImageType(bytes) !== file.type) throw new Error('The image contents do not match the selected file type.');
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      const path = `${session.user.id}/${uuid()}.${extension}`;
      const { error } = await db.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw backendError(error);
      const asset = await rpc('cms_register_asset', { p_path: path });
      const { data, error: signedError } = await db.storage.from(IMAGE_BUCKET).createSignedUrl(path, 300);
      if (signedError) throw backendError(signedError);
      return { imageSrc: asset.imageSrc, previewUrl: data.signedUrl };
    },
    async previewDocuments(documents, mode = 'draft') {
      await requireSession();
      const result = structuredClone(mode === 'published' ? documents.filter(record => record.published) : documents);
      const signed = new Map();
      for (const record of result) {
        const source = mode === 'published' ? record.published : record.draft;
        if (!source) continue;
        for (const field of ['imageSrc', 'interpreterImageSrc']) {
          const path = imagePathFromSource(source[field]);
          if (path) {
            if (!signed.has(path)) {
              const { data, error } = await db.storage.from(IMAGE_BUCKET).createSignedUrl(path, 300);
              if (error) throw backendError(error);
              signed.set(path, data.signedUrl);
            }
            source[field] = signed.get(path);
          }
        }
        if (mode === 'published') record.draft = source;
      }
      return result;
    }
  };
  repository.signIn = repository.requestSignIn;
  repository.upload = repository.uploadImage;
  return Object.freeze(repository);
}
export const adminRepository = createAdminRepository({ config: readBackendConfig(import.meta.env || {}) });
