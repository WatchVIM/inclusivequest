import { parseYouTubeUrl, validateDocument, CONTENT_TYPES } from './content-model.js';
const IMAGE = ['imageSrc', 'imageAlt'];
const FIELDS = {
  page: ['title', 'slug', 'heading', 'subtitle', 'body', ...IMAGE],
  post: ['title', 'slug', 'excerpt', 'body', 'template', ...IMAGE],
  founder: ['name', 'title', 'bio', 'story', 'homeQuote', ...IMAGE],
  testimonial: ['name', 'title', 'quote'],
  episode: ['title', 'episodeTitle', 'description', 'category', 'youtubeUrl', 'tags', 'mainVideoSrc', 'aslVideoSrc', 'captionsSrc', 'duration', 'badge', 'interpreter', ...IMAGE],
  category: ['name', 'slug', 'description'],
  sponsor: ['placement', 'enabled', 'name', 'imageSrc', 'imageAlt', 'destinationUrl', 'targeting', 'episodeId']
};
export function canonicalContent(type, input) {
  if (!CONTENT_TYPES.includes(type)) throw new Error('Unknown content type.');
  const errors = validateDocument(type, input);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const result = Object.fromEntries(FIELDS[type].filter(key => Object.hasOwn(input, key)).map(key => [key, structuredClone(input[key])]));
  if (type === 'episode' && result.youtubeUrl) result.youtubeUrl = parseYouTubeUrl(result.youtubeUrl).url;
  return result;
}

