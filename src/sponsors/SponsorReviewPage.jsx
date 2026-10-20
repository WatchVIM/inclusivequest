import React, { useEffect, useRef, useState } from 'react';
import App from '../App.jsx';
import { ContentProvider } from '../cms/ContentProvider.jsx';
import { createSeedDocuments } from '../cms/content-model.js';
import { SponsorPreviewProvider } from './SponsorPlacement.jsx';
import { createSponsorSlot, SPONSOR_PLACEMENTS, validateSponsorSlot } from './sponsor-model.js';
import './sponsors.css';

const seeds = createSeedDocuments();
const initialSlots = () => Object.keys(SPONSOR_PLACEMENTS).map(createSponsorSlot);
const reviewAllowed = typeof __ADMIN_PREVIEW_ENABLED__ !== 'undefined' && __ADMIN_PREVIEW_ENABLED__;
export default function SponsorReviewPage({ allowReview = reviewAllowed }) {
  const [slots, setSlots] = useState(initialSlots);
  const [placement, setPlacement] = useState('home');
  const [form, setForm] = useState(() => createSponsorSlot('home'));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('Both placements are off. Load the local sample to try the layout.');
  const [page, setPage] = useState('Home');
  const [previewVersion, setPreviewVersion] = useState(0);
  const showPage = next => { setPage(next); setPreviewVersion(previous => previous + 1); };
  const fieldRefs = useRef({});
  const dirty = JSON.stringify(form) !== JSON.stringify(slots.find(slot => slot.placement === placement));
  useEffect(() => {
    document.title = 'Sponsor placement review | Inclusive Quest';
    const meta = document.createElement('meta'); meta.name = 'robots'; meta.content = 'noindex, nofollow'; document.head.append(meta);
    return () => meta.remove();
  }, []);
  const select = next => {
    if (dirty) { setMessage('Keep your changes or discard them before switching placement.'); return; }
    setPlacement(next); setForm({ ...slots.find(slot => slot.placement === next) }); setErrors({}); showPage(next === 'home' ? 'Home' : 'Watch'); setMessage('Editing ' + SPONSOR_PLACEMENTS[next].toLowerCase() + '.');
  };
  const save = event => {
    event.preventDefault();
    const nextErrors = validateSponsorSlot(form); setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setMessage('Please fix the highlighted fields. The website preview has not changed.'); fieldRefs.current[Object.keys(nextErrors)[0]]?.focus(); return; }
    setSlots(previous => previous.map(slot => slot.placement === placement ? { ...form } : slot));
    setMessage(`${SPONSOR_PLACEMENTS[placement]} kept ${form.enabled ? 'on' : 'off'} in this tab only. Nothing is saved to the server or published.`);
  };
  const change = (name, value) => { setForm(previous => ({ ...previous, [name]: value })); setErrors(previous => ({ ...previous, [name]: undefined })); };
  if (!allowReview) return <main className="sponsor-review"><div className="sponsor-review-controls"><a href="/">Back to Inclusive Quest</a><h1>Sponsor preview is not available here.</h1><p>Review controls are limited to the separate preview deployment. No sponsor placements are active.</p></div></main>;
  return <div className="sponsor-review">
    <section className="sponsor-review-controls" aria-labelledby="sponsor-review-heading">
      <a href="/admin">← Content admin</a><h1 id="sponsor-review-heading">Sponsor placement review</h1>
      <div className="sponsor-review-notice"><strong>Preview only. Advertising is off on the real website.</strong><p>These fields stay in this tab and reset on reload. They do not upload files, save to the CMS, or publish. Use public sample content only.</p><p>Provisional scope: one homepage slot and one shared slot across episode pages. Positions and episode targeting still need approval.</p></div>
      <div className="sponsor-review-tabs" role="group" aria-label="Choose sponsor placement">{Object.entries(SPONSOR_PLACEMENTS).map(([key, label]) => <button key={key} type="button" aria-pressed={placement === key} onClick={() => select(key)}>{label}</button>)}</div>
      <form onSubmit={save} noValidate aria-label={`${SPONSOR_PLACEMENTS[placement]} sponsor fields`}>
        <div className="sponsor-review-fields">{[
          ['name', 'Sponsor name', 'text', 'Use the approved advertiser name.'],
          ['destinationUrl', 'Destination link', 'url', 'HTTPS only. The sponsor link opens in a new tab.'],
          ['imageSrc', 'Image URL or site asset path', 'text', 'No artwork was supplied. Load the local sample below; there is no image upload in this review.'],
          ['imageAlt', 'Image description', 'text', 'Describe the logo or message. Required when an image is provided.']
        ].map(([name, label, type, help]) => <div className="sponsor-review-field" key={name}><label htmlFor={`sponsor-${name}`}>{label}</label><input ref={element => { fieldRefs.current[name] = element; }} id={`sponsor-${name}`} type={type} value={form[name]} onChange={event => change(name, event.target.value)} aria-invalid={Boolean(errors[name])} aria-describedby={`sponsor-${name}-help${errors[name] ? ` sponsor-${name}-error` : ''}`} /><small id={`sponsor-${name}-help`}>{help}</small>{errors[name] && <p id={`sponsor-${name}-error`}>{errors[name]}</p>}</div>)}</div>
        <label className="sponsor-review-switch"><input ref={element => { fieldRefs.current.enabled = element; }} type="checkbox" checked={form.enabled} onChange={event => change('enabled', event.target.checked)} />Enabled in review preview</label>
        <div className="sponsor-review-actions"><button type="submit">Keep preview changes</button><button type="button" onClick={() => { setForm({ placement, enabled: false, name: 'Example sponsor · layout sample', imageSrc: '/sponsor-preview-placeholder.svg', imageAlt: 'Sponsor image placeholder. Layout sample, not an advertiser.', destinationUrl: 'https://example.com/' }); setErrors({}); setMessage('Local sample loaded, still off. Turn on the review switch and keep changes to see it on the page.'); }}>Load local sample</button><button type="button" onClick={() => { setForm({ ...slots.find(slot => slot.placement === placement) }); setErrors({}); setMessage('Unkept field changes discarded.'); }}>Discard field changes</button><button type="button" onClick={() => { const empty = createSponsorSlot(placement); setForm(empty); setSlots(previous => previous.map(slot => slot.placement === placement ? empty : slot)); setErrors({}); setMessage('This review placement is cleared and off. The other placement is unchanged.'); }}>Clear review placement</button></div>
      </form>
      <p className="sponsor-review-status" role="status" aria-live="polite">{message}</p>
      <details className="sponsor-review-guide"><summary>How to review and what remains</summary><ol><li>Choose a placement, load the local sample or enter approved public details, and supply an image description.</li><li>Turn on “Enabled in review preview” and select “Keep preview changes”. Inspect the actual homepage or episode layout below.</li><li>To hide it, turn the switch off and keep changes. This does not affect the other placement.</li><li>Before launch: approve positions and shared episode targeting, provide real sponsor assets, complete authenticated draft/publish integration and its permission tests, then separately approve activation.</li></ol><p>No rotation, tracking, ad networks, advertiser accounts, payments, or in-video ads are included.</p></details>
    </section>
    <div className="sponsor-preview-toolbar"><strong>Website preview</strong><button type="button" onClick={() => showPage('Home')}>View homepage</button><button type="button" onClick={() => showPage('Watch')}>View episode page</button><p>Homepage: {slots[0].enabled ? 'on in this tab' : 'off'} · Episode pages: {slots[1].enabled ? 'on in this tab' : 'off'}. Sponsor links open their stated destination; the local sample points to example.com.</p></div>
    <div className="sponsor-review-site"><ContentProvider previewDocuments={seeds}><SponsorPreviewProvider sponsors={slots}><App key={`${page}-${previewVersion}`} previewMode initialPage={page} /></SponsorPreviewProvider></ContentProvider></div>
  </div>;
}
