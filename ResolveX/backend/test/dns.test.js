// Existing DNS functionality: stats + validation must keep working.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { statsFor } = require('../src/dns/tester');
const { isValidDomain, isValidIp, validateTestBody } = require('../src/utils/validate');

describe('statsFor', () => {
  it('computes avg/min/max/median/success-rate from successes only', () => {
    const s = statsFor([10, 20, 30, 40], 4);
    assert.equal(s.average, 25);
    assert.equal(s.minimum, 10);
    assert.equal(s.maximum, 40);
    assert.equal(s.median, 25);
    assert.equal(s.successRate, 100);
    assert.equal(s.successfulTests, 4);
    assert.equal(s.failedTests, 0);
  });

  it('returns nulls (never zeros) when everything failed', () => {
    const s = statsFor([], 3);
    assert.equal(s.average, null);
    assert.equal(s.minimum, null);
    assert.equal(s.maximum, null);
    assert.equal(s.median, null);
    assert.equal(s.successRate, 0);
    assert.equal(s.failedTests, 3);
  });

  it('computes odd-count median and partial success rate', () => {
    const s = statsFor([30, 10, 20], 5);
    assert.equal(s.average, 20);
    assert.equal(s.median, 20);
    assert.equal(s.successRate, 60);
    assert.equal(s.failedTests, 2);
  });
});

describe('validation', () => {
  it('accepts a well-formed benchmark request', () => {
    const errs = validateTestBody(
      { domain: 'google.com', servers: [{ name: 'Cloudflare', ip: '1.1.1.1' }], tests: 10, timeout: 3000 },
      30,
    );
    assert.deepEqual(errs, []);
  });

  it('rejects invalid domain, empty servers, bad counts, bad timeout, bad IP', () => {
    assert.ok(validateTestBody({ domain: 'not_a_domain', servers: [{ name: 'x', ip: '1.1.1.1' }], tests: 5 }, 30).length > 0);
    assert.ok(validateTestBody({ domain: 'google.com', servers: [], tests: 5 }, 30).length > 0);
    assert.ok(validateTestBody({ domain: 'google.com', servers: [{ name: 'x', ip: '1.1.1.1' }], tests: 99 }, 30).length > 0);
    assert.ok(
      validateTestBody({ domain: 'google.com', servers: [{ name: 'x', ip: '1.1.1.1' }], tests: 5, timeout: 50 }, 30).length > 0,
    );
    assert.ok(
      validateTestBody({ domain: 'google.com', servers: [{ name: 'x', ip: '999.1.1.1' }], tests: 5 }, 30).length > 0,
    );
    assert.ok(
      validateTestBody({ domain: 'google.com', servers: [{ name: 'x', ip: '01.02.03.04' }], tests: 5 }, 30).length > 0,
    );
  });

  it('falls back safely when the max-tests cap is garbage', () => {
    const errs = validateTestBody(
      { domain: 'google.com', servers: [{ name: 'x', ip: '1.1.1.1' }], tests: 99999 },
      NaN,
    );
    assert.ok(errs.length > 0);
  });

  it('domain/IP helpers behave', () => {
    assert.equal(isValidDomain('google.com'), true);
    assert.equal(isValidDomain('a'), false);
    assert.equal(isValidIp('8.8.8.8'), true);
    assert.equal(isValidIp('8.8.8.999'), false);
    assert.equal(isValidIp('not-an-ip'), false);
  });
});
