const http = require('http');
const https = require('https');

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const PASS_HEADERS = ['content-type', 'icy-name', 'icy-description', 'icy-genre', 'icy-br', 'icy-url', 'accept-ranges'];

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
}

function fail(res, status, message) {
  applyCors(res);
  res.status(status).json({ error: message });
}

function proxyRequest({ req, res, target, redirects = 0 }) {
  if (redirects > 4) return fail(res, 508, 'too many redirects');

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return fail(res, 400, 'invalid url');
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return fail(res, 400, 'unsupported protocol');
  }

  const client = parsed.protocol === 'https:' ? https : http;
  const upstream = client.request(parsed, {
    method: req.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: {
      'User-Agent': 'HauntedRadio/2.0 (+https://github.com/xpr0xy/haunted-radio)',
      'Icy-MetaData': '1',
      'Accept': '*/*',
      ...(req.headers.range ? { Range: req.headers.range } : {}),
    },
    timeout: 15000,
  }, (upstreamRes) => {
    const code = upstreamRes.statusCode || 502;
    if ([301, 302, 303, 307, 308].includes(code) && upstreamRes.headers.location) {
      upstreamRes.resume();
      return proxyRequest({ req, res, target: new URL(upstreamRes.headers.location, parsed).href, redirects: redirects + 1 });
    }

    applyCors(res);
    res.status(code);

    for (const header of PASS_HEADERS) {
      const value = upstreamRes.headers[header];
      if (value) res.setHeader(header, value);
    }

    if (!res.getHeader('content-type')) {
      res.setHeader('content-type', 'audio/mpeg');
    }

    if (req.method === 'HEAD') {
      upstreamRes.resume();
      return res.end();
    }

    upstreamRes.pipe(res);
    upstreamRes.on('error', () => res.destroy());
    req.on('close', () => upstreamRes.destroy());
  });

  upstream.on('timeout', () => {
    upstream.destroy(new Error('upstream timeout'));
  });

  upstream.on('error', (error) => {
    if (!res.headersSent) {
      fail(res, 502, error.message || 'upstream request failed');
    } else {
      res.destroy(error);
    }
  });

  upstream.end();
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    applyCors(res);
    return res.status(204).end();
  }

  const target = req.query.url;
  if (!target || typeof target !== 'string') {
    return fail(res, 400, 'missing ?url= param');
  }

  return proxyRequest({ req, res, target });
};
