import { MAX_IMAGE_BYTES } from '../cms/backend-config.js';
import React, { useEffect, useRef, useState } from 'react';
import App from '../App.jsx';
import { ContentProvider } from '../cms/ContentProvider.jsx';
import {
  CONTENT_TYPES, TYPE_LABELS, POST_TEMPLATES, createDraft, documentTitle,
  hasDraftChanges, validateDocument, validateDraftCollection, publicationIssues, parseYouTubeUrl
} from '../cms/content-model.js';
import { FIELD_SETS, Dialog, Field, SponsorControls } from './admin-components.jsx';
import './admin.css';

const clone = value => JSON.parse(JSON.stringify(value));
const isExpired = error => error?.code === 'SESSION_EXPIRED' || error?.status === 401;
const isDenied = error => error?.code === 'ACCESS_DENIED' || error?.status === 403;
const isConflict = error => ['REVISION_CONFLICT', 'PT409'].includes(error?.code) || error?.name === 'ConflictError';
const statusLabel = record => !record.published ? 'Draft only' : hasDraftChanges(record) ? 'Unpublished changes' : 'Published';

/** Credentials belong to Supabase Auth. Drafts and signed preview URLs stay in memory only. */
export default function AuthenticatedAdminApp({ repository, deploymentEnvironment }) {
  const isPreviewDeployment = deploymentEnvironment === 'preview';
  const isProductionDeployment = deploymentEnvironment === 'production';
  const publishTarget = isPreviewDeployment ? 'this preview site' : isProductionDeployment ? 'the public website' : 'the connected CMS';
  const environmentTitle = isPreviewDeployment ? 'Connected CMS preview' : isProductionDeployment ? 'Production content workspace' : 'Connected CMS workspace';
  const environmentDescription = isPreviewDeployment ? 'Changes update this preview’s published content. Production is not connected for this review.' : isProductionDeployment ? 'Saved drafts are private. Publishing changes the public website.' : 'Publishing updates the connected CMS. Confirm the target before publishing.';
  const [gate, setGate] = useState('checking');
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(null);
  const [email, setEmail] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [records, setRecords] = useState([]);
  const [newRecord, setNewRecord] = useState(null);
  const [section, setSection] = useState('page');
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({});
  const [tagsText, setTagsText] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);
  const [search, setSearch] = useState('');
  const [postTemplate, setPostTemplate] = useState('story');
  const [busy, setBusy] = useState('');
  const [pending, setPending] = useState(null);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [interpreterImagePreview, setInterpreterImagePreview] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageRefresh, setImageRefresh] = useState(0);
  const fileRef = useRef(null);
  const interpreterFileRef = useRef(null);
  const busyRef = useRef(false);
  const gateRef = useRef('checking');
  const retainedUserRef = useRef(null);
  const sessionCheckRef = useRef(0);
  const operationEpoch = useRef(0);
  const mounted = useRef(false);
  const refreshRef = useRef(null);
  const allRecords = newRecord ? [...records, newRecord] : records;
  const selected = allRecords.find(record => record.id === selectedId);
  const workingForm = selected?.type === 'episode' ? { ...form, tags: [...new Set(tagsText.split(',').map(tag => tag.trim()).filter(Boolean))] } : form;
  const dirty = Boolean(selected && (newRecord || JSON.stringify(workingForm) !== JSON.stringify(selected.draft)));
  const publisher = member?.role === 'publisher';
  const publishIssues = selected ? publicationIssues(selected.type, workingForm, records, selected.id) : {};

  const changeGate = value => { gateRef.current = value; setGate(value); };
  const selectRecord = (record, nextSection = record?.type || section) => {
    setNewRecord(null); setSection(nextSection); setSelectedId(record?.id || null);
    setForm(clone(record?.draft || {})); setTagsText(record?.draft?.tags?.join(', ') || '');
    setErrors({}); setConflict(false); setSearch(''); setImagePreview(''); setInterpreterImagePreview(''); setImageError(''); setImageRefresh(previous => previous + 1);
  };
  const replaceRecords = (next, preferredId = selectedId) => {
    setRecords(next);
    selectRecord(next.find(record => record.id === preferredId) || next.find(record => record.type === section) || next[0]);
  };
  const clearPrivateState = () => {
    retainedUserRef.current = null; operationEpoch.current += 1;
    setRecords([]); selectRecord(null, 'page'); setSession(null); setMember(null);
    setPreview(null); setHistory(null); setPending(null); setMessage('');
  };
  const handleError = (error, action) => {
    if (isExpired(error)) {
      operationEpoch.current += 1; setSession(null); setMember(null); setPreview(null); setHistory(null); setPending(null);
      changeGate('signin'); setAuthMessage('Your session expired. Sign in again. Unsaved fields are held only in this tab; do not reload it.');
    } else if (isDenied(error)) {
      operationEpoch.current += 1; setMember(null); setPreview(null); setHistory(null); setPending(null);
      changeGate('denied'); setAuthMessage('This account does not have permission for that action. Ask the site owner to check your website editor role.');
    } else if (isConflict(error)) {
      setConflict(true); setMessage('Someone changed this content since you opened it. Your fields are unchanged. Copy any changes you need, then reload the saved version before editing again.');
    } else setMessage(`${action}: ${error?.message || 'The request failed. Please try again.'}`);
  };
  const run = async (label, action) => {
    if (busyRef.current || gateRef.current !== 'ready') return;
    busyRef.current = true; setBusy(label); setMessage('');
    const epoch = operationEpoch.current;
    const current = () => mounted.current && epoch === operationEpoch.current && gateRef.current === 'ready';
    try { await action(current); } catch (error) { if (current()) handleError(error, label); }
    finally { busyRef.current = false; if (mounted.current) setBusy(''); }
  };

  useEffect(() => {
    mounted.current = true;
    document.title = 'Content admin | Inclusive Quest';
    const meta = document.createElement('meta'); meta.name = 'robots'; meta.content = 'noindex, nofollow'; document.head.append(meta);
    const timers = new Set();
    const refresh = async () => {
      const check = ++sessionCheckRef.current;
      const current = () => mounted.current && check === sessionCheckRef.current;
      try {
        const nextSession = await repository.getSession();
        if (!current()) return;
        if (!nextSession) {
          if (gateRef.current === 'ready') setAuthMessage('Your session ended. Sign in again. Unsaved fields remain only in this tab.');
          operationEpoch.current += 1; setSession(null); setMember(null); setPreview(null); setHistory(null); setPending(null);
          changeGate('signin'); return;
        }
        setSession(nextSession);
        if (retainedUserRef.current === nextSession.user.id) {
          setMember({ role: nextSession.role });
          if (gateRef.current !== 'ready') setMessage('Signed in again. Your fields have been preserved. Saving still checks for changes made by another editor.');
          changeGate('ready'); setAuthMessage(''); return;
        }
        clearPrivateState(); setSession(nextSession); changeGate('loading');
        const workspace = await repository.loadWorkspace();
        if (!current()) return;
        if (!['editor', 'publisher'].includes(workspace.member?.role)) {
          const error = new Error('Website editor access is required.'); error.code = 'ACCESS_DENIED'; throw error;
        }
        validateDraftCollection(workspace.documents);
        retainedUserRef.current = nextSession.user.id;
        setMember(workspace.member); replaceRecords(workspace.documents, 'page-home');
        changeGate('ready'); setAuthMessage('');
      } catch (error) {
        if (!current()) return;
        setPreview(null); setHistory(null); setPending(null); setMember(null);
        if (isDenied(error)) { changeGate('denied'); setAuthMessage('This account has no website editor access. Supabase project membership alone does not grant access here. Ask the site owner to approve an editor or publisher role.'); }
        else if (isExpired(error)) { changeGate('signin'); setAuthMessage('Your sign-in has expired. Request a fresh sign-in link.'); }
        else { changeGate('error'); setAuthMessage(`Could not load the admin: ${error?.message || 'Check your connection and try again.'}`); }
      }
    };
    refreshRef.current = refresh;
    // Schedule outside the auth callback: calling Auth methods inside it can deadlock the SDK.
    const unsubscribe = repository.onAuthStateChange(() => {
      const timer = window.setTimeout(() => { timers.delete(timer); refresh(); }, 0); timers.add(timer);
    });
    refresh();
    return () => { mounted.current = false; sessionCheckRef.current += 1; operationEpoch.current += 1; unsubscribe?.(); timers.forEach(window.clearTimeout); meta.remove(); };
  }, [repository]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    let active = true;
    setImagePreview(''); setInterpreterImagePreview(''); setImageError('');
    if (gate !== 'ready' || (!form.imageSrc && !form.interpreterImageSrc) || !selected) return () => { active = false; };
    repository.previewDocuments([{ ...selected, draft: { ...selected.draft, imageSrc: form.imageSrc, interpreterImageSrc: form.interpreterImageSrc } }], 'draft')
      .then(documents => { if (active) { setImagePreview(documents[0]?.draft?.imageSrc || ''); setInterpreterImagePreview(documents[0]?.draft?.interpreterImageSrc || ''); } })
      .catch(error => { if (active) { if (isExpired(error) || isDenied(error)) handleError(error, 'Could not preview image'); else setImageError('Image preview is unavailable. Reload the content to retry after checking your connection.'); } });
    return () => { active = false; };
  }, [repository, gate, selectedId, form.imageSrc, form.interpreterImageSrc, imageRefresh]);

  const guard = action => {
    if (busyRef.current) return;
    if (dirty) setPending({ title: 'Discard unsaved field changes?', description: 'Your saved draft stays on the server. The unsaved changes currently in these fields will be discarded.', action });
    else action();
  };
  const requestSignIn = async event => {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true; setBusy('Sending sign-in link'); setAuthMessage('');
    try { await repository.requestSignIn(email.trim()); if (mounted.current) setAuthMessage('If this email is an approved account, a sign-in link is on its way. Open the link in this browser. Check spam if it does not arrive.'); }
    catch (error) { if (mounted.current) setAuthMessage(`Could not send a sign-in link: ${error?.message || 'Please try again.'}`); }
    finally { busyRef.current = false; if (mounted.current) setBusy(''); }
  };
  const signOut = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy('Signing out');
    try {
      await repository.signOut();
      if (!mounted.current) return;
      clearPrivateState(); changeGate('signin'); setAuthMessage('Signed out.');
    } catch (error) { if (mounted.current) { const text = `Could not sign out: ${error?.message || 'Please try again.'}`; setMessage(text); setAuthMessage(text); } }
    finally { busyRef.current = false; if (mounted.current) setBusy(''); }
  };
  const addRecord = () => guard(() => {
    const record = createDraft(section, `${section}-${crypto.randomUUID()}`, postTemplate);
    selectRecord(record); setNewRecord(record); setMessage('New draft. Complete the fields and save it before uploading images or publishing.');
  });
  const updateRecord = record => {
    setRecords(previous => previous.some(item => item.id === record.id) ? previous.map(item => item.id === record.id ? record : item) : [...previous, record]);
    selectRecord(record);
  };
  const saveDraft = event => {
    event.preventDefault();
    if (!selected || busyRef.current) return;
    const nextErrors = validateDocument(selected.type, workingForm); setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setMessage('Please fix the highlighted fields before saving.'); document.getElementById(`editor-${Object.keys(nextErrors)[0]}`)?.focus(); return; }
    const nextRecord = { ...selected, draft: clone(workingForm) };
    try { validateDraftCollection(newRecord ? [...records, nextRecord] : records.map(record => record.id === selected.id ? nextRecord : record)); }
    catch (error) { setMessage(error.message); return; }
    run('Could not save draft', async current => {
      const saved = await repository.saveDraft(nextRecord, selected.revision);
      if (current()) { updateRecord(saved); setMessage('Draft saved to the server. Published content has not changed.'); }
    });
  };
  const reload = () => guard(() => run('Could not reload content', async current => {
    const workspace = await repository.loadWorkspace(); validateDraftCollection(workspace.documents);
    if (current()) { setMember(workspace.member); replaceRecords(workspace.documents); setMessage('Latest saved content loaded.'); }
  }));
  const initialize = () => setPending({ title: 'Import the current website content?', description: `This copies the existing public website content into the CMS as its starting drafts and published versions for ${publishTarget}. It does not replace published content with an empty collection.`, action: () => run('Could not import initial content', async current => {
    const documents = await repository.initialize(); validateDraftCollection(documents);
    if (current()) { replaceRecords(documents, 'page-home'); setMessage('Current website content imported. You can now edit and save private drafts.'); }
  }) });
  const openPreview = mode => {
    if (dirty) { setMessage('Save your draft first so the preview includes your latest field changes.'); return; }
    run('Could not prepare preview', async current => {
      const documents = await repository.previewDocuments(mode === 'published' ? records.filter(record => record.published) : records, mode);
      const sponsor = selected?.type === 'sponsor' ? (mode === 'published' ? selected.published : selected.draft) : null;
      if (current()) setPreview({ mode, documents, initialPage: sponsor?.placement === 'episode' ? 'Watch' : 'Home', initialEpisodeId: sponsor?.targeting === 'episode' ? sponsor.episodeId : '' });
    });
  };
  const confirmPublication = mode => {
    if (!selected || !publisher || busyRef.current) return;
    if (dirty) { setMessage('Save your latest field changes before publishing or unpublishing.'); return; }
    if (mode === 'publish' && Object.keys(publishIssues).length) { setErrors(publishIssues); setMessage('Resolve the content checks before publishing.'); return; }
    setPending({ title: mode === 'publish' ? 'Publish this draft?' : 'Unpublish this content?',
      description: mode === 'publish' ? `“${documentTitle(selected)}” will replace its published version on ${publishTarget}. Only the saved draft will be published.${isPreviewDeployment ? ' Production is not connected for this review.' : ''}` : `“${documentTitle(selected)}” will be removed from the published collection for ${publishTarget}. Its saved draft and revisions will remain. Required page and founder content may return to the site’s default text.`,
      action: () => run(mode === 'publish' ? 'Could not publish' : 'Could not unpublish', async current => {
        const record = await repository[mode](selected.id, selected.revision);
        if (current()) { updateRecord(record); setMessage(mode === 'publish' ? `Published successfully. The saved version is now available to ${publishTarget}.` : 'Unpublished successfully. The saved draft remains private.'); }
      }) });
  };
  const uploadImage = (event, sourceField = 'imageSrc', altField = 'imageAlt') => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || !selected) return;
    if (!form[altField]?.trim()) { setErrors(previous => ({ ...previous, [altField]: 'Add alternative text before uploading.' })); setMessage('Describe the image in Alternative text before uploading.'); return; }
    if (form[altField].length > 500) { setMessage('Alternative text must be 500 characters or fewer.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_IMAGE_BYTES || !file.size) { setMessage('Choose a JPEG, PNG or WebP image up to 4 MB. SVG and empty files are not accepted.'); return; }
    run('Could not upload image', async current => {
      const result = await repository.uploadImage(file, { documentId: selected.id, alt: form[altField].trim() });
      if (current()) { setForm(previous => ({ ...previous, [sourceField]: result.imageSrc, [altField]: previous[altField].trim() })); (sourceField === 'imageSrc' ? setImagePreview : setInterpreterImagePreview)(result.previewUrl || ''); setErrors(previous => ({ ...previous, [sourceField]: undefined, [altField]: undefined })); setMessage('Image uploaded privately. Save the draft to attach it. It will be public only when its content is published.'); }
    });
  };
  const openHistory = () => run('Could not load revisions', async current => {
    const revisions = await repository.listRevisions(selected.id);
    if (current()) setHistory({ title: documentTitle(selected), documentId: selected.id, revisions });
  });
  const restoreRevision = revision => {
    setHistory(null);
    setPending({ title: 'Restore this revision to a draft?', description: 'This creates a new saved draft from the selected revision. Current unsaved fields will be discarded. The published version will not change.', action: () => run('Could not restore revision', async current => {
      const record = await repository.restoreRevision(selected.id, revision.id, selected.revision);
      if (current()) { updateRecord(record); setMessage('Revision restored as a new saved draft. Nothing was published.'); }
    }) });
  };
  const resetToPublished = () => setPending({ title: 'Copy published content into the fields?', description: 'This replaces your unsaved fields with the published version. Save the draft afterward to keep the reset. Nothing will be published.', action: () => {
    setForm(clone(selected.published)); setTagsText(selected.published.tags?.join(', ') || ''); setErrors({}); setMessage('Published content copied into the fields. Save the draft to keep this change.');
  } });

  if (gate !== 'ready') return <main className="admin-root admin-gate">
    <a className="admin-back" href="/">← Back to Inclusive Quest</a>
    <section className="admin-gate-card">
      <img src="/inclusive-quest-logo.png" alt="Inclusive Quest" width="88" height="88" />
      <p className="admin-kicker">Content admin</p><div className="admin-notice admin-environment-notice"><strong>{environmentTitle}</strong><p>{environmentDescription}</p></div><h1>{gate === 'denied' ? 'Editor access required' : 'Your stories. More access.'}</h1>
      {(gate === 'checking' || gate === 'loading') ? <p role="status">{gate === 'checking' ? 'Checking your sign-in…' : 'Loading your saved content…'}</p> : <>
        <p>Approved editors can save drafts and upload images. Publishers can also make content live.</p>
        {authMessage && <p className="admin-notice" role="status">{authMessage}</p>}
        {gate === 'signin' && <form className="admin-signin" onSubmit={requestSignIn}>
          <label htmlFor="admin-email">Email address</label><input id="admin-email" type="email" autoComplete="email" required value={email} disabled={Boolean(busy)} onChange={event => setEmail(event.target.value)} />
          <button className="admin-primary" disabled={Boolean(busy)}>{busy || 'Email me a sign-in link'}</button>
          <p className="admin-muted">Use the email approved by the site owner. This form does not create an editor account.</p>
        </form>}
        {gate === 'error' && <button onClick={() => refreshRef.current?.()} disabled={Boolean(busy)}>Retry loading admin</button>}
        {(gate === 'denied' || gate === 'error') && <button onClick={signOut} disabled={Boolean(busy)}>{busy || 'Sign out'}</button>}
      </>}
    </section>
  </main>;

  const visible = allRecords.filter(record => record.type === section && documentTitle(record).toLowerCase().includes(search.trim().toLowerCase()));
  const categories = [...new Set(records.filter(record => record.type === 'category').map(record => record.draft.name).filter(Boolean))];
  return <div className="admin-root">
    <a href="#admin-editor" className="admin-skip">Skip to editor</a>
    <div className="admin-review-banner" aria-label="Publishing environment"><strong>{environmentTitle}</strong><span>{environmentDescription}</span></div>
    <header className="admin-header">
      <a href="/" className="admin-brand"><img src="/inclusive-quest-logo.png" alt="" /><span>Inclusive Quest<small>Content admin</small></span></a>
      <div className="admin-header-actions"><span className="admin-account">{session?.user?.email}<small>{publisher ? 'Publisher' : 'Editor'}</small></span><button disabled={Boolean(busy)} onClick={reload}>Reload content</button><button className="admin-primary" disabled={Boolean(busy)} onClick={() => openPreview('draft')}>Preview website</button><button disabled={Boolean(busy)} onClick={() => guard(signOut)}>Sign out</button></div>
    </header>
    <div className="admin-layout">
      <aside className="admin-sidebar"><p className="admin-kicker">Workspace</p><nav aria-label="Content sections">
        {CONTENT_TYPES.map(type => <button key={type} disabled={Boolean(busy)} className={section === type ? 'active' : ''} aria-current={section === type ? 'page' : undefined} onClick={() => guard(() => selectRecord(records.find(record => record.type === type), type))}><span>{TYPE_LABELS[type]}</span><span>{allRecords.filter(record => record.type === type).length}</span></button>)}
      </nav><div className="admin-connection"><strong>{publisher ? 'Publisher access' : 'Editor access'}</strong><p>{publisher ? `You can save drafts and publish approved content to ${publishTarget}.` : 'You can save drafts. A publisher must approve content before it goes live.'}</p></div></aside>
      <main className="admin-main" id="admin-editor" aria-busy={Boolean(busy)}>
        <div className="admin-section-heading"><div><p className="admin-kicker">Make every story accessible</p><h1>{TYPE_LABELS[section]}</h1></div>
          {records.length > 0 && section !== 'founder' && section !== 'page' && <div className="admin-create-actions">{section === 'post' && <label>New post template<select disabled={Boolean(busy)} value={postTemplate} onChange={event => setPostTemplate(event.target.value)}>{Object.entries(POST_TEMPLATES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>}<button className="admin-primary" disabled={Boolean(busy)} onClick={addRecord}>+ Add {section === 'episode' ? 'episode' : section}</button></div>}
        </div>
        <p className="admin-section-description">Edit your content, save a private draft, and preview it before publishing.</p>
        <div className={'admin-message' + (message || busy ? ' visible' : '')} role="status" aria-live="polite">{busy ? 'Working… Please wait before making more changes.' : message}</div>
        {!records.length && <div className="admin-notice admin-initialize"><strong>Set up the starting content</strong><p>{publisher ? 'Import the current public website content before making your first edits. This preserves the existing pages and collections as the CMS starting point.' : 'Initial content setup requires a publisher.'}</p>{publisher && <button type="button" className="admin-primary" disabled={Boolean(busy) || Boolean(newRecord)} onClick={initialize}>Import current website content</button>}</div>}
        {conflict && <div className="admin-conflict"><strong>A newer saved version exists.</strong><p>Your unsaved fields have not been replaced. Reloading requires you to confirm discarding them.</p><button disabled={Boolean(busy)} onClick={reload}>Reload latest saved version</button></div>}
        <div className="admin-editor-grid">
          <section className="admin-records" aria-label={`${TYPE_LABELS[section]} list`}><label htmlFor="admin-search">Find content</label><input id="admin-search" type="search" placeholder="Search this section" value={search} disabled={Boolean(busy)} onChange={event => setSearch(event.target.value)} />
            {visible.length ? <ul>{visible.map(record => <li key={record.id}><button disabled={Boolean(busy)} aria-pressed={selectedId === record.id} onClick={() => { if (record.id !== selectedId) guard(() => selectRecord(record)); }}><strong>{documentTitle(record)}</strong><span>{statusLabel(record)}</span></button></li>)}</ul> : <p className="admin-empty">{search ? 'No matching content.' : 'No content here yet.'}</p>}
          </section>
          {selected ? <section className="admin-edit-panel" aria-labelledby="edit-title">
            <div className="admin-edit-title"><div><span className="admin-status">{dirty ? 'Unsaved field changes' : statusLabel(selected)}</span><h2 id="edit-title">{documentTitle(selected)}</h2></div><small>{newRecord ? 'Not saved yet' : `Revision ${selected.revision}`}</small></div>
            <form onSubmit={saveDraft} noValidate><fieldset className="admin-form-fields" disabled={Boolean(busy)}>
              {selected.type === 'post' && <p className="admin-template-label">Template: {POST_TEMPLATES[form.template]?.label}</p>}
              {selected.type === 'sponsor' && <SponsorControls form={form} onChange={value => { setForm(value); setErrors({}); }} errors={errors} episodes={records.filter(record => record.type === 'episode')} />}
              {FIELD_SETS[selected.type].map(([name, label, type]) => <Field key={name} name={name} label={label} type={type} value={type === 'tags' ? tagsText : form[name]} onChange={value => { if (type === 'tags') setTagsText(value); else setForm(previous => ({ ...previous, [name]: value })); setErrors(previous => ({ ...previous, [name]: undefined })); }} error={errors[name]} categories={categories} fixedSlug={selected.type === 'page' && name === 'slug'} connected />)}
              {['page', 'post', 'founder', 'episode', 'sponsor'].includes(selected.type) && <fieldset className="admin-image-fields"><legend>Image & accessibility</legend>
                {[['imageSrc', 'Stored image reference'], ['imageAlt', 'Alternative text']].map(([name, label]) => <Field key={name} name={name} label={label} value={form[name]} onChange={value => { setForm(previous => ({ ...previous, [name]: value })); setErrors(previous => ({ ...previous, [name]: undefined })); }} error={errors[name]} connected />)}
                <button type="button" disabled={Boolean(newRecord)} onClick={() => fileRef.current.click()} aria-describedby="upload-note">Upload image</button>{form.imageSrc && <button className="admin-remove-image" type="button" onClick={() => { setForm(previous => ({ ...previous, imageSrc: '', imageAlt: '' })); setMessage('Image removed from the fields. Save the draft to keep this change.'); }}>Remove image from draft</button>}<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={uploadImage} />
                <small id="upload-note">{newRecord ? 'Save this new draft before uploading its image.' : 'JPEG, PNG or WebP, up to 4 MB. Add alternative text first. Draft uploads are private.'}</small>
                {imagePreview && <figure className="admin-image-preview"><img src={imagePreview} alt={form.imageAlt || 'Draft image preview'} onError={() => { setImagePreview(''); setImageError('Image preview could not load. The image may have expired or the file may be unavailable.'); }} /><figcaption>Draft image preview</figcaption></figure>}{imageError && <p className="admin-muted">{imageError}</p>}
              </fieldset>}
              {selected.type === 'page' && selected.id === 'page-home' && <fieldset className="admin-image-fields"><legend>Homepage interpreter panel</legend>
                <p className="admin-muted">This image is separate from the site logo. Leave the title and subtitle blank until approved details are ready.</p>
                {[['interpreterTitle', 'Interpreter title (optional)'], ['interpreterSubtitle', 'Interpreter subtitle (optional)'], ['interpreterImageSrc', 'Stored interpreter image reference'], ['interpreterImageAlt', 'Interpreter image alternative text']].map(([name, label]) => <Field key={name} name={name} label={label} value={form[name]} onChange={value => { setForm(previous => ({ ...previous, [name]: value })); setErrors(previous => ({ ...previous, [name]: undefined })); }} error={errors[name]} connected />)}
                <button type="button" disabled={Boolean(newRecord)} onClick={() => interpreterFileRef.current.click()} aria-describedby="interpreter-upload-note">Upload interpreter image</button>
                {form.interpreterImageSrc && <button type="button" onClick={() => setForm(previous => ({ ...previous, interpreterImageSrc: '', interpreterImageAlt: '' }))}>Remove interpreter image from draft</button>}
                <input ref={interpreterFileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => uploadImage(event, 'interpreterImageSrc', 'interpreterImageAlt')} />
                <small id="interpreter-upload-note">JPEG, PNG or WebP, up to 4 MB. Add interpreter image alternative text first. Uploads remain private until published.</small>
                {interpreterImagePreview && <figure className="admin-image-preview"><img src={interpreterImagePreview} alt={form.interpreterImageAlt || 'Draft interpreter image preview'} onError={() => { setInterpreterImagePreview(''); setImageError('Interpreter image preview could not load.'); }} /><figcaption>Draft interpreter image preview</figcaption></figure>}
              </fieldset>}
              {selected.type === 'episode' && form.comingSoon === true && ['youtubeUrl', 'mainVideoSrc', 'aslVideoSrc', 'captionsSrc'].some(field => form[field]) && <div className="admin-notice"><p>Remove all media links before publishing this coming-soon episode. This does not delete uploaded files or change the published version.</p><button type="button" onClick={() => { setForm(previous => ({ ...previous, youtubeUrl: '', mainVideoSrc: '', aslVideoSrc: '', captionsSrc: '' })); setErrors({}); setMessage('Media links removed from the fields. Save the draft to keep this change. Nothing was published.'); }}>Remove media links from draft</button></div>}
              {selected.type === 'episode' && parseYouTubeUrl(form.youtubeUrl) && <div className="admin-video-check"><strong>Valid YouTube link format</strong><p>Video ID: {parseYouTubeUrl(form.youtubeUrl).videoId}</p><p className="admin-muted">Check video availability, permissions, captions and Sign Language interpretation in the website preview.</p></div>}
              <div className="admin-editor-actions"><button className="admin-primary" type="submit" disabled={!dirty || conflict}>Save draft</button><button type="button" onClick={() => openPreview('draft')}>Preview draft</button><button type="button" onClick={() => openPreview('published')}>View published website</button>{!newRecord && <button type="button" onClick={openHistory}>Revision history</button>}</div>
              <div className="admin-publish-block"><div><strong>{isPreviewDeployment ? 'Publish to preview site' : isProductionDeployment ? 'Publish to website' : 'Publish to connected CMS'}</strong><p>{publisher ? 'Only a saved, valid draft can be published. Publishing requires confirmation.' : 'Your editor role can save drafts. A publisher must make content live.'}</p>{Object.keys(publishIssues).length > 0 && <p className="admin-muted">Content checks: {Object.values(publishIssues).join(' ')}</p>}</div><div className="admin-publication-actions"><button disabled={!publisher || dirty || conflict || Object.keys(publishIssues).length > 0} type="button" onClick={() => confirmPublication('publish')}>Publish</button>{selected.published && <button disabled={!publisher || dirty || conflict} type="button" onClick={() => confirmPublication('unpublish')}>Unpublish</button>}</div></div>
              {selected.published && <button className="admin-danger" type="button" onClick={resetToPublished}>Reset fields to published version</button>}
              {newRecord && <button className="admin-danger" type="button" onClick={() => guard(() => selectRecord(records.find(record => record.type === section), section))}>Discard new draft</button>}
            </fieldset></form>
          </section> : <section className="admin-edit-panel admin-empty"><h2>{['page', 'founder'].includes(section) ? 'No saved content in this section' : 'Start a new draft'}</h2><p>{['page', 'founder'].includes(section) ? 'The site owner must finish importing the initial site content before editing this section.' : 'Add content to see its editing fields here.'}</p></section>}
        </div>
      </main>
    </div>
    {pending && <Dialog title={pending.title} onClose={() => setPending(null)}><p>{pending.description}</p><div className="admin-dialog-actions"><button onClick={() => setPending(null)}>Keep editing</button><button className="admin-primary" onClick={() => { const action = pending.action; setPending(null); action(); }}>Continue</button></div></Dialog>}
    {preview && <Dialog title={preview.mode === 'draft' ? 'Draft website preview' : 'Published website preview'} wide onClose={() => setPreview(null)}><p className="admin-preview-note">{preview.mode === 'draft' ? 'Private draft preview. Nothing is published by viewing this screen. Image preview links expire; close and reopen to refresh them.' : `Published content snapshot for ${publishTarget}. Unsaved and draft-only changes are excluded.`}</p><div className="admin-site-preview"><ContentProvider previewDocuments={preview.documents}><App previewMode initialPage={preview.initialPage} initialEpisodeId={preview.initialEpisodeId} /></ContentProvider></div></Dialog>}
    {history && <Dialog title="Revision history" onClose={() => setHistory(null)}><p>{history.title}. Restoring creates a saved draft and leaves the live version unchanged.</p>{history.revisions.length ? <ol className="admin-revision-list">{history.revisions.map(revision => <li key={revision.id}><div><strong>{revision.action || 'Saved revision'}</strong><span>{revision.createdAt ? new Date(revision.createdAt).toLocaleString() : 'Date unavailable'}</span></div><button onClick={() => restoreRevision(revision)}>Restore as draft</button></li>)}</ol> : <p>No saved revisions yet.</p>}</Dialog>}
  </div>;
}

