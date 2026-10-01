// lib/bypass.js
// -----------------------------------------------------------------------------
// Unified bypass entry point shared by the web app AND the Discord bot.
//
// By default it uses the FREE, self-hosted engine (lib/freebypass.js) which
// needs NO API key. If you *also* set IZEN_API_KEY, the paid izen.lol API is
// used as a fallback for the links the free engine cannot solve (Work.ink,
// Sub2Unlock, premium-only links, ...).
// -----------------------------------------------------------------------------

import { freeBypass, parseUrl, detectService, SUPPORTED } from './freebypass.js';

const DEFAULT_BASE = 'https://api.izen.lol';

export { parseUrl, detectService, SUPPORTED };

// --- paid izen.lol fallback (only used when IZEN_API_KEY is present) ---------

async function bypassViaIzen(url, opts = {}) {
  const u = parseUrl(url);
  const key = opts.apiKey || process.env.IZEN_API_KEY;
  const base = (opts.base || process.env.IZEN_API_BASE || DEFAULT_BASE).replace(/\/+$/, '');
  if (!key) throw Object.assign(new Error('Server is missing IZEN_API_KEY'), { status: 500 });

  const action = opts.refresh ? 'refresh' : 'bypass';
  const endpoint = `${base}/v1/${action}?url=${encodeURIComponent(u.href)}`;

  let res;
  try {
    res = await fetch(endpoint, { headers: { 'x-api-key': key, accept: 'application/json' } });
  } catch (e) {
    throw Object.assign(new Error('Could not reach bypass API: ' + e.message), { status: 502 });
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { status: 'failed', result: text || `HTTP ${res.status}` };
  }

  const ok = data.status === 'success' && typeof data.result === 'string' && data.result.length > 0;
  const okFallback = !data.status && typeof data.result === 'string' && /^https?:\/\//i.test(data.result);
  if (ok || okFallback) return { result: data.result, time: data.time, provider: 'izen.lol' };

  const msg = (typeof data.result === 'string' && data.result) || `Bypass failed (HTTP ${res.status})`;
  throw Object.assign(new Error(msg), { status: 422, code: data.code });
}

// --- public API --------------------------------------------------------------

/**
 * Bypass a link.
 * @param {string} url
 * @param {object} [opts]
 * @param {'free'|'izen'|'auto'} [opts.provider='auto']  auto = free first, izen fallback
 * @param {boolean} [opts.refresh]  (izen only) force a fresh bypass
 * @returns {Promise<{result:string, service?:string, title?:string, note?:string, provider:string, time?:string}>}
 */
export async function bypassUrl(url, opts = {}) {
  const provider = opts.provider || 'auto';
  const hasIzenKey = Boolean(opts.apiKey || process.env.IZEN_API_KEY);

  if (provider === 'izen') return bypassViaIzen(url, opts);

  // free first
  try {
    const r = await freeBypass(url);
    return { ...r, provider: 'free' };
  } catch (freeErr) {
    if (provider === 'free' || !hasIzenKey) throw freeErr;
    // auto + izen key available -> try the paid fallback
    try {
      return await bypassViaIzen(url, opts);
    } catch {
      throw freeErr; // report the more meaningful (free) error
    }
  }
}

export const FREE_ONLY = !process.env.IZEN_API_KEY;
