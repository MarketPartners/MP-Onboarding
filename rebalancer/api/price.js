/**
 * Vercel Serverless Function — Yahoo Finance price proxy
 * Route: /api/price?symbols=CBA.AX,MSFT,BHP.AX
 * 
 * Handles Yahoo's cookie + crumb auth server-side so the browser doesn't need to.
 * Returns: { prices: { "CBA.AX": { price, change, changePct, currency }, ... } }
 */

const YAHOO_CRUMB_URL = 'https://query2.finance.yahoo.com/v1/test/getcrumb';
const YAHOO_QUOTE_URL = 'https://query2.finance.yahoo.com/v7/finance/quote';
const YAHOO_CONSENT_URL = 'https://consent.yahoo.com/v2/collectConsent';

// Cache crumb for up to 50 minutes (Vercel functions are warm for ~5 min,
// but in practice a fresh crumb is fetched per cold start which is fine)
let cachedCrumb = null;
let cachedCookie = null;
let crumbFetchedAt = 0;
const CRUMB_TTL_MS = 50 * 60 * 1000;

async function getYahooCrumb() {
  const now = Date.now();
  if (cachedCrumb && cachedCookie && (now - crumbFetchedAt) < CRUMB_TTL_MS) {
    return { crumb: cachedCrumb, cookie: cachedCookie };
  }

  // Step 1: Hit Yahoo Finance homepage to get session cookies
  const homeResp = await fetch('https://finance.yahoo.com/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
  });

  // Extract Set-Cookie headers
  const cookieHeader = homeResp.headers.get('set-cookie') || '';
  // Parse out key cookies (A1, A3, GUC, cmp)
  const cookies = [];
  const rawCookies = cookieHeader.split(/,(?=[^ ])/);
  for (const rc of rawCookies) {
    const part = rc.split(';')[0].trim();
    if (part) cookies.push(part);
  }
  const cookieStr = cookies.join('; ');

  // Step 2: Fetch the crumb using those cookies
  const crumbResp = await fetch(YAHOO_CRUMB_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookieStr,
      'Accept': 'text/plain',
    },
  });

  if (!crumbResp.ok) {
    // Fallback: try the EU consent flow
    const consentResp = await fetch(YAHOO_CONSENT_URL + '?brandType=nonEu&lang=en-US&inline=false', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookieStr },
    });
    const consentCookies = consentResp.headers.get('set-cookie') || '';
    const merged = cookieStr + '; ' + consentCookies.split(';')[0];

    const crumb2 = await fetch(YAHOO_CRUMB_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': merged },
    });
    if (!crumb2.ok) throw new Error('Could not obtain Yahoo crumb after consent flow');
    cachedCrumb = (await crumb2.text()).trim();
    cachedCookie = merged;
  } else {
    cachedCrumb = (await crumbResp.text()).trim();
    cachedCookie = cookieStr;
  }

  crumbFetchedAt = now;
  return { crumb: cachedCrumb, cookie: cachedCookie };
}

async function fetchQuotes(symbols, crumb, cookie) {
  const symbolStr = symbols.join(',');
  const url = `${YAHOO_QUOTE_URL}?symbols=${encodeURIComponent(symbolStr)}&crumb=${encodeURIComponent(crumb)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,currency,previousClose,regularMarketPreviousClose`;

  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookie,
      'Accept': 'application/json',
    },
  });

  if (!resp.ok) throw new Error(`Yahoo quote fetch failed: ${resp.status}`);
  const data = await resp.json();
  return data?.quoteResponse?.result || [];
}

export default async function handler(req, res) {
  // CORS headers — allows your Vercel domain (and localhost for dev)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600'); // Cache 5 min at edge

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: 'symbols param required. e.g. ?symbols=CBA.AX,MSFT' });

  const symbolList = symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  if (symbolList.length === 0) return res.status(400).json({ error: 'No valid symbols' });
  if (symbolList.length > 50) return res.status(400).json({ error: 'Max 50 symbols per request' });

  try {
    const { crumb, cookie } = await getYahooCrumb();
    const quotes = await fetchQuotes(symbolList, crumb, cookie);

    const prices = {};
    for (const q of quotes) {
      prices[q.symbol] = {
        price: q.regularMarketPrice ?? q.previousClose ?? null,
        change: q.regularMarketChange ?? 0,
        changePct: q.regularMarketChangePercent ?? 0,
        currency: q.currency ?? 'AUD',
        previousClose: q.regularMarketPreviousClose ?? q.previousClose ?? null,
        fetchedAt: new Date().toISOString(),
      };
    }

    // Flag any symbols that came back missing
    const missing = symbolList.filter(s => !prices[s]);

    return res.status(200).json({
      prices,
      missing,
      fetchedAt: new Date().toISOString(),
      symbolCount: Object.keys(prices).length,
    });

  } catch (err) {
    console.error('Price fetch error:', err.message);
    // Return partial success with error info — don't crash the whole tool
    return res.status(500).json({
      error: err.message,
      prices: {},
      missing: symbolList,
    });
  }
}
