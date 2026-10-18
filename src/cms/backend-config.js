// Intentionally scoped to the client's project; never fall back to another project or secret key.
export const CLIENT_PROJECT_REF = 'xkdmvbwkaaxjgasitbwv';
export const CLIENT_PROJECT_URL = `https://${CLIENT_PROJECT_REF}.supabase.co`;
export function readBackendConfig(env = {}) {
  if (env.VITE_CMS_ENABLED !== 'true' || env.VITE_SUPABASE_URL !== CLIENT_PROJECT_URL) return null;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (typeof key !== 'string' || !/^sb_publishable_[A-Za-z0-9_-]{20,200}$/.test(key)) return null;
  return { url: CLIENT_PROJECT_URL, publishableKey: key };
}
export const MAX_PUBLIC_SNAPSHOT_BYTES = 3_500_000;
export const IMAGE_BUCKET = 'cms-images';
export const MAX_IMAGE_BYTES = 4_000_000;
export const MANAGED_IMAGE_PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/;
export function imagePathFromSource(source) {
  if (typeof source !== 'string' || !source.startsWith('/api/media?path=')) return null;
  const path = source.slice('/api/media?path='.length);
  return MANAGED_IMAGE_PATH.test(path) ? path : null;
}
export function detectImageType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value)) return 'image/png';
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}
