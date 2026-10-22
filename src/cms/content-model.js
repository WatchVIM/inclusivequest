import { ABOUT, FOUNDER, MISSION_VISION_VALUES, TESTIMONIALS, TITLES } from '../content.js';
import { createSponsorSlot, validateSponsorSlot, sponsorPublicationIssues } from '../sponsors/sponsor-model.js';
import { isStoredImageSource } from './backend-config.js';

export const SCHEMA_VERSION = 1;
export const DEFAULT_POST_AUTHOR = 'Alma / Inclusive Quest';
export const HOME_INTERPRETER_DEFAULTS = { interpreterImageSrc: '', interpreterImageAlt: '', interpreterTitle: '', interpreterSubtitle: '' };

export function isValidPostDate(value) {
  if (value === '') return true;
  if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export const CONTENT_TYPES = ['page', 'post', 'founder', 'testimonial', 'episode', 'category', 'sponsor'];
export const POST_TEMPLATES = {
  story: { label: 'Community story', body: 'The story\n\nWhy it matters\n\nWhat comes next' },
  announcement: { label: 'Announcement', body: 'The news\n\nWhat this means for our community\n\nNext steps' },
  interview: { label: 'Interview', body: 'Meet our guest\n\nQuestion\n\nAnswer\n\nWhere to learn more' }
};
export const TYPE_LABELS = { page: 'Pages', post: 'Blog posts', founder: 'Founder', testimonial: 'Testimonials', episode: 'YouTube episodes', category: 'Video categories', sponsor: 'Sponsors' };
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const clone = (value) => JSON.parse(JSON.stringify(value));

/** Accept video links, never arbitrary iframe markup or an arbitrary host. */
export function parseYouTubeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  let url;
  try { url = new URL(value.trim()); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  let videoId;
  if (host === 'youtu.be') {
    videoId = url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
  } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
    videoId = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
  } else if (host === 'www.youtube-nocookie.com') {
    videoId = url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
  }
  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  return { videoId, url: `https://www.youtube.com/watch?v=${videoId}`, embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}` };
}

export function isSafeImageUrl(value) {
  if (typeof value !== 'string' || /[\\\u0000-\u001f]/.test(value)) return false;
  if (!value) return true;
  if (/^\/(?!\/)/.test(value)) return !/[\\\s\u0000-\u001f]/.test(value);
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !/[\u0000-\u0020]/.test(value);
  } catch { return false; }
}

export function validateDocument(type, data) {
  const errors = {};
  if (!CONTENT_TYPES.includes(type)) return { type: 'Unknown content type.' };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { data: 'Content must be an object.' };
  if (type === 'sponsor') {
    const sponsorErrors = validateSponsorSlot(data, { publication: false });
    if (typeof data.imageSrc === 'string' && !isStoredImageSource(data.imageSrc)) sponsorErrors.imageSrc = 'Upload sponsor artwork through the CMS or use an approved existing site image.';
    return sponsorErrors;
  }
  const text = (field, label, required = false, max = 5000) => {
    if (data[field] == null && !required) return;
    if (typeof data[field] !== 'string') errors[field] = `${label} must be text.`;
    else if (required && !data[field].trim()) errors[field] = `${label} is required.`;
    else if (data[field].length > max) errors[field] = `${label} must be ${max.toLocaleString()} characters or fewer.`;
  };
  const slug = () => {
    text('slug', 'Slug', true, 100);
    if (typeof data.slug === 'string' && !SLUG.test(data.slug)) errors.slug = 'Use lowercase letters, numbers, and single hyphens.';
  };
  if (['page', 'post'].includes(type)) {
    text('title', 'Title', true, 160); slug();
    text('body', 'Body', true, 40000);
  }
  if (type === 'page') {
    text('heading', 'Heading', true, 200); text('subtitle', 'Subtitle', false, 300);
    text('interpreterTitle', 'Interpreter title', false, 160); text('interpreterSubtitle', 'Interpreter subtitle', false, 300);
    text('interpreterImageSrc', 'Interpreter image', false, 2000); text('interpreterImageAlt', 'Interpreter image alternative text', Boolean(data.interpreterImageSrc), 500);
    if (data.interpreterImageSrc && !isSafeImageUrl(data.interpreterImageSrc)) errors.interpreterImageSrc = 'Use a site-relative image path or an HTTPS image URL.';
  }
  if (type === 'post') {
    text('excerpt', 'Summary', true, 500);
    text('author', 'Author', false, 160); text('date', 'Post date', false, 10);
    if (data.date != null && !isValidPostDate(data.date)) errors.date = 'Use a real calendar date in YYYY-MM-DD format, or leave blank.';
    if (!Object.hasOwn(POST_TEMPLATES, data.template)) errors.template = 'Choose a supported post template.';
  }
  if (type === 'founder') {
    text('name', 'Name', true, 160); text('title', 'Role', true, 160); text('heading', 'Founder heading', false, 200);
    text('bio', 'Biography', true, 20000); text('story', 'Founder story', true, 20000); text('homeQuote', 'Homepage quote', true, 1000);
  }
  if (type === 'testimonial') {
    text('name', 'Name', true, 160); text('title', 'Attribution', false, 160); text('quote', 'Quote', true, 10000);
  }
  if (type === 'episode') {
    text('title', 'Show title', true, 160); text('episodeTitle', 'Episode title', true, 220);
    text('hostName', 'Host name', false, 160);
    if (Object.hasOwn(data, 'comingSoon') && typeof data.comingSoon !== 'boolean') errors.comingSoon = 'Coming soon must be on or off.';
    text('description', 'Description', true, 10000); text('category', 'Category', true, 100);
    text('youtubeUrl', 'YouTube URL', false, 2000);
    if (data.youtubeUrl && !parseYouTubeUrl(data.youtubeUrl)) errors.youtubeUrl = 'Enter a full HTTPS YouTube video link (watch, shorts, live, or youtu.be).';
    if (!Array.isArray(data.tags) || data.tags.length > 20 || data.tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 60)) errors.tags = 'Use up to 20 tags, each 1–60 characters.';
    for (const field of ['mainVideoSrc', 'aslVideoSrc', 'captionsSrc']) {
      if (data[field] != null && (typeof data[field] !== 'string' || !isSafeImageUrl(data[field]))) errors[field] = 'Use a site-relative path or HTTPS media URL.';
    }
    text('duration', 'Duration', false, 100); text('badge', 'Accessibility label', false, 160);
  }
  if (type === 'category') { text('name', 'Category name', true, 100); slug(); text('description', 'Description', false, 1000); }
  if (['page', 'post', 'founder', 'episode'].includes(type)) {
    text('imageSrc', 'Image URL', false, 2000); text('imageAlt', 'Alternative text', Boolean(data.imageSrc), 500);
    if (data.imageSrc && !isSafeImageUrl(data.imageSrc)) errors.imageSrc = 'Use a site-relative image path or an HTTPS image URL.';
  }
  return errors;
}

export function publicationIssues(type, data, records, id) {
  if (type === 'sponsor') return { ...validateDocument(type, data), ...sponsorPublicationIssues(data, records, id) };
  const errors = validateDocument(type, data);
  if (type === 'episode') {
    if (data.comingSoon === true) {
      for (const field of ['youtubeUrl', 'mainVideoSrc', 'aslVideoSrc', 'captionsSrc']) {
        if (data[field]) errors[field] = 'Remove media links before publishing a coming-soon episode. Coming-soon status hides playback, not media URLs.';
      }
    } else if (!data.youtubeUrl && !(data.mainVideoSrc && data.aslVideoSrc)) errors.youtubeUrl = 'Add a YouTube video link or approved episode and interpreter media, or mark the episode coming soon before publishing.';
  }
  return errors;
}

export function documentTitle(record) {
  return record.draft.episodeTitle || record.draft.title || record.draft.name || 'Untitled draft';
}
export function hasDraftChanges(record) { return JSON.stringify(record.draft) !== JSON.stringify(record.published); }
export function documentStatus(record) { return !record.published ? 'Draft only' : hasDraftChanges(record) ? 'Unpublished changes' : 'Published reference'; }

export function createSeedDocuments() {
  const records = [
    { id: 'page-home', type: 'page', data: { title: 'Home', slug: 'home', heading: 'Accessible Podcasts.', subtitle: '', ...HOME_INTERPRETER_DEFAULTS, body: 'Explore the podcast world through Sign Language interpretation, captions, transcripts, and topic-based discovery — with DHH audiences at the center.', imageSrc: '', imageAlt: '' } },
    { id: 'page-about', type: 'page', data: { title: 'About', slug: 'about', heading: ABOUT.heading, subtitle: '', body: ABOUT.paragraphs.join('\n\n'), imageSrc: '', imageAlt: '' } },
    ...MISSION_VISION_VALUES.map(item => ({ id: `page-${item.id}`, type: 'page', data: { title: item.heading, slug: item.id, heading: item.heading, subtitle: '', body: item.text, imageSrc: '', imageAlt: '' } })),
    { id: 'founder-alma', type: 'founder', data: { name: FOUNDER.name, title: FOUNDER.title, heading: FOUNDER.heading, bio: FOUNDER.bio.join('\n\n'), story: FOUNDER.story.join('\n\n'), homeQuote: FOUNDER.homeQuote, imageSrc: FOUNDER.photoSrc, imageAlt: FOUNDER.photoAlt } },
    ...TESTIMONIALS.map((item, index) => ({ id: `testimonial-${index + 1}`, type: 'testimonial', data: item })),
    ...TITLES.map(item => ({ id: item.id, type: 'episode', data: { ...item, youtubeUrl: '', imageSrc: item.poster, imageAlt: `${item.title} podcast artwork`, tags: [] } })),
    { id: 'category-podcast', type: 'category', data: { name: 'Podcast', slug: 'podcast', description: 'Podcast conversations.' } }
  ];
  return records.map(({id, type, data}) => ({ id, type, draft: clone(data), published: clone(data), revision: 0 }));
}

export function createDraft(type, id, template = 'story') {
  if (!CONTENT_TYPES.includes(type) || typeof id !== 'string' || !ID.test(id)) throw new Error('Invalid content type or ID.');
  const image = { imageSrc: '', imageAlt: '' };
  const defaults = {
    page: { title: '', slug: '', heading: '', subtitle: '', body: '', ...image },
    post: { title: '', slug: '', excerpt: '', date: '', author: DEFAULT_POST_AUTHOR, body: POST_TEMPLATES[template]?.body || POST_TEMPLATES.story.body, template: Object.hasOwn(POST_TEMPLATES, template) ? template : 'story', ...image },
    founder: { name: '', title: '', heading: '', bio: '', story: '', homeQuote: '', ...image },
    testimonial: { name: '', title: '', quote: '' },
    episode: { title: '', episodeTitle: '', hostName: '', comingSoon: false, description: '', youtubeUrl: '', category: 'Podcast', tags: [], ...image, mainVideoSrc: null, aslVideoSrc: null, captionsSrc: null, duration: '', badge: '' },
    category: { name: '', slug: '', description: '' },
    sponsor: createSponsorSlot('home')
  };
  return { id, type, draft: defaults[type], published: null, revision: 0 };
}

export function validateDraftCollection(records) {
  if (!Array.isArray(records) || records.length > 250) throw new Error('A review can contain at most 250 records.');
  const ids = new Set(); const slugs = new Set();
  for (const record of records) {
    if (!record || typeof record.id !== 'string' || !ID.test(record.id) || ids.has(record.id)) throw new Error('Every record needs a unique, valid ID.');
    ids.add(record.id);
    const errors = validateDocument(record.type, record.draft);
    if (Object.keys(errors).length) throw new Error(`${documentTitle(record)}: ${Object.values(errors)[0]}`);
    if (record.draft.slug) {
      const key = `${record.type}:${record.draft.slug}`;
      if (slugs.has(key)) throw new Error('Slugs must be unique within each content section.');
      slugs.add(key);
    }
  }
  return records;
}

export function exportDrafts(records) {
  validateDraftCollection(records);
  const json = JSON.stringify({ schemaVersion: SCHEMA_VERSION, kind: 'inclusive-quest-draft-review', drafts: records.map(({id, type, draft, revision}) => ({ id, type, data: draft, revision })) }, null, 2);
  if (new TextEncoder().encode(json).length > 1024 * 1024) throw new Error('The draft review exceeds the 1 MB import limit. Reduce the content size before downloading a restorable file.');
  return json;
}

/** Import is a review-only merge. A file cannot manufacture published content. */
export function importDrafts(json, currentRecords) {
  if (typeof json !== 'string' || new TextEncoder().encode(json).length > 1024 * 1024) throw new Error('Choose a draft review JSON file smaller than 1 MB.');
  const payload = JSON.parse(json);
  if (payload.schemaVersion !== SCHEMA_VERSION || payload.kind !== 'inclusive-quest-draft-review' || !Array.isArray(payload.drafts)) throw new Error('This is not a supported Inclusive Quest draft review file.');
  const incoming = payload.drafts.map(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !ID.test(item.id)) throw new Error('Invalid draft record.');
    const current = currentRecords.find(record => record.id === item.id);
    if (current && current.type !== item.type) throw new Error('An existing content type cannot be changed by import.');
    return { id: item.id, type: item.type, draft: clone(item.data), published: current?.published || null, revision: current ? current.revision + 1 : 1 };
  });
  validateDraftCollection(incoming);
  const result = [...currentRecords.filter(record => !incoming.some(item => item.id === record.id)), ...incoming];
  validateDraftCollection(result);
  return result;
}

