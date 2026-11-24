const dns = require('dns');

/**
 * Perform a single timed DNS A-record lookup against a specific resolver IP.
 * Uses Node's dns.Resolver with setServers([ip]) so the query actually goes
 * to that provider (not just an HTTP ping of their website).
 *
 * @param {string} serverIp - resolver IP, e.g. "1.1.1.1"
 * @param {string} domain - domain to resolve, e.g. "google.com"
 * @param {number} timeoutMs - per-query timeout
 * @returns {Promise<{success:boolean, latencyMs:number|null, error:string|null}>}
 */
function timedResolve(serverIp, domain, timeoutMs) {
  return new Promise((resolve) => {
    const resolver = new dns.Resolver();
    resolver.setServers([serverIp]);

    let settled = false;
    const finish = (result) => {
      if (!settled) {
        settled = true;
        try { resolver.cancel(); } catch (_) {}
        resolve(result);
      }
    };

    const timer = setTimeout(() => {
      finish({ success: false, latencyMs: null, error: 'timeout' });
    }, timeoutMs);
    // Don't keep the process alive just for this timer
    if (typeof timer.unref === 'function') timer.unref();

    const start = process.hrtime.bigint();
    resolver.resolve4(domain, (err) => {
      const end = process.hrtime.bigint();
      clearTimeout(timer);
      const latencyMs = Number(end - start) / 1e6;
      if (err) {
        finish({ success: false, latencyMs, error: err.code || 'ENOTFOUND' });
      } else {
        finish({ success: true, latencyMs, error: null });
      }
    });
  });
}

function statsFor(latencies, totalTests) {
  const successful = latencies.filter((v) => typeof v === 'number');
  const successfulTests = successful.length;
  const failedTests = totalTests - successfulTests;
  const successRate = totalTests > 0 ? (successfulTests / totalTests) * 100 : 0;

  if (successful.length === 0) {
    return {
      average: null, minimum: null, maximum: null, median: null,
      successfulTests, failedTests, successRate,
    };
  }
  const sorted = [...successful].sort((a, b) => a - b);
  const sum = successful.reduce((a, b) => a + b, 0);
  const average = sum / successful.length;
  const minimum = sorted[0];
  const maximum = sorted[sorted.length - 1];
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
  return { average, minimum, maximum, median, successfulTests, failedTests, successRate };
}

/**
 * Test one server N times sequentially with a tiny gap (avoids hammering).
 */
async function testSingleServer(server, domain, tests, timeoutMs, onProgress) {
  const latencies = [];
  const errors = [];
  for (let i = 0; i < tests; i++) {
    // eslint-disable-next-line no-await-in-loop
    const r = await timedResolve(server.ip, domain, timeoutMs);
    latencies.push(r.success ? r.latencyMs : null);
    errors.push(r.success ? null : r.error);
    if (typeof onProgress === 'function') onProgress(i + 1, r);
    // Small pacing delay so consecutive queries don't share a warm socket unfairly
    if (i < tests - 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, 60));
    }
  }
  const stats = statsFor(latencies.filter((v) => v !== null), tests);
  // Keep nulls in latencies array so the frontend can show per-test fail marks
  return {
    name: server.name,
    ip: server.ip,
    average: stats.average,
    minimum: stats.minimum,
    maximum: stats.maximum,
    median: stats.median,
    successRate: stats.successRate,
    successfulTests: stats.successfulTests,
    failedTests: stats.failedTests,
    totalTests: tests,
    latencies,
    errors,
  };
}

/**
 * Test all servers concurrently (fair: no provider systematically waits longer).
 */
async function testAllServers(servers, domain, tests, timeoutMs) {
  const promises = servers.map((s) => testSingleServer(s, domain, tests, timeoutMs));
  const results = await Promise.all(promises);
  // Sort by average latency (nulls last)
  results.sort((a, b) => {
    if (a.average === null && b.average === null) return 0;
    if (a.average === null) return 1;
    if (b.average === null) return -1;
    return a.average - b.average;
  });
  return results;
}

module.exports = { timedResolve, testSingleServer, testAllServers, statsFor };
