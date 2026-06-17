/**
 * Vercel Serverless Function — Model portfolio persistence via Upstash Redis
 * GET  /api/models  → load all models
 * POST /api/models  → save all models (full replace)
 *
 * Upstash Redis REST API is identical in structure to Vercel KV.
 * Env vars are auto-injected when you connect Upstash via the Vercel marketplace:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Vercel KV users: this also works with KV_REST_API_URL / KV_REST_API_TOKEN
 * by falling through to those names automatically.
 */

const MODELS_KEY = 'mp_rebalancer_models';

function getEnv() {
  // Support both Upstash (marketplace) and Vercel KV env var names
  const url   = process.env.UPSTASH_REDIS_REST_URL   || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN  || process.env.KV_REST_API_TOKEN;
  return { url, token };
}

async function redisGet(key) {
  const { url, token } = getEnv();
  if (!url || !token) return { value: null, configured: false };
  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`Redis GET failed: ${r.status}`);
  const data = await r.json();
  return { value: data?.result ?? null, configured: true };
}

async function redisSet(key, value) {
  const { url, token } = getEnv();
  if (!url || !token) throw new Error('Redis not configured — add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel environment variables');
  const r = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  if (!r.ok) throw new Error(`Redis SET failed: ${r.status}`);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: load models ──────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { value, configured } = await redisGet(MODELS_KEY);
      if (!configured) {
        return res.status(200).json({ models: null, source: 'not-configured' });
      }
      if (!value) {
        return res.status(200).json({ models: null, source: 'empty' });
      }
      const models = typeof value === 'string' ? JSON.parse(value) : value;
      return res.status(200).json({ models, source: 'redis', count: Object.keys(models).length });
    } catch (err) {
      console.error('GET error:', err.message);
      return res.status(200).json({ models: null, source: 'error', error: err.message });
    }
  }

  // ── POST: save models ─────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      let body = '';
      await new Promise((resolve, reject) => {
        req.on('data', chunk => body += chunk);
        req.on('end', resolve);
        req.on('error', reject);
      });
      const { models } = JSON.parse(body);
      if (!models || typeof models !== 'object') {
        return res.status(400).json({ error: 'Invalid payload — expected { models: {...} }' });
      }
      await redisSet(MODELS_KEY, JSON.stringify(models));
      return res.status(200).json({ ok: true, count: Object.keys(models).length });
    } catch (err) {
      console.error('POST error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
