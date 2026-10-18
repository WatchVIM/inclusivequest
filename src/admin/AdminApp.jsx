import React, { useEffect, useRef, useState } from 'react';
import App from '../App.jsx';
import { ContentProvider } from '../cms/ContentProvider.jsx';
import { adminRepository } from '../cms/admin-repository.js';
import {
  CONTENT_TYPES, TYPE_LABELS, POST_TEMPLATES, createSeedDocuments, createDraft,
  documentTitle, documentStatus, hasDraftChanges, validateDocument, validateDraftCollection,
  publicationIssues, parseYouTubeUrl, exportDrafts, importDrafts
} from '../cms/content-model.js';
import './admin.css';

const FIELD_SETS = {
  page: [['title', 'Page name'], ['slug', 'Page slug'], ['heading', 'Page heading'], ['subtitle', 'Subtitle'], ['body', 'Page text', 'textarea']],
  post: [['title', 'Post title'], ['slug', 'Post slug'], ['excerpt', 'Summary', 'textarea'], ['body', 'Post text', 'textarea']],
  founder: [['name', 'Name'], ['title', 'Role'], ['homeQuote', 'Homepage quote', 'textarea'], ['bio', 'Biography', 'textarea'], ['story', 'Founder story', 'textarea']],
  testimonial: [['name', 'Name'], ['title', 'Attribution / role'], ['quote', 'Quote', 'textarea']],
  episode: [['title', 'Show title'], ['episodeTitle', 'Episode title'], ['description', 'Description', 'textarea'], ['youtubeUrl', 'YouTube video URL', 'url'], ['category', 'Category'], ['tags', 'Tags (comma-separated)', 'tags']],
  category: [['name', 'Category name'], ['slug', 'Category slug'], ['description', 'Description', 'textarea']]
};
const clone = value => JSON.parse(JSON.stringify(value));

function Dialog({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={'admin-dialog' + (wide ? ' admin-dialog-wide' : '')}
    aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="admin-dialog-heading"><h2>{title}</h2><button type="button" onClick={onClose} aria-label={`Close ${title}`}>Close ×</button></div>
    {children}
  </dialog>;
}

function Field({ name, label, type, value, onChange, error, categories, fixedSlug }) {
  const id = `editor-${name}`;
  const help = name === 'body' || name === 'bio' || name === 'story' ? 'Separate paragraphs with a blank line. Plain text only.'
    : name === 'youtubeUrl' ? 'Paste a full HTTPS YouTube video link. Playlist-only links and embed code are not accepted.'
    : name === 'imageSrc' ? 'Use an existing approved HTTPS image URL or site asset path. Secure uploads are not connected yet.'
    : name === 'imageAlt' ? 'Describe what the image communicates. Required when an image is provided.'
    : fixedSlug ? 'This existing page address is fixed in the site navigation.' : '';
  const common = { id, name, value: value ?? '', onChange: event => onChange(event.target.value), 'aria-invalid': Boolean(error), 'aria-describedby': [error && `${id}-error`, help && `${id}-help`].filter(Boolean).join(' ') || undefined };
  return <div className="admin-field">
    <label htmlFor={id}>{label}</label>
    {type === 'textarea' ? <textarea {...common} rows={name === 'body' || name === 'bio' || name === 'story' ? 8 : 4} />
      : <input {...common} type={type === 'url' ? 'url' : 'text'} list={name === 'category' ? 'admin-categories' : undefined} readOnly={fixedSlug} />}
    {name === 'category' && <datalist id="admin-categories">{categories.map(category => <option key={category} value={category} />)}</datalist>}
    {help && <small id={`${id}-help`}>{help}</small>}
    {error && <p className="admin-field-error" id={`${id}-error`}>{error}</p>}
  </div>;
}

export default function AdminApp() {
  const [entered, setEntered] = useState(false);
  const [records, setRecords] = useState(createSeedDocuments);
  const [section, setSection] = useState('page');
  const [selectedId, setSelectedId] = useState('page-home');
  const [form, setForm] = useState(() => clone(createSeedDocuments()[0].draft));
  const [tagsText, setTagsText] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  const [pending, setPending] = useState(null);
  const [postTemplate, setPostTemplate] = useState('story');
  const importRef = useRef(null);
  const messageRef = useRef(null);
  const selected = records.find(record => record.id === selectedId);
  const workingForm = selected?.type === 'episode' ? { ...form, tags: [...new Set(tagsText.split(',').map(tag => tag.trim()).filter(Boolean))] } : form;
  const dirty = Boolean(selected && JSON.stringify(workingForm) !== JSON.stringify(selected.draft));
  const hasChanges = dirty || records.some(hasDraftChanges);
  const allowReview = typeof __ADMIN_PREVIEW_ENABLED__ !== 'undefined' && __ADMIN_PREVIEW_ENABLED__;
  const publishIssues = selected ? publicationIssues(selected.type, workingForm) : {};

  useEffect(() => {
    document.title = 'Content admin | Inclusive Quest';
    const meta = document.createElement('meta'); meta.name = 'robots'; meta.content = 'noindex, nofollow'; document.head.append(meta);
    return () => meta.remove();
  }, []);
  useEffect(() => {
    if (!hasChanges) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasChanges]);

  const announce = text => { setMessage(text); };
  const selectRecord = (record, nextSection = record?.type || section) => {
    setSection(nextSection); setSelectedId(record?.id || null); setForm(clone(record?.draft || {}));
    setTagsText(record?.draft.tags?.join(', ') || ''); setErrors({}); setSearch('');
  };
  const guard = action => { if (dirty) setPending({ action, title: 'Discard unsaved field changes?', description: 'Your last kept draft will remain in this tab. The changes currently in the fields will be discarded.' }); else action(); };
  const changeSection = type => guard(() => selectRecord(records.find(record => record.type === type), type));
  const addRecord = () => guard(() => {
    const record = createDraft(section, `${section}-${crypto.randomUUID()}`, postTemplate);
    setRecords(previous => [...previous, record]); selectRecord(record); announce('New draft. Complete the fields and keep it in this tab.');
  });
  const saveDraft = event => {
    event?.preventDefault();
    if (!selected) return;
    const nextErrors = validateDocument(selected.type, workingForm);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { announce('Please fix the highlighted fields before keeping this draft.'); setTimeout(() => document.getElementById(`editor-${Object.keys(nextErrors)[0]}`)?.focus(), 0); return; }
    const next = records.map(record => record.id === selected.id ? { ...record, draft: clone(workingForm), revision: record.revision + 1 } : record);
    try { validateDraftCollection(next); } catch (error) { announce(error.message); return; }
    setRecords(next); setForm(clone(workingForm));
    announce('Draft kept in this tab only. Download a draft file to keep a copy. Nothing was published.');
  };
  const openPreview = mode => {
    if (dirty) { announce('Keep the draft first so the website preview includes your latest field changes.'); return; }
    try { validateDraftCollection(records); } catch (error) { announce(error.message); return; }
    setPreview(mode);
  };
  const downloadDraft = () => {
    if (dirty) { announce('Keep your latest field changes before downloading the draft file.'); return; }
    try {
      const blob = new Blob([exportDrafts(records)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'inclusive-quest-draft-review.json'; document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      announce('Draft file downloaded. It contains your review copy, not a backup from a live CMS.');
    } catch (error) { announce(error.message); }
  };
  const readDraft = async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) { announce('Choose a draft review JSON file smaller than 1 MB.'); return; }
    try {
      const next = importDrafts(await file.text(), records);
      setPending({ title: 'Import draft review?', description: 'Matching drafts in this tab will be replaced. Published references and the live website will not change.', action: () => { setRecords(next); selectRecord(next.find(record => record.id === selectedId) || next[0]); announce('Draft review imported into this tab. Nothing was published.'); } });
    } catch (error) { announce(`Could not import: ${error.message}`); }
  };
  const discard = () => setPending({ title: selected.published ? 'Reset this draft?' : 'Remove this draft?', description: selected.published ? 'This resets the draft to its original published reference. Download a copy first if you need the changes.' : 'This removes the new draft from this tab. The live website is unaffected.', action: () => {
    const next = selected.published ? records.map(record => record.id === selected.id ? { ...record, draft: clone(record.published), revision: record.revision + 1 } : record) : records.filter(record => record.id !== selected.id);
    setRecords(next); selectRecord(next.find(record => record.id === selected.id) || next.find(record => record.type === section), section); announce('Draft reset. Nothing was published.');
  } });

  if (!entered) return <main className="admin-root admin-gate">
    <a className="admin-back" href="/">← Back to Inclusive Quest</a>
    <section className="admin-gate-card">
      <img src="/inclusive-quest-logo.png" alt="Inclusive Quest" width="88" height="88" />
      <p className="admin-kicker">Content admin</p><h1>Your stories. More access.</h1>
      <p>Manage the words, images and videos that bring Inclusive Quest to life.</p>
      <div className="admin-notice"><strong>Secure publishing is not connected yet.</strong><p>A client-owned backend and authorized editor accounts must be set up before sign-in, uploads, saved content or publishing can work.</p></div>
      {allowReview ? <><button className="admin-primary" onClick={() => setEntered(true)}>Open review workspace</button><p className="admin-muted">Preview only. This uses existing public content and in-memory drafts. Do not enter private information. Reloading clears changes unless you download a draft file.</p></>
        : <p>Review editing is available only in local development and the separate preview deployment. Production editing stays locked until secure setup is complete.</p>}
      <p className="admin-muted">No login credentials are collected here.</p>
    </section>
  </main>;

  const visible = records.filter(record => record.type === section && documentTitle(record).toLowerCase().includes(search.trim().toLowerCase()));
  const categories = [...new Set(records.filter(record => record.type === 'category').map(record => record.draft.name).filter(Boolean))];
  return <div className="admin-root">
    <a href="#admin-editor" className="admin-skip">Skip to editor</a>
    <div className="admin-review-banner"><strong>Review workspace</strong><span>Changes stay in this tab. No sign-in, server storage or live publishing.</span></div>
    <header className="admin-header">
      <a href="/" className="admin-brand"><img src="/inclusive-quest-logo.png" alt="" /><span>Inclusive Quest<small>Content admin</small></span></a>
      <div className="admin-header-actions"><button onClick={() => guard(() => importRef.current.click())}>Import draft file</button><button onClick={downloadDraft}>Download drafts</button><button className="admin-primary" onClick={() => openPreview('draft')}>Preview website</button></div>
      <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={readDraft} />
    </header>
    <div className="admin-layout">
      <aside className="admin-sidebar"><p className="admin-kicker">Workspace</p><nav aria-label="Content sections">
        {CONTENT_TYPES.map(type => <button key={type} className={section === type ? 'active' : ''} aria-current={section === type ? 'page' : undefined} onClick={() => changeSection(type)}><span>{TYPE_LABELS[type]}</span><span>{records.filter(record => record.type === type).length}</span></button>)}
      </nav><div className="admin-connection"><span className="admin-lock" aria-hidden="true">○</span><strong>Publishing locked</strong><p>Client-owned Supabase setup and editor permissions are still required.</p></div></aside>
      <main className="admin-main" id="admin-editor">
        <div className="admin-section-heading"><div><p className="admin-kicker">Make every story accessible</p><h1>{TYPE_LABELS[section]}</h1></div>
          {section !== 'founder' && section !== 'page' && <div className="admin-create-actions">{section === 'post' && <label>New post template<select value={postTemplate} onChange={event => setPostTemplate(event.target.value)}>{Object.entries(POST_TEMPLATES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>}<button className="admin-primary" onClick={addRecord}>+ Add {section === 'episode' ? 'episode' : section}</button></div>}
        </div>
        <p className="admin-section-description">{section === 'page' ? 'Edit the existing homepage, About, Mission, Vision and Values. Other page sections are outside this first editing pass.' : section === 'episode' ? 'Add titles, descriptions and YouTube links for the website’s Watch, Podcasts and Explore sections. Categories and tags help people find a conversation.' : section === 'post' ? 'Start with a template, add your story, then review it on the website.' : 'Keep the draft, review the website, and download a copy of your changes.'}</p>
        <div ref={messageRef} className={'admin-message' + (message ? ' visible' : '')} role="status" aria-live="polite">{message}</div>
        <div className="admin-editor-grid">
          <section className="admin-records" aria-label={`${TYPE_LABELS[section]} list`}><label htmlFor="admin-search">Find content</label><input id="admin-search" type="search" placeholder="Search this section" value={search} onChange={event => setSearch(event.target.value)} />
            {visible.length ? <ul>{visible.map(record => <li key={record.id}><button aria-pressed={selectedId === record.id} onClick={() => guard(() => selectRecord(record))}><strong>{documentTitle(record)}</strong><span>{documentStatus(record)}</span></button></li>)}</ul> : <p className="admin-empty">{search ? 'No matching content.' : 'No content here yet. Add your first draft.'}</p>}
          </section>
          {selected ? <section className="admin-edit-panel" aria-labelledby="edit-title">
            <div className="admin-edit-title"><div><span className="admin-status">{dirty ? 'Unsaved field changes' : documentStatus(selected)}</span><h2 id="edit-title">{documentTitle(selected)}</h2></div><small>Local draft {selected.revision}</small></div>
            <form onSubmit={saveDraft} noValidate>
              {selected.type === 'post' && <p className="admin-template-label">Template: {POST_TEMPLATES[form.template]?.label}</p>}
              {FIELD_SETS[selected.type].map(([name, label, type]) => <Field key={name} name={name} label={label} type={type} value={type === 'tags' ? tagsText : form[name]} onChange={value => { if (type === 'tags') setTagsText(value); else setForm(previous => ({ ...previous, [name]: value })); setErrors(previous => ({...previous, [name]: undefined})); }} error={errors[name]} categories={categories} fixedSlug={selected.type === 'page' && name === 'slug'} />)}
              {['page', 'post', 'founder', 'episode'].includes(selected.type) && <fieldset className="admin-image-fields"><legend>Image & accessibility</legend>{[['imageSrc', 'Image URL / asset path'], ['imageAlt', 'Alternative text']].map(([name, label]) => <Field key={name} name={name} label={label} value={form[name]} onChange={value => setForm(previous => ({...previous, [name]: value}))} error={errors[name]} />)}
                <button type="button" disabled aria-describedby="upload-note">Upload image (not connected)</button><small id="upload-note">Secure image storage will be enabled with the client-owned backend.</small>
              </fieldset>}
              {selected.type === 'episode' && parseYouTubeUrl(form.youtubeUrl) && <div className="admin-video-check"><strong>Valid YouTube link format</strong><p>Video ID: {parseYouTubeUrl(form.youtubeUrl).videoId}</p><p className="admin-muted">Format validation does not verify video availability, permissions, captions or Sign Language interpretation. Check those in the website preview.</p></div>}
              <div className="admin-editor-actions"><button className="admin-primary" type="submit">Keep draft in this tab</button><button type="button" onClick={() => openPreview('draft')}>Preview draft</button><button type="button" onClick={() => openPreview('published')}>View published reference</button></div>
              <div className="admin-publish-block"><div><strong>Publish to website</strong><p>Requires secure sign-in, approved publishing permissions and server storage.</p>{Object.keys(publishIssues).length > 0 && <p className="admin-muted">Content checks: {Object.values(publishIssues).join(' ')}</p>}</div><button disabled={!adminRepository.capabilities.publish} type="button">Publish (not connected)</button></div>
              <button className="admin-danger" type="button" onClick={discard}>{selected.published ? 'Reset draft to published reference' : 'Remove draft from this tab'}</button>
            </form>
          </section> : <section className="admin-edit-panel admin-empty"><h2>Start a new draft</h2><p>Add content to see its editing fields here.</p></section>}
        </div>
      </main>
    </div>
    {pending && <Dialog title={pending.title} onClose={() => setPending(null)}><p>{pending.description}</p><div className="admin-dialog-actions"><button onClick={() => setPending(null)}>Keep editing</button><button className="admin-primary" onClick={() => { const action = pending.action; setPending(null); action(); }}>Continue</button></div></Dialog>}
    {preview && <Dialog title={preview === 'draft' ? 'Draft website preview' : 'Published reference preview'} wide onClose={() => setPreview(null)}><p className="admin-preview-note">{preview === 'draft' ? 'Draft preview only. This does not change the live website.' : 'Original public content snapshot. Live CMS publishing is not connected.'}</p><div className="admin-site-preview"><ContentProvider previewDocuments={preview === 'draft' ? records : records.filter(record => record.published).map(record => ({...record, draft: record.published}))}><App previewMode /></ContentProvider></div></Dialog>}
  </div>;
}
