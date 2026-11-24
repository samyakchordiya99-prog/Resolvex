// Optional AI explanation layer for AI DNS Detective.
//
// DESIGN: the deterministic diagnostic engine (frontend/src/detective/engine.ts)
// is the source of truth and always works with zero configuration. This service
// only *rephrases* an already-computed finding into friendlier prose using an
// operator-configured, OpenAI-compatible chat-completions endpoint.
//
// It is fully optional:
//   - No env config  -> GET /api/ai-status returns { available: false },
//                       POST /api/explain returns 503. The frontend falls back
//                       to deterministic explanations.
//   - Any failure (timeout, bad response, upstream error) -> 502 with a generic
//     error. Internal details and API keys are never exposed.
//
// Security notes:
//   - AI_API_URL/KEY come from server-side env only; user input can never set
//     the target (no user-driven SSRF). Only point them at trusted endpoints.
//   - User input (the finding) is validated, size-capped, and sent as JSON in
//     the request body. No shell, no command execution, no eval.
//   - The model is instructed to use ONLY the supplied measurements and to keep
//     evidence separate from hypotheses. Findings are never modified — the model
//     only produces an additional `explanation` string.

const MAX_ITEMS = 20;
const MAX_ITEM_CHARS = 2000;
const MAX_BODY_CHARS = 20000;

function envTimeout() {
  const n = Number(process.env.AI_TIMEOUT_MS);
  if (Number.isInteger(n) && n >= 1000 && n <= 60000) return n;
  return 15000;
}

function aiConfig() {
  const url = (process.env.AI_API_URL || '').trim();
  const key = (process.env.AI_API_KEY || '').trim();
  const model = (process.env.AI_MODEL || '').trim() || 'gpt-4o-mini';
  if (!url || !key) return null;
  return { url, key, model, timeoutMs: envTimeout() };
}

function isNonEmptyString(v, maxLen) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= maxLen;
}

function isStringArray(v) {
  return (
    Array.isArray(v) &&
    v.length <= MAX_ITEMS &&
    v.every((s) => typeof s === 'string' && s.length <= MAX_ITEM_CHARS)
  );
}

/**
 * Validate the client-supplied finding. Returns null when valid, else an error string.
 * Unknown extra fields are ignored (never forwarded).
 */
function validateExplainBody(body) {
  if (!body || typeof body !== 'object') return 'Request body must be JSON.';
  const { finding, context } = body;
  if (!finding || typeof finding !== 'object') return 'Missing "finding" object.';
  const required = ['id', 'title', 'summary', 'severity', 'category'];
  for (const k of required) {
    if (!isNonEmptyString(finding[k], 2000)) return `Finding field "${k}" must be a non-empty string.`;
  }
  for (const k of ['evidence', 'possibleCauses', 'recommendedActions', 'limitations']) {
    if (finding[k] !== undefined && !isStringArray(finding[k])) return `Finding field "${k}" must be an array of short strings.`;
  }
  if (typeof finding.confidence !== 'number' || finding.confidence < 0 || finding.confidence > 100) {
    return 'Finding field "confidence" must be a number between 0 and 100.';
  }
  if (context !== undefined) {
    if (!context || typeof context !== 'object') return '"context" must be an object.';
    if (context.domain !== undefined && !isNonEmptyString(context.domain, 253)) return '"context.domain" is invalid.';
  }
  if (JSON.stringify(body).length > MAX_BODY_CHARS) return 'Request body is too large.';
  return null;
}

function buildMessages(finding, context) {
  const system = [
    'You explain DNS diagnostic findings to a non-expert user.',
    'STRICT RULES:',
    '1. Use ONLY the measurements given below. Never invent numbers, providers, or results.',
    '2. Structure the answer with exactly these headings: "What happened", "Why we think so", "What to check next".',
    '3. Under "Why we think so", cite the actual evidence values.',
    '4. Present possible causes explicitly as hypotheses, never as facts.',
    '5. Never claim an outage, ISP fault, cyberattack, or security incident.',
    '6. Keep it under 220 words, plain friendly language, no jargon without explanation.',
  ].join('\n');
  const lines = [
    `Finding: ${finding.title} (severity: ${finding.severity}, confidence: ${finding.confidence}/100)`,
    `Summary: ${finding.summary}`,
    `Evidence: ${(finding.evidence || []).join(' | ') || 'none provided'}`,
    `Possible causes (hypotheses): ${(finding.possibleCauses || []).join(' | ') || 'none provided'}`,
    `Recommended actions: ${(finding.recommendedActions || []).join(' | ') || 'none provided'}`,
    `Limitations: ${(finding.limitations || []).join(' | ') || 'none provided'}`,
  ];
  if (context && context.domain) lines.push(`Tested domain: ${context.domain}`);
  return [
    { role: 'system', content: system },
    { role: 'user', content: lines.join('\n') },
  ];
}

async function requestExplanation(cfg, finding, context) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.2,
        max_tokens: 600,
        messages: buildMessages(finding, context),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = new Error(`upstream status ${res.status}`);
      err.code = 'AI_UPSTREAM_ERROR';
      throw err;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || text.trim().length === 0) {
      const err = new Error('empty upstream response');
      err.code = 'AI_UPSTREAM_ERROR';
      throw err;
    }
    return text.trim().slice(0, 4000);
  } catch (e) {
    if (e && e.code === 'AI_UPSTREAM_ERROR') throw e;
    const err = new Error(e && e.name === 'AbortError' ? 'ai request timed out' : 'ai request failed');
    err.code = 'AI_UPSTREAM_ERROR';
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { aiConfig, validateExplainBody, requestExplanation };
