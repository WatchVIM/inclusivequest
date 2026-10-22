import { createClient } from '@supabase/supabase-js';
import { readBackendConfig, IMAGE_BUCKET, MANAGED_IMAGE_PATH, MAX_IMAGE_BYTES, detectImageType } from '../src/cms/backend-config.js';

export function mediaHandler({ env = process.env, create = createClient } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD'); return res.status(405).end();
    }
    const path = req.query?.path;
    if (typeof path !== 'string' || !MANAGED_IMAGE_PATH.test(path)) return res.status(400).end();
    const config = readBackendConfig(env);
    if (!config) return res.status(503).end();
    try {
      // Anonymous download policies admit ONLY paths in current published content.
      // Never forward caller Authorization/cookies or accept an upstream URL.
      const db = create(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const { data, error } = await db.storage.from(IMAGE_BUCKET).download(path);
      if (error || !data || data.size <= 0 || data.size > MAX_IMAGE_BYTES) return res.status(404).end();
      const bytes = new Uint8Array(await data.arrayBuffer());
      const type = detectImageType(bytes);
      if (!type || type !== data.type) return res.status(404).end();
      res.setHeader('Content-Type', type);
      res.setHeader('Content-Length', String(bytes.length));
      res.setHeader('Content-Disposition', 'inline');
      return req.method === 'HEAD' ? res.status(200).end() : res.status(200).send(Buffer.from(bytes));
    } catch { return res.status(404).end(); }
  };
}
export default mediaHandler();
