const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '..')));

// Streaming proxy with CORS headers
app.get('/api/proxy', (req, res) => {
  const streamUrl = req.query.url;
  if (!streamUrl) return res.status(400).json({ error: 'missing url param' });

  try {
    const parsed = new URL(streamUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'invalid protocol' });
    }
  } catch {
    return res.status(400).json({ error: 'invalid url' });
  }

  function makeRequest(url, redirectCount = 0) {
    if (redirectCount > 3) {
      res.status(502).json({ error: 'too many redirects' });
      return;
    }

    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;

    const client = mod.get(url, {
      headers: { 'User-Agent': 'HauntedRadio/1.0', 'Icy-MetaData': '1' },
      timeout: 15000,
    }, (upstream) => {
      if ([301, 302, 303, 307, 308].includes(upstream.statusCode)) {
        const loc = upstream.headers.location;
        if (loc) { makeRequest(new URL(loc, url).href, redirectCount + 1); return; }
      }

      res.writeHead(upstream.statusCode || 200, {
        'Content-Type': upstream.headers['content-type'] || 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      });
      upstream.pipe(res);
      upstream.on('error', () => res.destroy());
      req.on('close', () => upstream.destroy());
    });

    client.on('error', (err) => {
      if (!res.headersSent) res.status(502).json({ error: err.message });
    });
    client.on('timeout', () => {
      client.destroy();
      if (!res.headersSent) res.status(504).json({ error: 'timeout' });
    });
  }

  makeRequest(streamUrl);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  haunted radio → http://localhost:${PORT}\n`);
});
