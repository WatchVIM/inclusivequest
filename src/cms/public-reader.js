import { createSeedDocuments, parseYouTubeUrl, validateDocument } from './content-model.js';

const TYPES = new Set(['page', 'founder', 'testimonial', 'episode', 'post', 'category']);
const PAGE_IDS = ['page-home', 'page-about', 'page-mission', 'page-vision', 'page-values'];
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' ? value : '';
const paragraphs = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string') : text(value).split(/\n\s*\n/)).map((item) => item.trim()).filter(Boolean);

// Never allow a content field to become an executable or protocol-relative URL.
export function safePublicAssetUrl(value) {
  if (typeof value !== 'string' || /[\u0000-\u001f\\]/.test(value)) return '';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

function pageData(document) {
  const data = document.data;
  return { id: document.id, title: text(data.title), slug: text(data.slug), heading: text(data.heading),
    subtitle: text(data.subtitle), body: text(data.body), paragraphs: paragraphs(data.body),
    imageSrc: safePublicAssetUrl(data.imageSrc), imageAlt: text(data.imageAlt) };
}

/** Adapt CMS snapshots to the public site's presentation model. No draft is read outside preview. */
export function buildPublicContent(documents = createSeedDocuments(), { preview = false } = {}) {
  const seeds = createSeedDocuments();
  const seen = new Set();
  const structurallyValid = Array.isArray(documents) && documents.length <= 1000 && documents.every((document) => {
    if (!isRecord(document) || typeof document.id !== 'string' || !document.id || !TYPES.has(document.type) || seen.has(document.id)) return false;
    seen.add(document.id);
    return true;
  });
  const source = structurallyValid ? documents : seeds;
  const selected = [];
  for (const document of source) {
    const data = preview ? document.draft ?? document.published : document.published;
    if (!isRecord(data)) continue;
    // In-progress drafts may be incomplete. Normalize each rendered field below instead of leaking
    // arbitrary values into React or substituting a published version during an explicit preview.
    if (!preview && Object.keys(validateDocument(document.type, data)).length) continue;
    selected.push({ id: document.id, type: document.type, data });
  }
  for (const id of PAGE_IDS) {
    if (!selected.some((document) => document.id === id && document.type === 'page')) {
      const seed = seeds.find((document) => document.id === id && document.type === 'page');
      if (seed?.published) selected.push({ id, type: 'page', data: seed.published });
    }
  }
  if (!selected.some((document) => document.type === 'founder')) {
    const seed = seeds.find((document) => document.type === 'founder');
    if (seed?.published) selected.push({ id: seed.id, type: 'founder', data: seed.published });
  }
  const pages = selected.filter((document) => document.type === 'page').map(pageData);
  const founder = selected.find((document) => document.type === 'founder')?.data || {};
  return {
    HOME: pages.find((page) => page.id === 'page-home') || {},
    ABOUT: pages.find((page) => page.id === 'page-about') || { paragraphs: [] },
    PAGES: pages,
    MISSION_VISION_VALUES: ['mission', 'vision', 'values'].map((id) => {
      const page = pages.find((item) => item.id === `page-${id}`) || {};
      return { ...page, id, text: page.body || '' };
    }),
    FOUNDER: { name: text(founder.name), title: text(founder.title), bio: paragraphs(founder.bio),
      story: paragraphs(founder.story), homeQuote: text(founder.homeQuote),
      photoSrc: safePublicAssetUrl(founder.imageSrc), photoAlt: text(founder.imageAlt) },
    TESTIMONIALS: selected.filter((document) => document.type === 'testimonial').map(({ id, data }) => ({
      id, name: text(data.name), title: text(data.title), quote: text(data.quote)
    })),
    TITLES: selected.filter((document) => document.type === 'episode').map(({ id, data }) => ({
      id, title: text(data.title), episodeTitle: text(data.episodeTitle), description: text(data.description),
      category: text(data.category), tags: Array.isArray(data.tags) ? data.tags.filter((tag) => typeof tag === 'string') : [],
      youtubeUrl: parseYouTubeUrl(text(data.youtubeUrl))?.url || '',
      poster: safePublicAssetUrl(data.imageSrc), imageAlt: text(data.imageAlt),
      mainVideoSrc: safePublicAssetUrl(data.mainVideoSrc), aslVideoSrc: safePublicAssetUrl(data.aslVideoSrc),
      captionsSrc: safePublicAssetUrl(data.captionsSrc), duration: text(data.duration), badge: text(data.badge),
      interpreter: text(data.interpreter)
    })),
    POSTS: selected.filter((document) => document.type === 'post').map(({ id, data }) => ({
      id, title: text(data.title), slug: text(data.slug), excerpt: text(data.excerpt), body: text(data.body),
      paragraphs: paragraphs(data.body), imageSrc: safePublicAssetUrl(data.imageSrc), imageAlt: text(data.imageAlt),
      template: text(data.template)
    })),
    CATEGORIES: selected.filter((document) => document.type === 'category').map(({ id, data }) => ({
      id, name: text(data.name), slug: text(data.slug), description: text(data.description)
    }))
  };
}

/** Public APIs must return only published snapshots; admin responses are never a public API. */
export function parsePublicSnapshot(payload) {
  if (!isRecord(payload) || payload.schemaVersion !== 1 || !Array.isArray(payload.documents) || payload.documents.length > 1000) {
    throw new Error('Unsupported public content snapshot.');
  }
  const seen = new Set();
  return payload.documents.map((document) => {
    if (!isRecord(document) || typeof document.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(document.id)
      || !TYPES.has(document.type) || seen.has(document.id) || Object.hasOwn(document, 'draft')) {
      throw new Error('Invalid public content document.');
    }
    seen.add(document.id);
    if (document.published !== null && (!isRecord(document.published) || Object.keys(validateDocument(document.type, document.published)).length)) {
      throw new Error('Invalid published content.');
    }
    // Explicit allowlist avoids retaining metadata or internal editor state in public context.
    return { id: document.id, type: document.type, published: document.published };
  });
}

export async function fetchPublicContent({ fetchImpl = globalThis.fetch, signal } = {}) {
  try {
    const response = await fetchImpl('/api/content', { method: 'GET', credentials: 'same-origin',
      headers: { Accept: 'application/json' }, signal });
    if (!response.ok) throw new Error('Public content is unavailable.');
    const contentType = response.headers?.get?.('content-type');
    if (contentType && !contentType.toLowerCase().includes('application/json')) throw new Error('Unexpected content response.');
    return buildPublicContent(parsePublicSnapshot(await response.json()));
  } catch {
    // Deployment is deliberately static until an approved backend exists. Failed/HTML/invalid
    // endpoint responses always preserve the safe, original published site.
    return buildPublicContent();
  }
}
