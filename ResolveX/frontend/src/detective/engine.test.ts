import { describe, expect, it } from 'vitest';
import type { ServerResult } from '../types';
import { buildBaselines, cvOf, diagnose, p95Of } from './engine';
import type { Baseline } from './engine';

function mkResult(over: Partial<ServerResult> & { name: string; ip: string }): ServerResult {
  const latencies = over.latencies ?? [];
  const successes = latencies.filter((v) => typeof v === 'number').length;
  const total = over.totalTests ?? Math.max(latencies.length, 1);
  return {
    average: null,
    minimum: null,
    maximum: null,
    median: null,
    successRate: 100,
    successfulTests: successes,
    failedTests: total - successes,
    totalTests: total,
    latencies,
    errors: latencies.map((v) => (v === null ? 'timeout' : null)),
    ...over,
  };
}

function okProvider(name: string, ip: string, avg: number, n = 10): ServerResult {
  // Deterministic tight cluster around avg
  const lat = Array.from({ length: n }, (_, i) => avg + ((i % 3) - 1) * 1.5);
  const sum = lat.reduce((a, b) => a + b, 0);
  const sorted = [...lat].sort((a, b) => a - b);
  return mkResult({
    name,
    ip,
    average: sum / n,
    minimum: sorted[0],
    maximum: sorted[n - 1],
    median: sorted[Math.floor(n / 2)],
    latencies: lat,
    totalTests: n,
  });
}

const NO_BASE: Baseline[] = [];

/* 1. All providers respond normally -> healthy, no invented problems */
describe('healthy run', () => {
  it('reports healthy with an evidence-based summary', () => {
    const d = diagnose({
      results: [okProvider('Cloudflare', '1.1.1.1', 18), okProvider('Google', '8.8.8.8', 22)],
      domain: 'google.com',
      testsPerServer: 10,
      timeoutMs: 3000,
      baselines: NO_BASE,
    });
    expect(d.status).toBe('healthy');
    expect(d.findings.some((f) => f.category === 'healthy')).toBe(true);
    expect(d.findings.every((f) => f.severity === 'info' || f.severity === 'low')).toBe(true);
    expect(d.findings.filter((f) => f.severity === 'high' || f.severity === 'medium')).toHaveLength(0);
  });
});

/* 2. One provider consistently slow -> high-latency finding with real numbers */
describe('high latency provider', () => {
  it('flags the slow provider, not the fast ones', () => {
    const d = diagnose({
      results: [okProvider('Cloudflare', '1.1.1.1', 18), okProvider('Google', '8.8.8.8', 95)],
      domain: 'google.com',
      testsPerServer: 10,
      timeoutMs: 3000,
      baselines: NO_BASE,
    });
    expect(d.status).toBe('attention');
    const hl = d.findings.filter((f) => f.category === 'high-latency');
    expect(hl).toHaveLength(1);
    expect(hl[0].providerIp).toBe('8.8.8.8');
    expect(hl[0].evidence.join(' ').includes('95')).toBe(true);
    expect(hl[0].confidence).toBeGreaterThanOrEqual(25);
    expect(hl[0].confidence).toBeLessThanOrEqual(92);
  });

  it('uses historical baseline when peers are also slow', () => {
    const d = diagnose({
      results: [okProvider('Cloudflare', '1.1.1.1', 90), okProvider('Google', '8.8.8.8', 95)],
      domain: 'google.com',
      testsPerServer: 10,
      timeoutMs: 3000,
      baselines: [{ ip: '1.1.1.1', runs: 3, medianAvg: 20, medianSuccessRate: 100 }],
    });
    const hl = d.findings.find((f) => f.id === 'high-latency-1.1.1.1');
    expect(hl).toBeDefined();
    expect(hl!.evidence.join(' ').includes('20')).toBe(true);
  });
});

/* 3. Repeated timeouts -> timeout finding with severity */
describe('timeouts', () => {
  it('flags repeated failures as medium/high, not on thin evidence', () => {
    const bad = mkResult({
      name: 'Quad9',
      ip: '9.9.9.9',
      average: 40,
      minimum: 30,
      maximum: 50,
      median: 40,
      successRate: 60,
      successfulTests: 6,
      failedTests: 4,
      totalTests: 10,
      latencies: [38, 42, null, 35, null, 44, 39, null, 41, null],
      errors: [null, null, 'timeout', null, 'timeout', null, null, 'timeout', null, 'ENOTFOUND'],
    });
    const d = diagnose({
      results: [okProvider('Cloudflare', '1.1.1.1', 18), bad],
      domain: 'google.com',
      testsPerServer: 10,
      timeoutMs: 3000,
      baselines: NO_BASE,
    });
    const t = d.findings.find((f) => f.category === 'timeouts' && f.providerIp === '9.9.9.9');
    expect(t).toBeDefined();
    expect(['medium', 'high']).toContain(t!.severity);
    expect(t!.evidence.join(' ')).toMatch(/4.*10|10.*4/);
  });
});

/* 4. A single failed request must not trigger an exaggerated diagnosis */
describe('single failure', () => {
  it('produces at most an informational note', () => {
    const oneFail = mkResult({
      name: 'Google',
      ip: '8.8.8.8',
      average: 22,
      minimum: 20,
      maximum: 25,
      median: 22,
      successRate: 90,
      successfulTests: 9,
      failedTests: 1,
      totalTests: 10,
      latencies: [21, 22, 23, 20, 24, 22, 21, 25, 22, null],
    });
    const d = diagnose({
      results: [okProvider('Cloudflare', '1.1.1.1', 18), oneFail],
      domain: 'google.com',
      testsPerServer: 10,
      timeoutMs: 3000,
      baselines: NO_BASE,
    });
    expect(d.status).not.toBe('attention');
    const sevs = d.findings.filter((f) => f.providerIp === '8.8.8.8').map((f) => f.severity);
    expect(sevs.every((s) => s === 'info' || s === 'low')).toBe(true);
  });
});

/* 5. Multiple providers degraded -> network-wide, no ISP blame */
describe('network-wide degradation', () => {
  it('reports a shared issue without blaming the ISP', () => {
    const d = diagnose({
      results: [okProvider('Cloudflare', '1.1.1.1', 320), okProvider('Google', '8.8.8.8', 410)],
      domain: 'google.com',
      testsPerServer: 10,
      timeoutMs: 3000,
      baselines: NO_BASE,
    });
    const nw = d.findings.find((f) => f.category === 'network-wide');
    expect(nw).toBeDefined();
    const text = [nw!.summary, ...nw!.evidence, ...nw!.possibleCauses, ...nw!.limitations].join(' ').toLowerCase();
    expect(text).not.toMatch(/isp (is|at) fault|isp outage|blame.*isp/);
    expect(nw!.limitations.join(' ').toLowerCase()).toMatch(/isp/);
  });

  it('never emits an empty evidence list when only the baseline rule fires', () => {
    // Both providers regress vs their OWN baseline but stay under the coarse
    // absolute bar (150 ms / 90% success), so `degraded` is empty. Evidence must
    // still be populated (regression: it used to render an empty list).
    const d = diagnose({
      results: [okProvider('Cloudflare', '1.1.1.1', 16), okProvider('Google', '8.8.8.8', 18)],
      domain: 'google.com',
      testsPerServer: 10,
      timeoutMs: 3000,
      baselines: [
        { ip: '1.1.1.1', runs: 3, medianAvg: 10, medianSuccessRate: 100 },
        { ip: '8.8.8.8', runs: 3, medianAvg: 10, medianSuccessRate: 100 },
      ],
    });
    const nw = d.findings.find((f) => f.category === 'network-wide');
    expect(nw).toBeDefined();
    expect(nw!.evidence.length).toBeGreaterThan(0);
    expect(nw!.evidence.join(' ')).toMatch(/baseline/i);
    expect(JSON.stringify(nw)).not.toMatch(/NaN/);
  });
});

/* 6. No baseline -> explicit about it, single provider inconclusive */
describe('missing baseline', () => {
  it('says comparison is impossible with one provider and no history', () => {
    const d = diagnose({
      results: [okProvider('Cloudflare', '1.1.1.1', 18, 5)],
      domain: 'google.com',
      testsPerServer: 5,
      timeoutMs: 3000,
      baselines: NO_BASE,
    });
    expect(d.status).not.toBe('attention');
    expect(d.findings.some((f) => f.id === 'insufficient-data-nobaseline')).toBe(true);
  });
});

/* 7. Tiny sample sizes -> no latency verdicts, but real failures still count */
describe('small samples', () => {
  it('refuses latency judgments with < 3 successes but still reports 80% failures', () => {
    const thin = mkResult({
      name: 'Quad9',
      ip: '9.9.9.9',
      average: 500,
      minimum: 500,
      maximum: 500,
      median: 500,
      successRate: 20,
      successfulTests: 1,
      failedTests: 4,
      totalTests: 5,
      latencies: [500, null, null, null, null],
    });
    const d = diagnose({
      results: [thin],
      domain: 'google.com',
      testsPerServer: 5,
      timeoutMs: 3000,
      baselines: NO_BASE,
    });
    // 4 of 5 queries failing IS evidence of a problem (timeouts), while a
    // 500 ms average from a single sample must NOT become a latency verdict.
    expect(d.findings.some((f) => f.category === 'high-latency')).toBe(false);
    expect(d.findings.some((f) => f.category === 'timeouts' && f.providerIp === '9.9.9.9')).toBe(true);
    expect(d.findings.some((f) => f.category === 'insufficient-data')).toBe(true);
    expect(d.status).toBe('attention');
  });
});

/* 8. Invalid / missing values are handled, never crash */
describe('invalid measurements', () => {
  it('ignores NaN latencies and empty input gracefully', () => {
    const weird = mkResult({
      name: 'X',
      ip: '1.2.3.4',
      average: Number.NaN,
      minimum: null,
      maximum: null,
      median: null,
      successRate: 0,
      successfulTests: 0,
      failedTests: 3,
      totalTests: 3,
      latencies: [null, null, null],
    });
    const d = diagnose({ results: [weird], domain: 'google.com', testsPerServer: 3, timeoutMs: 3000, baselines: NO_BASE });
    // 3/3 failures is genuine evidence (timeouts), while NaN must never leak into output.
    expect(d.status).toBe('attention');
    expect(d.findings.some((f) => f.category === 'timeouts')).toBe(true);
    expect(JSON.stringify(d)).not.toMatch(/NaN/);
    expect(() => diagnose({ results: [], domain: 'x.com', testsPerServer: 10, timeoutMs: 3000, baselines: [] })).not.toThrow();
  });

  it('buildBaselines ignores other domains and malformed entries', () => {
    const b = buildBaselines(
      [
        { domain: 'google.com', results: [{ ip: '1.1.1.1', average: 20, successRate: 100 }] },
        { domain: 'other.com', results: [{ ip: '1.1.1.1', average: 999, successRate: 0 }] },
        { domain: 'google.com', results: [{ ip: '1.1.1.1', average: Number.NaN, successRate: 100 }] },
      ],
      'google.com',
    );
    expect(b).toHaveLength(1);
    expect(b[0].medianAvg).toBe(20);
  });
});

/* instability + outlier + helpers */
describe('instability and helpers', () => {
  it('detects wide spread with enough samples', () => {
    const spread = [15, 16, 14, 200, 15, 210, 16, 14, 205, 15];
    const d = diagnose({
      results: [
        okProvider('Cloudflare', '1.1.1.1', 18),
        mkResult({
          name: 'Wobbly',
          ip: '2.2.2.2',
          average: 92,
          minimum: 14,
          maximum: 210,
          median: 15.5,
          successRate: 100,
          successfulTests: 10,
          failedTests: 0,
          totalTests: 10,
          latencies: spread,
        }),
      ],
      domain: 'google.com',
      testsPerServer: 10,
      timeoutMs: 3000,
      baselines: NO_BASE,
    });
    expect(d.findings.some((f) => f.category === 'instability' && f.providerIp === '2.2.2.2')).toBe(true);
  });

  it('p95 needs >= 5 samples; cv needs >= 2', () => {
    expect(p95Of([1, 2, 3, 4])).toBe(null);
    expect(p95Of([1, 2, 3, 4, 5])).toBe(5);
    expect(cvOf([10])).toBe(null);
    expect(cvOf([10, 10, 10, 10, 10])).toBeCloseTo(0);
  });

  it('outlier finding does not duplicate a high-latency finding', () => {
    // 45 vs peers [20, 22]: peer rule needs >= 2x21=42 AND gap >= 25 (gap is 24) -> no
    // high-latency; outlier rule needs >= 2x20=40 AND gap >= 20 (gap is 25) -> fires.
    const d = diagnose({
      results: [okProvider('A', '1.1.1.1', 20), okProvider('B', '8.8.8.8', 22), okProvider('C', '9.9.9.9', 45)],
      domain: 'google.com',
      testsPerServer: 10,
      timeoutMs: 3000,
      baselines: NO_BASE,
    });
    expect(d.findings.some((f) => f.category === 'provider-outlier' && f.providerIp === '9.9.9.9')).toBe(true);
    expect(d.findings.some((f) => f.category === 'high-latency' && f.providerIp === '9.9.9.9')).toBe(false);
  });
});
