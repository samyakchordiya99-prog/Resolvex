const express = require('express');
const { testAllServers } = require('../dns/tester');
const { DEFAULT_SERVERS } = require('../dns/servers');
const { validateTestBody } = require('../utils/validate');

const router = express.Router();

// Sanitize env config: garbage values (e.g. "abc") must fall back to safe defaults.
// Without this, Number("abc") = NaN and comparisons like `n > NaN` are always false,
// which would disable the upper-bound check entirely.
/** @param {string|undefined} raw @param {number} fallback @param {number} min @param {number} max */
function envInt(raw, fallback, min, max) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
}

const MAX_TESTS = envInt(process.env.MAX_TESTS_PER_SERVER, 30, 1, 100);
const DEFAULT_TIMEOUT = envInt(process.env.DEFAULT_TIMEOUT_MS, 3000, 500, 10000);

// GET /api/servers — catalogue for the frontend
router.get('/servers', (req, res) => {
  res.json({ servers: DEFAULT_SERVERS });
});

// GET /api/health
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// POST /api/test — run real DNS measurements
// Body: { domain, servers:[{name, ip}], tests, timeout }
router.post('/test', async (req, res) => {
  const errors = validateTestBody(req.body, MAX_TESTS);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  const domain = req.body.domain.trim().toLowerCase();
  const servers = req.body.servers.map((s) => ({ name: String(s.name).trim(), ip: String(s.ip).trim() }));
  const tests = Number(req.body.tests);
  const timeout = req.body.timeout !== undefined ? Number(req.body.timeout) : DEFAULT_TIMEOUT;

  try {
    const startedAt = new Date().toISOString();
    const results = await testAllServers(servers, domain, tests, timeout);
    return res.json({
      domain,
      testsPerServer: tests,
      timeoutMs: timeout,
      startedAt,
      results,
    });
  } catch (err) {
    console.error('DNS test failed:', err);
    return res.status(500).json({ error: 'DNS test failed due to an internal error. Please try again.' });
  }
});

module.exports = router;
