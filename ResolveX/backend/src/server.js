const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');
const explainRoutes = require('./routes/explain');

const app = express();
const PORT = Number(process.env.PORT || 5000);

// FRONTEND_ORIGIN was previously documented but ignored (CORS wide open).
// If set (e.g. FRONTEND_ORIGIN=https://my-site.com), restrict to it; otherwise allow all (dev default).
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || '').trim();
app.use(cors(FRONTEND_ORIGIN ? { origin: FRONTEND_ORIGIN } : {}));
app.use(express.json({ limit: '64kb' }));

// Request logging (minimal)
app.use((req, res, next) => {
  const t = new Date().toISOString();
  console.log(`[${t}] ${req.method} ${req.path}`);
  next();
});

app.get('/', (req, res) => {
  // If visited directly in a web browser, redirect to the frontend UI
  if (req.accepts('html') && !req.accepts('json')) {
    return res.redirect('http://localhost:5173/');
  }
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.redirect('http://localhost:5173/');
  }
  res.json({
    name: 'DNS Speed Comparison Tool — API',
    version: '1.0.0',
    endpoints: ['GET /api/health', 'GET /api/servers', 'POST /api/test', 'GET /api/ai-status', 'POST /api/explain'],
  });
});

app.use('/api', apiRoutes);
app.use('/api', explainRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Malformed JSON bodies otherwise fall through to Express's default HTML error page.
// Return JSON so API clients (and our frontend) get a parseable error.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  next(err);
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DNS backend listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
