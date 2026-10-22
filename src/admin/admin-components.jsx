import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export const FIELD_SETS = {
  page: [['title', 'Page name'], ['slug', 'Page slug'], ['heading', 'Page heading'], ['subtitle', 'Subtitle'], ['body', 'Page text', 'textarea']],
  post: [['title', 'Post title'], ['slug', 'Post slug'], ['excerpt', 'Summary', 'textarea'], ['body', 'Post text', 'textarea']],
  founder: [['name', 'Name'], ['title', 'Role'], ['homeQuote', 'Homepage quote', 'textarea'], ['bio', 'Biography', 'textarea'], ['story', 'Founder story', 'textarea']],
  testimonial: [['name', 'Name'], ['title', 'Attribution / role'], ['quote', 'Quote', 'textarea']],
  episode: [['title', 'Show title'], ['episodeTitle', 'Episode title'], ['description', 'Description', 'textarea'], ['youtubeUrl', 'YouTube video URL', 'url'], ['category', 'Category'], ['tags', 'Tags (comma-separated)', 'tags']],
  category: [['name', 'Category name'], ['slug', 'Category slug'], ['description', 'Description', 'textarea']]
};

export function Dialog({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className={'admin-dialog' + (wide ? ' admin-dialog-wide' : '')}
    aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="admin-dialog-heading"><h2>{title}</h2><button type="button" onClick={onClose} aria-label={`Close ${title}`}>Close ×</button></div>
    {children}
  </dialog>, document.body);
}

export function Field({ name, label, type, value, onChange, error, categories = [], fixedSlug, connected = false }) {
  const id = `editor-${name}`;
  const help = name === 'body' || name === 'bio' || name === 'story' ? 'Separate paragraphs with a blank line. Plain text only.'
    : name === 'youtubeUrl' ? 'Paste a full HTTPS YouTube video link. Playlist-only links and embed code are not accepted.'
    : name === 'imageSrc' ? (connected ? 'This reference is managed automatically. Upload an image below to replace it. Uploaded images stay private until published.' : 'Use an existing approved HTTPS image URL or site asset path. Secure uploads are not connected yet.')
    : name === 'imageAlt' ? 'Describe what the image communicates. Required when an image is provided.'
    : fixedSlug ? 'This existing page address is fixed in the site navigation.' : '';
  const common = { id, name, value: value ?? '', onChange: event => onChange(event.target.value), 'aria-invalid': Boolean(error), 'aria-describedby': [error && `${id}-error`, help && `${id}-help`].filter(Boolean).join(' ') || undefined };
  return <div className="admin-field">
    <label htmlFor={id}>{label}</label>
    {type === 'textarea' ? <textarea {...common} rows={name === 'body' || name === 'bio' || name === 'story' ? 8 : 4} />
      : <input {...common} type={type === 'url' ? 'url' : 'text'} list={name === 'category' ? 'admin-categories' : undefined} readOnly={fixedSlug || (connected && name === 'imageSrc')} />}
    {name === 'category' && <datalist id="admin-categories">{categories.map(category => <option key={category} value={category} />)}</datalist>}
    {help && <small id={`${id}-help`}>{help}</small>}
    {error && <p className="admin-field-error" id={`${id}-error`}>{error}</p>}
  </div>;
}

