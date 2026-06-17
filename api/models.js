/**
 * Vercel Serverless Function — Model portfolio persistence via Upstash Redis
 * GET  /api/models  → load all models
 * POST /api/models  → save all models (full replace)
 *
 * Compatible with Upstash Redis REST API (marketplace) and Vercel KV.
 * Env vars injected automatically by Vercel when you connect Upstash:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

const MODELS_KEY = 'mp_rebalancer_models';

function getConfig() {
  const url   = process.env.UPSTASH_REDIS_REST_URL   || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN  || process.env.KV_REST_API_TOKEN;
  return { url, token, configured: !!(url && token) };
}

async function redisGet(key) {
  const { url, token, configured } = getConfig();
  if (!configured) return { value: null, configured: false };

  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });

  if (!r.ok) throw new Error(`Redis GET ${r.status}: ${await r.text()}`);

  const data = await r.json();

  // Upstash returns { result: "stringified-json" } or { result: null } if key missing
  // Value may be a raw string (if set via POST body JSON.stringify) or already an object
  let value = data?.result ?? null;
  if (value === null) return { value: null, configured: true, empty: true };

  // If value is a string, parse it
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch(e) {
      throw new Error(`Stored value is not valid JSON: ${value.slice(0,100)}`);
    }
  }

  return { value, configured: true, empty: false };
}

async function redisSet(key, value) {
  const { url, token, configured } = getConfig();
  if (!configured) throw new Error('Upstash not configured — add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel environment variables');

  // Upstash REST SET: POST to /set/{key} with body as the value
  // We store as a JSON string for portability
  const r = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    // Upstash REST API expects: body = JSON array of command args
    // Format: ["SET", key, value] via the pipeline, OR just pass value directly
    // Using the simpler direct value format:
    body: JSON.stringify(typeof value === 'string' ? value : JSON.stringify(value)),
    signal: AbortSignal.timeout(5000),
  });

  if (!r.ok) throw new Error(`Redis SET ${r.status}: ${await r.text()}`);
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET ───────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { value, configured, empty } = await redisGet(MODELS_KEY);

      if (!configured) {
        return res.status(200).json({ models: null, source: 'not-configured' });
      }
      if (empty || !value) {
        return res.status(200).json({ models: null, source: 'empty' });
      }

      // Validate it looks like a models object
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Stored value is not a models object');
      }

      return res.status(200).json({
        models: value,
        source: 'redis',
        count: Object.keys(value).length,
      });

    } catch (err) {
      console.error('GET error:', err.message);
      // Return graceful failure — frontend falls back to localStorage
      return res.status(200).json({ models: null, source: 'error', error: err.message });
    }
  }

  // ── POST ──────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      let body = '';
      await new Promise((resolve, reject) => {
        req.on('data', chunk => body += chunk);
        req.on('end', resolve);
        req.on('error', reject);
      });

      const parsed = JSON.parse(body);
      const { models } = parsed;

      if (!models || typeof models !== 'object' || Array.isArray(models)) {
        return res.status(400).json({ error: 'Invalid payload — expected { models: { id: {...}, ... } }' });
      }

      // Basic validation — every model should have a name and holdings array
      for (const [id, m] of Object.entries(models)) {
        if (!m.name || !Array.isArray(m.holdings)) {
          return res.status(400).json({ error: `Invalid model "${id}" — missing name or holdings` });
        }
      }

      await redisSet(MODELS_KEY, models);

      return res.status(200).json({
        ok: true,
        count: Object.keys(models).length,
        savedAt: new Date().toISOString(),
      });

    } catch (err) {
      console.error('POST error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
