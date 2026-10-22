import { createClient } from '@supabase/supabase-js';
import { readBackendConfig, MAX_PUBLIC_SNAPSHOT_BYTES } from '../src/cms/backend-config.js';
import { parsePublicSnapshot } from '../src/cms/public-reader.js';

export function contentHandler({ env = process.env, create = createClient } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD'); return res.status(405).json({ error: 'Method not allowed.' });
    }
    const config = readBackendConfig(env);
    if (!config) return res.status(503).json({ error: 'Content service is not configured.' });
    try {
      // Deliberately anonymous even if caller sends staff cookies/JWTs.
      // The publishable key cannot bypass RLS and is never a service-role key.
      const db = create(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const { data, error } = await db.rpc('cms_public_snapshot');
      if (error) throw new Error('Content service unavailable.');
      const documents = parsePublicSnapshot(data);
      const snapshot = { schemaVersion: 1, documents };
      if (Buffer.byteLength(JSON.stringify(snapshot), 'utf8') > MAX_PUBLIC_SNAPSHOT_BYTES) throw new Error('Published content exceeds the safe response budget.');
      if (req.method === 'HEAD') return res.status(200).end();
      return res.status(200).json(snapshot);
    } catch {
      return res.status(503).json({ error: 'Published content is temporarily unavailable.' });
    }
  };
}
export default contentHandler();
