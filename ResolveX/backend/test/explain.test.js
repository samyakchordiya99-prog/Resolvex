// AI explain endpoint: optional config, validation, graceful degradation.
// Uses only local servers — no internet needed.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const app = require('../src/server');

const GOOD_FINDING = {
  id: 'timeouts-9.9.9.9',
  title: 'Quad9 is failing most queries',
  summary: 'Quad9 failed 4 of 10 queries.',
  severity: 'medium',
  category: 'timeouts',
  evidence: ['4 failed out of 10 (60.0% success).'],
  possibleCauses: ['Packet loss.'],
  recommendedActions: ['Re-run the test.'],
  limitations: ['Snapshot only.'],
  confidence: 65,
};

let server;
let base;

async function postExplain(body) {
  const res = await fetch(`${base}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json };
}

before(async () => {
  delete process.env.AI_API_URL;
  delete process.env.AI_API_KEY;
  delete process.env.AI_MODEL;
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  delete process.env.AI_API_URL;
  delete process.env.AI_API_KEY;
  delete process.env.AI_MODEL;
});

describe('ai-status / explain without configuration', () => {
  it('reports AI as unavailable without leaking config', async () => {
    const res = await fetch(`${base}/api/ai-status`);
    const json = await res.json();
    assert.equal(json.available, false);
    assert.equal(json.model, null);
    assert.ok(!('key' in json) && !('url' in json));
  });

  it('returns 503 with a fallback message when AI is not configured', async () => {
    const { status, json } = await postExplain({ finding: GOOD_FINDING });
    assert.equal(status, 503);
    assert.equal(json.code, 'AI_NOT_CONFIGURED');
    assert.ok(typeof json.error === 'string' && json.error.length > 0);
  });

  it('validates input even when unconfigured is bypassed (400 cases)', async () => {
    // Temporarily point at a dead port so we reach validation, not 503.
    process.env.AI_API_URL = 'http://127.0.0.1:1/nope';
    process.env.AI_API_KEY = 'test-key';
    const { status, json } = await postExplain({ finding: { id: 'x' } });
    assert.equal(status, 400);
    assert.ok(typeof json.error === 'string');
    const huge = await postExplain({ finding: { ...GOOD_FINDING, evidence: ['y'.repeat(50000)] } });
    assert.equal(huge.status, 400);
    delete process.env.AI_API_URL;
    delete process.env.AI_API_KEY;
  });
});

describe('explain with a (fake) AI upstream', () => {
  let fake;
  let fakeBase;

  it('returns the explanation on success and 502 when upstream dies', async () => {
    fake = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => {
        body += c;
      });
      req.on('end', () => {
        const parsed = JSON.parse(body);
        assert.ok(Array.isArray(parsed.messages));
        assert.ok(parsed.messages.some((m) => m.role === 'system'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: 'Friendly canned explanation.' } }] }));
      });
    });
    await new Promise((resolve) => fake.listen(0, '127.0.0.1', resolve));
    fakeBase = `http://127.0.0.1:${fake.address().port}/v1/chat/completions`;

    process.env.AI_API_URL = fakeBase;
    process.env.AI_API_KEY = 'test-key';
    const ok = await postExplain({ finding: GOOD_FINDING, context: { domain: 'google.com' } });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.explanation, 'Friendly canned explanation.');

    // Upstream goes away -> graceful 502, no internals leaked.
    await new Promise((resolve) => fake.close(resolve));
    const down = await postExplain({ finding: GOOD_FINDING });
    assert.equal(down.status, 502);
    assert.equal(down.json.code, 'AI_UPSTREAM_ERROR');
    assert.ok(!JSON.stringify(down.json).includes('test-key'));

    delete process.env.AI_API_URL;
    delete process.env.AI_API_KEY;
  });
});
