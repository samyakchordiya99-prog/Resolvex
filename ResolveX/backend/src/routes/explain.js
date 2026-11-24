const express = require('express');
const { validateExplainBody, requestExplanation, aiConfig } = require('../services/aiExplain');

const router = express.Router();

// GET /api/ai-status — does the server have an AI provider configured?
// Never exposes the key or URL.
router.get('/ai-status', (req, res) => {
  const cfg = aiConfig();
  res.json({ available: cfg !== null, model: cfg ? cfg.model : null });
});

// POST /api/explain — turn one structured finding into friendlier prose.
// Body: { finding: {...}, context: { domain?, testsPerServer?, timeoutMs? } }
router.post('/explain', async (req, res) => {
  const cfg = aiConfig();
  if (!cfg) {
    return res.status(503).json({
      error: 'AI explanations are not configured on this server. Deterministic analysis is still available.',
      code: 'AI_NOT_CONFIGURED',
    });
  }
  const validationError = validateExplainBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  try {
    const explanation = await requestExplanation(cfg, req.body.finding, req.body.context);
    return res.json({ explanation });
  } catch (err) {
    console.error('AI explain failed:', err && err.message ? err.message : err);
    return res.status(502).json({
      error: 'The AI service is temporarily unavailable. Please use the built-in analysis.',
      code: 'AI_UPSTREAM_ERROR',
    });
  }
});

module.exports = router;
