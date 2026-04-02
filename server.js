const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Proxy radio streams to bypass CORS
app.get('/stream', (req, res) => {
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
      headers: {
        'User-Agent': 'HauntedRadio/1.0',
        'Icy-MetaData': '1',
      },
      timeout: 10000,
    }, (upstream) => {
      if ([301, 302, 303, 307, 308].includes(upstream.statusCode)) {
        const redirectUrl = upstream.headers.location;
        if (redirectUrl) {
          const resolved = new URL(redirectUrl, url).href;
          makeRequest(resolved, redirectCount + 1);
          return;
        }
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
      console.error(`Stream proxy error: ${err.message}`);
      if (!res.headersSent) res.status(502).json({ error: 'upstream connection failed' });
    });
    client.on('timeout', () => {
      client.destroy();
      if (!res.headersSent) res.status(504).json({ error: 'upstream timeout' });
    });
  }

  makeRequest(streamUrl);
});

// Proxy radio-browser.info API
app.get('/api/stations', async (req, res) => {
  const apiUrls = [
    'https://de1.api.radio-browser.info',
    'https://nl1.api.radio-browser.info',
    'https://at1.api.radio-browser.info',
  ];

  for (const baseUrl of apiUrls) {
    try {
      const url = `${baseUrl}/json/stations/search?limit=200&order=clickcount&reverse=true&hidebroken=true&has_https_failover=true`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'HauntedRadio/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const stations = await response.json();
        return res.json(stations);
      }
    } catch (e) {
      console.error(`API ${baseUrl} failed: ${e.message}`);
      continue;
    }
  }
  res.status(502).json({ error: 'all radio api servers failed' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║     HAUNTED RADIO — now broadcasting  ║`);
  console.log(`  ║     http://localhost:${PORT}              ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});
