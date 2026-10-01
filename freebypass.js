// lib/freebypass.js
// -----------------------------------------------------------------------------
// Free, self-hosted link bypass engine (no paid API key required).
//
// Supports the services that can genuinely be resolved WITHOUT a captcha:
//   * LootLabs / Loot-Link / Loot-Dest  -> base64 "cc" parameter decode
//   * Linkvertise (+ direct-link.net, link-target.net, ...) -> GraphQL lookup
//   * AdF.ly / AdFoc.us                 -> "ysmm" XOR decode
//   * ouo.io / ouo.press                -> meta-refresh / JS redirect extract
//   * 1000+ generic shorteners          -> HTTP + HTML redirect following
//
// Anything that is captcha / social-task gated (Work.ink, Sub2Unlock, Rekonise,
// premium-only Linkvertise links, ...) CANNOT be solved for free and will be
// reported as such instead of pretending to work.
// -----------------------------------------------------------------------------

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// --- URL helpers -------------------------------------------------------------

export function parseUrl(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw Object.assign(new Error('Missing url'), { status: 400 });
  }
  let u;
  try {
    u = new URL(input.trim());
  } catch {
    throw Object.assign(new Error('Invalid URL'), { status: 400 });
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw Object.assign(new Error('Only http/https URLs are allowed'), { status: 400 });
  }
  return u;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function hostMatches(host, list) {
  return list.some((d) => host === d || host.endsWith('.' + d));
}

// --- base64 helpers ----------------------------------------------------------

function addPadding(s) {
  return s + '='.repeat((4 - (s.length % 4)) % 4);
}

function b64UrlDecode(s) {
  return Buffer.from(addPadding(s.replace(/-/g, '+').replace(/_/g, '/')), 'base64').toString('utf8');
}

function b64Decode(s) {
  return Buffer.from(addPadding(s), 'base64').toString('utf8');
}

// --- service registries ------------------------------------------------------

const LOOTLABS_HOSTS = [
  'loot-reward.com',
  'lootlabs.gg',
  'loot-link.com',
  'lootlinks.com',
  'lootdest.com',
  'loot-links.com',
  'lootlink.org',
  'links.lootlabs.gg',
  'lootlabs.com',
];

const LINKVERTISE_HOSTS = [
  'linkvertise.com',
  'linkvertise.net',
  'direct-link.net',
  'link-target.net',
  'link-center.net',
  'link-hub.net',
  'up-to-down.net',
  'file-upload.net',
  'link-to.net',
  'linkvertise.de',
];

const ADFLY_HOSTS = ['adf.ly', 'adfoc.us', 'fbcity.net', 'ay.gy', 'j.gs', 'q.gs'];

const OUO_HOSTS = ['ouo.io', 'ouo.press'];

// --- generic fetch -----------------------------------------------------------

async function fetchText(url, { headers = {}, redirect = 'follow', timeout = 20000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8', ...headers },
      redirect,
      signal: ctrl.signal,
    });
    const text = await res.text();
    return { res, text };
  } finally {
    clearTimeout(t);
  }
}

// -----------------------------------------------------------------------------
// 1) LootLabs  (base64 "cc" parameter decode)  -- works without a captcha
// -----------------------------------------------------------------------------
function decodeCc(cc) {
  cc = decodeURIComponent(cc);
  const d1 = b64UrlDecode(cc);
  const t1 = d1.trim();
  if (t1.startsWith('{') || t1.startsWith('[')) return JSON.parse(t1);
  const d2 = b64Decode(d1);
  return JSON.parse(d2);
}

export async function bypassLootlabs(url) {
  const u = new URL(url);
  let cc = u.searchParams.get('cc');

  // Some LootLabs links hide the payload in the path or a different param.
  if (!cc) {
    const m = url.match(/[?&](?:cc|data|id|r)=([^&]+)/);
    if (m) cc = m[1];
  }
  if (!cc) {
    // Follow one redirect hop to see if we land on a ?cc= URL.
    const { res } = await fetchText(url, { redirect: 'manual' });
    const loc = res.headers.get('location');
    if (loc) {
      const next = new URL(loc, url);
      cc = next.searchParams.get('cc');
    }
  }
  if (!cc) {
    throw Object.assign(new Error('This LootLabs link has no decodable "cc" payload (it may be a task-based /s? link).'), {
      status: 422,
    });
  }

  let data;
  try {
    data = decodeCc(cc);
  } catch {
    throw Object.assign(new Error('Could not decode the LootLabs payload.'), { status: 422 });
  }

  const link = data.link || data.url || data.target;
  if (!link || !/^https?:\/\//i.test(link)) {
    throw Object.assign(new Error('Decoded payload did not contain a destination link.'), { status: 422 });
  }
  return { result: link, service: 'LootLabs', title: data.title || data.name || null };
}

// -----------------------------------------------------------------------------
// 2) Linkvertise  (GraphQL linkByIdentifier)  -- returns the target host
// -----------------------------------------------------------------------------
const LV_GQL = 'https://publisher.linkvertise.com/graphql';
const LV_QUERY = `query($input: PublicLinkIdentificationInput!) {
  linkByIdentifier(linkIdentificationInput: $input) {
    id url target_type target_host title is_premium_only
  }
}`;

export async function bypassLinkvertise(url) {
  // Normalise direct-link.net / link-target.net style redirects to the
  // canonical linkvertise.com/<uid>/<hash> form first.
  let resolved = url;
  const h = hostOf(url);
  if (h !== 'linkvertise.com' && h !== 'linkvertise.net' && h !== 'linkvertise.de') {
    try {
      const { res } = await fetchText(url, { redirect: 'manual' });
      const loc = res.headers.get('location');
      if (loc) resolved = new URL(loc, url).href;
    } catch {
      /* ignore */
    }
  }

  const parsed = new URL(resolved);
  const parts = parsed.pathname.split('/').filter(Boolean);
  const userId = parts[0] === 'access' ? parts[1] : parts[0];
  const hash = parts[0] === 'access' ? parts[2] : parts[1];
  if (!userId || !hash) {
    throw Object.assign(new Error('Not a valid Linkvertise link format.'), { status: 422 });
  }

  const res = await fetch(LV_GQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': DEFAULT_UA,
      Origin: 'https://linkvertise.com',
      Referer: 'https://linkvertise.com',
    },
    body: JSON.stringify({
      query: LV_QUERY,
      variables: { input: { userIdAndUrl: { user_id: String(userId), url: String(hash) } } },
    }),
  });
  const body = await res.json();
  const data = body?.data?.linkByIdentifier;
  if (!data) {
    const msg = body?.errors?.[0]?.message || 'Linkvertise link not found.';
    throw Object.assign(new Error(msg), { status: 422 });
  }

  let dest = data.target_host || '';
  if (dest && !/^https?:\/\//i.test(dest)) dest = 'https://' + dest;

  if (!dest) {
    throw Object.assign(new Error('Linkvertise did not expose a destination for this link.'), { status: 422 });
  }

  return {
    result: dest,
    service: 'Linkvertise',
    title: data.title || null,
    note: data.is_premium_only
      ? 'This is a premium-only Linkvertise link; the full path may require the publisher app.'
      : undefined,
  };
}

// -----------------------------------------------------------------------------
// 3) AdF.ly  (ysmm XOR decode)
// -----------------------------------------------------------------------------
function decodeYsmn(ysmm) {
  let first = '';
  let second = '';
  for (let i = 0; i < ysmm.length; i++) {
    if (i % 2 === 0) first += ysmm[i];
    else second = ysmm[i] + second;
  }
  const combined = first + second;
  const chars = combined.split('');
  const key = 'ABCEDFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let i = 0; i < chars.length - 1; i++) {
    const a = key.indexOf(chars[i]);
    const b = key.indexOf(chars[i + 1]);
    if (a >= 0 && b >= 0) {
      const xor = a ^ b;
      if (xor < key.length) chars[i] = key[xor];
    }
  }
  const decoded = Buffer.from(addPadding(chars.join('').replace(/-/g, '+').replace(/_/g, '/')), 'base64').toString(
    'utf8'
  );
  return decoded.slice(16);
}

export async function bypassAdfly(url) {
  const { text } = await fetchText(url);
  const m = text.match(/var\s+ysmm\s*=\s*'([^']+)'/);
  if (m) {
    const decoded = decodeYsmn(m[1]);
    if (/^https?:\/\//i.test(decoded)) return { result: decoded, service: 'AdF.ly' };
  }
  // fall back to redirect following
  return bypassRedirect(url, 'AdF.ly');
}

// -----------------------------------------------------------------------------
// 4) ouo.io / ouo.press  (meta refresh / JS redirect)
// -----------------------------------------------------------------------------
export async function bypassOuo(url) {
  const { text } = await fetchText(url);
  let m = text.match(/window\.location\s*=\s*"([^"]+)"/);
  if (!m) m = text.match(/window\.location\.href\s*=\s*'([^']+)'/);
  if (!m) m = text.match(/<meta[^>]*url=([^"\s>]+)/i);
  if (m) {
    let final = m[1];
    if (final.startsWith('/')) {
      const base = new URL(url);
      final = `${base.protocol}//${base.host}${final}`;
    }
    if (/^https?:\/\//i.test(final)) return { result: final, service: 'ouo.io' };
  }
  return bypassRedirect(url, 'ouo.io');
}

// -----------------------------------------------------------------------------
// 5) Generic redirect follower  (works for most simple shorteners)
// -----------------------------------------------------------------------------
export async function bypassRedirect(url, service = 'Redirect') {
  // HTTP-level redirects
  const { res, text } = await fetchText(url, { redirect: 'follow' });
  if (res.url && res.url !== url && !isDeadEnd(res.url)) {
    return { result: res.url, service };
  }

  // HTML-level redirects (meta refresh / JS)
  const patterns = [
    /<meta[^>]*http-equiv=["']?refresh["']?[^>]*content=["']?\s*\d+\s*;\s*url=([^"'>\s]+)/i,
    /window\.location\.href\s*=\s*["']([^"']+)["']/i,
    /window\.location\s*=\s*["']([^"']+)["']/i,
    /location\.replace\(\s*["']([^"']+)["']\s*\)/i,
    /<meta[^>]*url=([^"'>\s]+)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      let final = m[1].replace(/&amp;/g, '&');
      if (final.startsWith('//')) final = 'https:' + final;
      else if (final.startsWith('/')) {
        const base = new URL(url);
        final = `${base.protocol}//${base.host}${final}`;
      }
      if (/^https?:\/\//i.test(final) && final !== url) {
        return { result: final, service };
      }
    }
  }

  throw Object.assign(
    new Error('Could not find a redirect target. This link likely needs a captcha or social task to unlock.'),
    { status: 422 }
  );
}

function isDeadEnd(u) {
  // ignore landing pages that just bounce back to the same shortener
  return /(linkvertise\.com\/?$|adf\.ly\/?$|ouo\.(io|press)\/?$)/i.test(u);
}

// -----------------------------------------------------------------------------
// Dispatcher
// -----------------------------------------------------------------------------
export function detectService(url) {
  const h = hostOf(url);
  if (hostMatches(h, LOOTLABS_HOSTS)) return 'lootlabs';
  if (hostMatches(h, LINKVERTISE_HOSTS)) return 'linkvertise';
  if (hostMatches(h, ADFLY_HOSTS)) return 'adfly';
  if (hostMatches(h, OUO_HOSTS)) return 'ouo';
  return 'redirect';
}

export async function freeBypass(url) {
  const u = parseUrl(url);
  const href = u.href;
  const service = detectService(href);

  switch (service) {
    case 'lootlabs':
      return bypassLootlabs(href);
    case 'linkvertise':
      return bypassLinkvertise(href);
    case 'adfly':
      return bypassAdfly(href);
    case 'ouo':
      return bypassOuo(href);
    default:
      return bypassRedirect(href, 'Redirect');
  }
}

export const SUPPORTED = {
  free: [
    'LootLabs / Loot-Link / Loot-Dest (loot-reward.com, loot-link.com, lootlabs.gg, ...)',
    'Linkvertise (linkvertise.com, direct-link.net, link-target.net, link-center.net, link-hub.net, ...)',
    'AdF.ly / AdFoc.us',
    'ouo.io / ouo.press',
    '1000+ generic URL shorteners (redirect following)',
  ],
  captchaGated: [
    'Work.ink / Workink',
    'Sub2Unlock / Sub4Unlock / SubFinal',
    'Rekonise',
    'Lockr.social',
    'Premium-only Linkvertise links (1h wait / premium task)',
    'Any link behind Cloudflare Turnstile / reCAPTCHA',
  ],
};
