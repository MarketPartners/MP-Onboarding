/**
 * Vercel Serverless Function — Model portfolio persistence via Upstash Redis
 * GET  /api/models  → load all models
 * POST /api/models  → save all models (full replace)
 *
 * Uses Upstash's /pipeline endpoint with proper Redis command arrays.
 * This is the documented, reliable way to SET/GET arbitrary-sized JSON values —
 * the single-command /set/{key} path-based endpoint has URL-length and
 * encoding limits that break on a payload this size.
 *
 * Env vars (auto-injected by Vercel when you connect Upstash via marketplace):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

const MODELS_KEY = 'mp_rebalancer_models';

function getConfig() {
  const url   = process.env.UPSTASH_REDIS_REST_URL  || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return { url, token, configured: !!(url && token) };
}

// Execute one or more Redis commands via the Upstash pipeline endpoint.
// commands: array of command arrays, e.g. [["GET","key"]] or [["SET","key","val"]]
async function upstashPipeline(commands) {
  const { url, token, configured } = getConfig();
  if (!configured) throw new Error('NOT_CONFIGURED');

  const r = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(8000),
  });

  const text = await r.text();
  if (!r.ok) throw new Error(`Upstash ${r.status}: ${text.slice(0, 300)}`);

  let parsed;
  try { parsed = JSON.parse(text); }
  catch(e) { throw new Error(`Upstash returned non-JSON: ${text.slice(0,200)}`); }

  // Pipeline returns an array of { result } or { error } objects, one per command
  return parsed;
}

async function redisGetModels() {
  const { configured } = getConfig();
  if (!configured) return { value: null, configured: false };

  const results = await upstashPipeline([['GET', MODELS_KEY]]);
  const first = results[0];

  if (first?.error) throw new Error(`Redis GET error: ${first.error}`);

  const raw = first?.result ?? null;
  if (raw === null) return { value: null, configured: true, empty: true };

  let value;
  try { value = JSON.parse(raw); }
  catch(e) { throw new Error(`Stored value is not valid JSON (first 100 chars): ${String(raw).slice(0,100)}`); }

  return { value, configured: true, empty: false };
}

async function redisSetModels(modelsObj) {
  const serialised = JSON.stringify(modelsObj);
  const results = await upstashPipeline([['SET', MODELS_KEY, serialised]]);
  const first = results[0];
  if (first?.error) throw new Error(`Redis SET error: ${first.error}`);
  if (first?.result !== 'OK') throw new Error(`Unexpected SET result: ${JSON.stringify(first)}`);
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
      const { value, configured, empty } = await redisGetModels();

      if (!configured) {
        return res.status(200).json({ models: null, source: 'not-configured' });
      }
      if (empty || !value) {
        return res.status(200).json({ models: null, source: 'empty' });
      }
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Stored value is not a models object');
      }

      return res.status(200).json({ models: value, source: 'redis', count: Object.keys(value).length });

    } catch (err) {
      console.error('[GET /api/models] error:', err.message);
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
      for (const [id, m] of Object.entries(models)) {
        if (!m.name || !Array.isArray(m.holdings)) {
          return res.status(400).json({ error: `Invalid model "${id}" — missing name or holdings array` });
        }
      }

      await redisSetModels(models);

      return res.status(200).json({ ok: true, count: Object.keys(models).length, savedAt: new Date().toISOString() });

    } catch (err) {
      console.error('[POST /api/models] error:', err.message);
      const isConfigError = err.message === 'NOT_CONFIGURED';
      return res.status(isConfigError ? 200 : 500).json({
        error: isConfigError
          ? 'Upstash not configured — add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel project environment variables, then redeploy.'
          : err.message,
        ok: false,
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
