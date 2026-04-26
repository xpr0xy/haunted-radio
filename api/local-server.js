const express = require('express');
const path = require('path');
const proxyHandler = require('./proxy');
const stationsHandler = require('./stations');

const app = express();
const PORT = Number(process.env.PORT || 3027);
const ROOT = path.join(__dirname, '..');

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/api/proxy', (req, res) => proxyHandler(req, res));
app.options('/api/proxy', (req, res) => proxyHandler(req, res));
app.get('/api/stations', (req, res) => stationsHandler(req, res));

app.use(express.static(ROOT, {
  extensions: ['html'],
}));

app.get('/', (_req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`haunted radio → http://localhost:${PORT}`);
});
