// No targeting or advertiser is assumed approved. CMS defaults always remain off.
export const SPONSOR_PLACEMENTS = Object.freeze({ home: 'Homepage', episode: 'Podcast episode pages' });
export function createSponsorSlot(placement) {
  if (!Object.hasOwn(SPONSOR_PLACEMENTS, placement)) throw new Error('Unknown sponsor placement.');
  return { placement, enabled: false, name: '', imageSrc: '', imageAlt: '', destinationUrl: '', targeting: 'undecided', episodeId: '' };
}
export function safeSponsorDestination(value) {
  if (typeof value !== 'string' || value.length > 2000 || /[\s\\\u0000-\u001f\u007f]/.test(value)
    || !/^https:\/\/[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+([/?#][A-Za-z0-9._~!$&()*+,;=:@%/?#-]*)?$/.test(value)
    || /%(?![0-9a-fA-F]{2})/.test(value)) return '';
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
export function validateSponsorSlot(slot, { publication = true } = {}) {
  if (!slot || typeof slot !== 'object' || Array.isArray(slot)) return { placement: 'Choose a sponsor placement.' };
  const errors = {};
  if (!Object.hasOwn(SPONSOR_PLACEMENTS, slot.placement)) errors.placement = 'Choose a supported placement.';
  if (typeof slot.enabled !== 'boolean') errors.enabled = 'The placement switch must be on or off.';
  for (const [field, label, max] of [['name', 'Sponsor name', 160], ['imageSrc', 'Image path or URL', 2000], ['imageAlt', 'Image description', 500], ['destinationUrl', 'Destination link', 2000]]) {
    if (typeof slot[field] !== 'string') errors[field] = `${label} must be text.`;
    else if (slot[field].length > max) errors[field] = `${label} must be ${max} characters or fewer.`;
    else if (publication && slot.enabled && !slot[field].trim()) errors[field] = `${label} is required before publishing an enabled placement.`;
  }
  if (slot.imageSrc && !safeSponsorImage(slot.imageSrc)) errors.imageSrc = 'Use an approved site image path or an HTTPS image URL. No embed code.';
  if (slot.destinationUrl && !safeSponsorDestination(slot.destinationUrl)) errors.destinationUrl = 'Use a full HTTPS link without credentials, spaces or a custom port.';
  if (slot.imageSrc && typeof slot.imageAlt === 'string' && !slot.imageAlt.trim()) errors.imageAlt = 'Describe what the sponsor image communicates.';
  if (!['undecided', 'shared', 'episode'].includes(slot.targeting)) errors.targeting = 'Choose a supported episode targeting option.';
  if (typeof slot.episodeId !== 'string' || (slot.episodeId && !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(slot.episodeId))) errors.episodeId = 'Choose a valid episode.';
  if (slot.placement === 'home' && slot.targeting !== 'undecided') errors.targeting = 'Homepage placement does not use episode targeting.';
  if ((slot.placement === 'home' || slot.targeting !== 'episode') && slot.episodeId) errors.episodeId = 'Only a per-episode placement can have an episode target.';
  if (publication && slot.enabled && slot.placement === 'episode') {
    if (slot.targeting === 'undecided') errors.targeting = 'Resolve episode targeting before publishing an enabled placement.';
    if (slot.targeting === 'episode' && !slot.episodeId) errors.episodeId = 'Choose a published episode before enabling this placement.';
  }
  return errors;
}
export function sponsorPublicationIssues(slot, records, id) {
  const errors = validateSponsorSlot(slot);
  if (!slot?.enabled || !Array.isArray(records)) return errors;
  if (slot.placement === 'episode' && slot.targeting === 'episode' && !records.some(record => record.type === 'episode' && record.id === slot.episodeId && record.published)) {
    errors.episodeId = 'Choose a currently published episode before enabling this placement.';
  }
  if (records.some(record => {
    const other = record.published;
    return record.id !== id && record.type === 'sponsor' && other?.enabled === true && other.placement === slot.placement
      && (slot.placement === 'home' || other.targeting === 'shared' || slot.targeting === 'shared' || (slot.targeting === 'episode' && other.episodeId === slot.episodeId));
  })) errors.placement = 'This placement overlaps an enabled published sponsor. Disable or unpublish the existing sponsor first.';
  return errors;
}
export function visibleSponsor(sponsors, placement, episodeId) {
  if (!Array.isArray(sponsors)) return null;
  const matches = sponsors.filter(slot => slot?.placement === placement && slot.enabled === true
    && (placement === 'home' || slot.targeting === 'shared' || (slot.targeting === 'episode' && episodeId && slot.episodeId === episodeId)));
  // Ambiguous duplicate slots fail closed rather than selecting an arbitrary advertiser.
  if (matches.length !== 1 || Object.keys(validateSponsorSlot(matches[0])).length) return null;
  return { ...matches[0], imageSrc: safeSponsorImage(matches[0].imageSrc), destinationUrl: safeSponsorDestination(matches[0].destinationUrl) };
}

