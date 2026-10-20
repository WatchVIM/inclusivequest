// Two independently controlled slots. Episode targeting is a provisional shared slot.
export const SPONSOR_PLACEMENTS = Object.freeze({ home: 'Homepage', episode: 'Podcast episode pages' });
export function createSponsorSlot(placement) {
  if (!Object.hasOwn(SPONSOR_PLACEMENTS, placement)) throw new Error('Unknown sponsor placement.');
  return { placement, enabled: false, name: '', imageSrc: '', imageAlt: '', destinationUrl: '' };
}
export function safeSponsorDestination(value) {
  if (typeof value !== 'string' || /[\s\\\u0000-\u001f\u007f]/.test(value)) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port ? url.href : '';
  } catch { return ''; }
}
export function safeSponsorImage(value) {
  if (typeof value !== 'string' || /[\s\\\u0000-\u001f\u007f]/.test(value)) return '';
  if (/^\/(?!\/)/.test(value) && !value.includes('..')) return value;
  return safeSponsorDestination(value);
}
export function validateSponsorSlot(slot) {
  if (!slot || typeof slot !== 'object' || Array.isArray(slot)) return { placement: 'Choose a sponsor placement.' };
  const errors = {};
  if (!Object.hasOwn(SPONSOR_PLACEMENTS, slot.placement)) errors.placement = 'Choose a supported placement.';
  if (typeof slot.enabled !== 'boolean') errors.enabled = 'The placement switch must be on or off.';
  for (const [field, label, max] of [['name', 'Sponsor name', 160], ['imageSrc', 'Image path or URL', 2000], ['imageAlt', 'Image description', 500], ['destinationUrl', 'Destination link', 2000]]) {
    if (typeof slot[field] !== 'string') errors[field] = `${label} must be text.`;
    else if (slot[field].length > max) errors[field] = `${label} must be ${max} characters or fewer.`;
    else if (slot.enabled && !slot[field].trim()) errors[field] = `${label} is required before enabling this placement.`;
  }
  if (slot.imageSrc && !safeSponsorImage(slot.imageSrc)) errors.imageSrc = 'Use an approved site image path or an HTTPS image URL. No embed code.';
  if (slot.destinationUrl && !safeSponsorDestination(slot.destinationUrl)) errors.destinationUrl = 'Use a full HTTPS link without credentials, spaces or a custom port.';
  if (slot.imageSrc && typeof slot.imageAlt === 'string' && !slot.imageAlt.trim()) errors.imageAlt = 'Describe what the sponsor image communicates.';
  return errors;
}
export function visibleSponsor(sponsors, placement) {
  if (!Array.isArray(sponsors)) return null;
  const matches = sponsors.filter(slot => slot?.placement === placement && slot.enabled === true);
  // Ambiguous duplicate slots fail closed rather than selecting an arbitrary advertiser.
  if (matches.length !== 1 || Object.keys(validateSponsorSlot(matches[0])).length) return null;
  return { ...matches[0], imageSrc: safeSponsorImage(matches[0].imageSrc), destinationUrl: safeSponsorDestination(matches[0].destinationUrl) };
}
