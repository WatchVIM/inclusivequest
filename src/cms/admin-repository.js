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
  requestSignIn: unavailable, signIn: unavailable, signOut: unavailable, completePasswordSetup: unavailable,
  loadWorkspace: unavailable, initialize: unavailable, listDocuments: unavailable, saveDraft: unavailable,
  publish: unavailable, unpublish: unavailable, uploadImage: unavailable, upload: unavailable,
  listRevisions: unavailable, restoreRevision: unavailable, previewDocuments: unavailable
});

/** Owner-generated invite/recovery links can use implicit callbacks; PKCE codes remain SDK-managed.
 * The SDK, never this helper, consumes/verifies tokens and removes callback fragments. */
export function authFlowForHash(hash = '') {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return ['invite', 'recovery'].includes(params.get('type')) && params.has('access_token') && params.has('refresh_token') ? 'implicit' : 'pkce';
}


export function passwordSetupFeedback(password = '', confirmation = '') {
  if (password.length < 12) return 'Use at least 12 characters. A long, unique passphrase is recommended.';
  if (password.length > 128) return 'Use no more than 128 characters.';
  if (password !== confirmation) return 'The passwords must match.';
  return '';
}
function setupClaims(token) {
  try {
    const segment = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = segment.padEnd(Math.ceil(segment.length / 4) * 4, '=');
    const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), char => char.charCodeAt(0))));
    return { subject: claims.sub, setup: Array.isArray(claims.amr) && claims.amr.some(item => ['invite', 'recovery'].includes(item?.method)) };
  } catch { return { subject: null, setup: false }; }
}
function clearAuthCallbackUrl() {
  if (typeof window === 'undefined' || !window.history) return;
  const url = new URL(window.location.href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  if (['access_token', 'refresh_token', 'error', 'error_code', 'error_description'].some(key => fragment.has(key))) url.hash = '';
  for (const key of ['code', 'access_token', 'refresh_token', 'error', 'error_code', 'error_description']) url.searchParams.delete(key);
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
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
  let setupHint = authFlowForHash(callbackHash) === 'implicit';
  let setupUser = null;
  let setupInFlight = false;
  let setupCompleted = false;
  let sessionGeneration = 0;
  let invalidCallback = false;
  const rpc = async (name, args) => {
    const { data, error } = await db.rpc(name, args);
    if (error) throw backendError(error);
    return data;
  };
  const getSession = async () => {
    if (invalidCallback) throw Object.assign(new Error('This setup link is invalid or expired. Ask the site owner for a new secure link.'), { code: 'SESSION_EXPIRED' });
    if (!initializationChecked && db.auth.initialize) {
      initializationChecked = true;
      let error;
      const hadCode = typeof window !== 'undefined' && new URL(window.location.href).searchParams.has('code');
      try {
        ({ error } = await db.auth.initialize());
        if (hadCode && new URL(window.location.href).searchParams.has('code')) error = true;
      } catch { error = true; }
      finally { clearAuthCallbackUrl(); }
      if (error) {
        invalidCallback = true;
        throw Object.assign(new Error('This setup link is invalid or expired. Ask the site owner for a new secure link.'), { code: 'SESSION_EXPIRED' });
      }
    }
    // Verify the actual SDK token with Auth before using its AMR for UI routing.
    // This is not a substitute for a server-side password-method authorization rule.
    let authSession = null;
    if (db.auth.getSession) {
      const result = await db.auth.getSession();
      if (result.error) throw backendError({ code: 'PT401' });
      authSession = result.data?.session;
    }
    const { data, error } = await db.auth.getUser(authSession?.access_token);
    if (error || !data?.user) {
      if (!error || error.name === 'AuthSessionMissingError' || error.status === 401 || error.status === 403) { identity = null; return null; }
      throw backendError({ code: 'PT401' });
    }
    const claims = authSession?.access_token ? setupClaims(authSession.access_token) : null;
    if (claims && claims.subject !== data.user.id) throw backendError({ code: 'PT401' });
    if (setupHint || claims?.setup) setupUser = data.user.id;
    setupHint = false;
    const member = await rpc('cms_session');
    if (!member || !['editor', 'publisher'].includes(member.role)) throw backendError({ code: 'PT403' });
    if (identity !== data.user.id) pendingOperations.clear();
    identity = data.user.id;
    return { user: { id: data.user.id, email: data.user.email }, role: member.role, ...(setupUser === data.user.id || setupCompleted ? { requiresPasswordSetup: true } : {}) };
  };
  const requireSession = async () => {
    const session = await getSession();
    if (!session) throw backendError({ code: 'PT401' });
    if (session.requiresPasswordSetup) throw Object.assign(new Error('Finish password setup and sign in again before opening the workspace.'), { code: 'PASSWORD_SETUP_REQUIRED' });
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
        if (['SIGNED_IN', 'SIGNED_OUT', 'PASSWORD_RECOVERY'].includes(event)) sessionGeneration += 1;
        if (event === 'PASSWORD_RECOVERY') setupUser = session?.user?.id || null;
        if (event === 'SIGNED_OUT') { identity = null; setupUser = null; setupHint = false; pendingOperations.clear(); }
        queueMicrotask(() => callback(event, session));
      });
      return () => data.subscription.unsubscribe();
    },
    async requestSignIn(email, password) {
      const failure = () => new Error('Unable to sign in. Check your email and password, or contact the site owner.');
      if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== 'string' || !password) throw failure();
      const callback = new URL('/admin', origin || 'http://localhost');
      if (callback.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(callback.hostname)) throw failure();
      let authenticated = false;
      try {
        const { error } = await db.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw failure();
        authenticated = true; setupCompleted = false; invalidCallback = false; setupUser = null; setupHint = false;
        const session = await getSession();
        if (!session) throw failure();
        return session;
      } catch {
        if (authenticated) {
          try { await db.auth.signOut({ scope: 'local' }); } catch { /* No credentials or Auth errors are logged. */ }
          identity = null; pendingOperations.clear();
        }
        throw failure();
      }
    },
    async completePasswordSetup(password, confirmation, expectedUserId) {
      const failure = () => new Error('Could not confirm your password setup. Try again, or ask the site owner for a new secure link.');
      if (setupInFlight || setupCompleted || passwordSetupFeedback(password, confirmation)) throw failure();
      const callback = new URL('/admin', origin || 'http://localhost');
      if (callback.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(callback.hostname)) throw failure();
      setupInFlight = true;
      const generation = sessionGeneration;
      try {
        const session = await getSession();
        if (!session?.requiresPasswordSetup || session.user.id !== expectedUserId || generation !== sessionGeneration) throw failure();
        // Recheck immediately before the explicit user-submitted credential update.
        const { data, error } = await db.auth.getUser();
        if (error || data?.user?.id !== expectedUserId || generation !== sessionGeneration) throw failure();
        const updated = await db.auth.updateUser({ password });
        if (updated.error) throw failure();
        setupCompleted = true; // Fail closed even if logout is interrupted.
        try {
          if (updated.data?.user?.id !== expectedUserId || generation !== sessionGeneration) throw new Error('Session changed');
          const signedOut = await db.auth.signOut({ scope: 'local' });
          if (signedOut.error) throw new Error('Sign-out unconfirmed');
        } catch {
          throw Object.assign(new Error('Your password was saved, but sign-out could not be confirmed. Use Sign out before signing in again.'), { code: 'PASSWORD_SAVED_SIGNOUT_REQUIRED' });
        }
        identity = null; setupUser = null; setupHint = false; pendingOperations.clear();
        return { requiresFreshSignIn: true };
      } catch (error) {
        if (error?.code === 'PASSWORD_SAVED_SIGNOUT_REQUIRED') throw error;
        throw failure();
      } finally { setupInFlight = false; }
    },
    async signOut() {
      const { error } = await db.auth.signOut({ scope: 'local' });
      if (error) throw backendError(error);
      identity = null; setupUser = null; setupHint = false; pendingOperations.clear();
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
