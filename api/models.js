/**
 * Vercel Serverless Function — Model portfolio persistence via Vercel KV
 * GET  /api/models          → returns all saved models
 * POST /api/models          → saves all models (full replace)
 *
 * Uses Vercel KV (Redis-compatible key-value store).
 * Env vars injected automatically when you connect a KV database in Vercel dashboard:
 *   KV_REST_API_URL, KV_REST_API_TOKEN
 */

const MODELS_KEY = 'mp_rebalancer_models';

// Thin KV client — uses the Vercel KV REST API directly
// (avoids needing @vercel/kv package, works with plain fetch)
async function kvGet(key) {
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) return null;
  const r = await fetch(`${KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data?.result ?? null; // returns null if key doesn't exist
}

async function kvSet(key, value) {
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) throw new Error('KV not configured');
  const r = await fetch(`${KV_REST_API_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value }),
  });
  if (!r.ok) throw new Error(`KV set failed: ${r.status}`);
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: load models from KV ──────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const raw = await kvGet(MODELS_KEY);
      if (!raw) {
        // KV empty — return empty so frontend uses its built-in defaults
        return res.status(200).json({ models: null, source: 'empty' });
      }
      const models = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return res.status(200).json({ models, source: 'kv' });
    } catch (err) {
      console.error('KV GET error:', err.message);
      // Return graceful failure — frontend falls back to localStorage
      return res.status(200).json({ models: null, source: 'error', error: err.message });
    }
  }

  // ── POST: save models to KV ───────────────────────────────────────
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
      await kvSet(MODELS_KEY, JSON.stringify(models));
      return res.status(200).json({ ok: true, count: Object.keys(models).length });
    } catch (err) {
      console.error('KV POST error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
