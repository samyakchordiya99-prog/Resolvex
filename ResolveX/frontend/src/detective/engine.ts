import type { ServerResult } from '../types';

/* ============================================================================
 * AI DNS Detective — deterministic diagnostic engine.
 *
 * Analyses REAL benchmark measurements (never invented) and produces
 * evidence-based findings. There is no ML model here: every finding is produced
 * by explicit, documented detection rules below.
 *
 * Design principles
 *  - Relative comparison first: providers are judged against peers tested under
 *    the SAME conditions (same domain, test count, timeout) and against their
 *    OWN historical baseline — not against arbitrary universal thresholds.
 *  - The single absolute threshold in this file (NETWORK_WIDE_ABS_MS) is a
 *    deliberately coarse fallback used ONLY when peer/baseline comparison is
 *    impossible, and any finding that relies on it gets capped confidence and
 *    an explicit limitation note.
 *  - Measured facts (evidence) are strictly separated from hypotheses
 *    (possibleCauses) and from advice (recommendedActions).
 *  - We never claim outages, ISP faults, attacks, or security incidents.
 *  - One failed query never produces more than an informational note.
 * ========================================================================== */

export type Severity = 'info' | 'low' | 'medium' | 'high';
export type OverallStatus = 'healthy' | 'attention' | 'inconclusive';

export interface FindingMetrics {
  average: number | null;
  median: number | null;
  minimum: number | null;
  maximum: number | null;
  p95: number | null;
  cv: number | null;
  successes: number;
  failures: number;
  successRate: number;
  baselineAvg: number | null;
  peerMedianAvg: number | null;
}

export interface Finding {
  id: string;
  severity: Severity;
  category:
    | 'high-latency'
    | 'timeouts'
    | 'instability'
    | 'provider-outlier'
    | 'network-wide'
    | 'insufficient-data'
    | 'healthy';
  title: string;
  summary: string;
  evidence: string[];
  possibleCauses: string[];
  recommendedActions: string[];
  /** 0–100. See confidence rationale in limitations/confidenceLabel. */
  confidence: number;
  confidenceLabel: 'Low' | 'Medium' | 'High';
  limitations: string[];
  providerIp?: string;
  providerName?: string;
  metrics?: FindingMetrics;
}

export interface Baseline {
  ip: string;
  runs: number;
  medianAvg: number | null;
  medianSuccessRate: number;
}

export interface DiagnosisInput {
  results: ServerResult[];
  domain: string;
  testsPerServer: number;
  timeoutMs: number;
  baselines: Baseline[];
}

export interface Diagnosis {
  status: OverallStatus;
  summary: string;
  domain: string;
  testedProviders: number;
  totalQueries: number;
  successfulQueries: number;
  findings: Finding[];
}

/* ------------------------------- thresholds ------------------------------ */

/** Minimum successful queries before judging a provider's latency. */
const MIN_SUCCESS_FOR_LATENCY = 3;
/** Minimum successful queries before judging stability (P95/CV need samples). */
const MIN_SAMPLES_STABILITY = 5;
/** Peer rule: avg >= PEER_FACTOR × peer-median AND gap >= PEER_GAP_MS. */
const PEER_FACTOR = 2;
const PEER_GAP_MS = 25;
/** Baseline rule: avg >= BASELINE_FACTOR × own baseline AND gap >= BASELINE_GAP_MS. */
const BASELINE_FACTOR = 1.5;
const BASELINE_GAP_MS = 15;
/** Outlier rule (single provider far worse than the best peer). */
const OUTLIER_FACTOR = 2;
const OUTLIER_GAP_MS = 20;
/** Instability: coefficient of variation above this, or P95 far above median. */
const CV_THRESHOLD = 0.6;
const P95_FACTOR = 2.5;
/**
 * Coarse absolute fallback (ms) used ONLY for the network-wide check when
 * several providers degrade together and peer comparison is meaningless.
 * Findings relying on it are confidence-capped — see capConfidenceAbsolute().
 */
const NETWORK_WIDE_ABS_MS = 150;
const NETWORK_WIDE_SUCCESS = 90;

/* --------------------------------- helpers -------------------------------- */

function round1(v: number | null): string {
  return v === null || v === undefined || Number.isNaN(v) ? 'n/a' : `${v.toFixed(1)} ms`;
}

function successesOf(r: ServerResult): number[] {
  return r.latencies.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
}

/** Coerce any non-finite/absent measurement to null so "NaN ms" can never reach the UI. */
function finiteOrNull(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/** Nearest-rank P95; null when fewer than MIN_SAMPLES_STABILITY samples. */
export function p95Of(values: number[]): number | null {
  if (values.length < MIN_SAMPLES_STABILITY) return null;
  const s = [...values].sort((a, b) => a - b);
  const rank = Math.min(s.length, Math.max(1, Math.ceil(0.95 * s.length)));
  return s[rank - 1];
}

/** Coefficient of variation (stdev / mean); null when undefined or < 2 samples. */
export function cvOf(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return null;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function confidenceLabelFor(c: number): Finding['confidenceLabel'] {
  if (c >= 70) return 'High';
  if (c >= 45) return 'Medium';
  return 'Low';
}

/**
 * Confidence model (documented):
 *   start at 50 → +10 for >= 10 successful samples → +10 when a historical
 *   baseline exists and agrees → +0..15 scaled by effect size → −15 when
 *   samples are thin (< 5). Clamped to 25..92 (never 100: DNS is noisy).
 */
function buildConfidence(opts: { n: number; baselineAgrees: boolean; effect01: number }): number {
  let c = 50;
  if (opts.n >= 10) c += 10;
  if (opts.baselineAgrees) c += 10;
  c += Math.round(Math.max(0, Math.min(1, opts.effect01)) * 15);
  if (opts.n < 5) c -= 15;
  return Math.max(25, Math.min(92, c));
}

function withConfidence(f: Omit<Finding, 'confidence' | 'confidenceLabel'>, confidence: number): Finding {
  return { ...f, confidence, confidenceLabel: confidenceLabelFor(confidence) };
}

function metricsFor(r: ServerResult, baseline: Baseline | undefined, peerMedianAvg: number | null): FindingMetrics {
  const s = successesOf(r);
  return {
    average: finiteOrNull(r.average),
    median: finiteOrNull(r.median),
    minimum: finiteOrNull(r.minimum),
    maximum: finiteOrNull(r.maximum),
    p95: p95Of(s),
    cv: cvOf(s),
    successes: r.successfulTests,
    failures: r.failedTests,
    successRate: Number.isFinite(r.successRate) ? r.successRate : 0,
    baselineAvg: finiteOrNull(baseline?.medianAvg),
    peerMedianAvg: finiteOrNull(peerMedianAvg),
  };
}

const CACHE_NOTE =
  'Repeated queries can benefit from caching (by the resolver or OS), which may understate true latency.';
const VARIABILITY_NOTE =
  'DNS latency varies with routing, server load, and time of day — a single run is a snapshot, not a verdict.';

/* --------------------------------- engine --------------------------------- */

export function diagnose(input: DiagnosisInput): Diagnosis {
  const { results, domain, testsPerServer, timeoutMs, baselines } = input;
  const findings: Finding[] = [];

  const totalQueries = results.reduce((a, r) => a + r.totalTests, 0);
  const successfulQueries = results.reduce((a, r) => a + r.successfulTests, 0);

  if (results.length === 0) {
    return {
      status: 'inconclusive',
      summary: 'No benchmark results were provided, so nothing could be analysed.',
      domain,
      testedProviders: 0,
      totalQueries: 0,
      successfulQueries: 0,
      findings: [
        withConfidence(
          {
            id: 'insufficient-data-empty',
            severity: 'low',
            category: 'insufficient-data',
            title: 'No measurements to analyse',
            summary: 'Run a DNS benchmark first, then open AI DNS Detective again.',
            evidence: ['The diagnostic engine received zero provider results.'],
            possibleCauses: [],
            recommendedActions: ['Select at least one DNS server and click Start Test.'],
            limitations: ['Without measurements no diagnosis is possible.'],
          },
          40,
        ),
      ],
    };
  }

  const baselineByIp = new Map(baselines.map((b) => [b.ip, b]));

  // Peer reference EXCLUDES the provider itself: including it would let one
  // very slow provider drag the median up and hide its own anomaly
  // (e.g. averages 18 vs 95 ms give a median of 56.5, masking the 5× gap).
  const othersAvgs = (selfIp: string): number[] =>
    results
      .filter((r) => r.ip !== selfIp && typeof r.average === 'number' && !Number.isNaN(r.average))
      .map((r) => r.average as number);
  const peerMedianExcluding = (selfIp: string): number | null => medianOf(othersAvgs(selfIp));
  const bestPeerExcluding = (selfIp: string): number | null => {
    const o = othersAvgs(selfIp);
    return o.length > 0 ? Math.min(...o) : null;
  };

  const thinProviders: string[] = [];
  const highLatencyIps = new Set<string>();

  for (const r of results) {
    const s = successesOf(r);
    const baseline = baselineByIp.get(r.ip);
    const peerMedianAvg = peerMedianExcluding(r.ip);
    const bestPeerAvg = bestPeerExcluding(r.ip);

    /* ---- C. timeouts & failures ---- */
    if (r.failedTests > 0) {
      if (r.failedTests === 1) {
        // Rule: a single failed query is never more than informational.
        findings.push(
          withConfidence(
            {
              id: `isolated-failure-${r.ip}`,
              severity: 'info',
              category: 'timeouts',
              title: `One isolated query failed for ${r.name}`,
              summary: `${r.name} answered ${r.successfulTests} of ${r.totalTests} queries; a single failure is within normal network noise and is not evidence of a provider problem.`,
              evidence: [
                `${r.failedTests} failed query out of ${r.totalTests} (${r.successRate.toFixed(1)}% success rate).`,
                `Failure reason recorded: ${r.errors?.find((e) => e !== null) ?? 'unknown'}. Per-query timeout was ${timeoutMs} ms.`,
              ],
              possibleCauses: ['Transient packet loss.', 'A momentary resolver hiccup.', 'A brief local network stall.'],
              recommendedActions: [
                'Re-run the benchmark — if the failure does not repeat, ignore it.',
                'If single failures repeat across runs, raise the timeout to 5000 ms and test again.',
              ],
              limitations: ['One sample cannot distinguish a provider fault from random noise.'],
              providerIp: r.ip,
              providerName: r.name,
              metrics: metricsFor(r, baseline, peerMedianAvg),
            },
            buildConfidence({ n: s.length, baselineAgrees: false, effect01: 0 }),
          ),
        );
      } else if (r.successRate < 70) {
        findings.push(
          withConfidence(
            {
              id: `timeouts-${r.ip}`,
              severity: 'high',
              category: 'timeouts',
              title: `${r.name} is failing most queries`,
              summary: `${r.name} failed ${r.failedTests} of ${r.totalTests} queries (${r.successRate.toFixed(1)}% success). This points to a reachability or severe degradation problem, not normal noise.`,
              evidence: [
                `${r.successfulTests} successful vs ${r.failedTests} failed out of ${r.totalTests} queries.`,
                `Success rate ${r.successRate.toFixed(1)}% with a per-query timeout of ${timeoutMs} ms.`,
                `Failure reasons observed: ${uniqueErrors(r)}.`,
              ],
              possibleCauses: [
                'Outbound DNS (UDP/TCP port 53) to this provider is blocked or filtered on this network.',
                'The resolver endpoint is unreachable from the backend host.',
                'Severe congestion causing responses to arrive after the timeout.',
              ],
              recommendedActions: [
                `Verify the backend host can reach ${r.ip} (e.g. resolve a domain directly against it).`,
                'Check local firewall rules for outbound port 53.',
                'Re-run with a longer timeout (5000–8000 ms) to separate slowness from true failure.',
              ],
              limitations: [VARIABILITY_NOTE, 'Failures are measured from the backend host, not necessarily from your device.'],
              providerIp: r.ip,
              providerName: r.name,
              metrics: metricsFor(r, baseline, peerMedianAvg),
            },
            buildConfidence({ n: s.length, baselineAgrees: (baseline?.medianSuccessRate ?? 100) >= 95, effect01: 1 - r.successRate / 100 }),
          ),
        );
      } else {
        findings.push(
          withConfidence(
            {
              id: `timeouts-${r.ip}`,
              severity: r.successRate < 95 ? 'medium' : 'low',
              category: 'timeouts',
              title: `${r.name} shows repeated query failures`,
              summary: `${r.name} failed ${r.failedTests} of ${r.totalTests} queries (${r.successRate.toFixed(1)}% success). Repeated failures merit attention even though most queries succeed.`,
              evidence: [
                `${r.successfulTests} successful vs ${r.failedTests} failed out of ${r.totalTests} queries.`,
                `Per-query timeout was ${timeoutMs} ms; failure reasons observed: ${uniqueErrors(r)}.`,
              ],
              possibleCauses: [
                'Intermittent packet loss toward this provider.',
                'The provider occasionally responding slower than the timeout.',
                'Rate limiting or load shedding under load.',
              ],
              recommendedActions: [
                'Re-run the test to see whether failures persist.',
                'Try a longer timeout to separate slow responses from true failures.',
                `Compare against the other providers tested in the same run (${testsPerServer} queries each).`,
              ],
              limitations: [VARIABILITY_NOTE, CACHE_NOTE],
              providerIp: r.ip,
              providerName: r.name,
              metrics: metricsFor(r, baseline, peerMedianAvg),
            },
            buildConfidence({ n: s.length, baselineAgrees: (baseline?.medianSuccessRate ?? 100) >= 95, effect01: (100 - r.successRate) / 100 }),
          ),
        );
      }
    }

    /* ---- latency judgments need enough successful samples ---- */
    if (s.length < MIN_SUCCESS_FOR_LATENCY) {
      thinProviders.push(`${r.name} (${s.length} successful of ${r.totalTests})`);
      continue;
    }

    /* ---- A. high latency: peer rule OR own-baseline rule ---- */
    const avg = r.average as number;
    const peerHit = peerMedianAvg !== null && avg >= PEER_FACTOR * peerMedianAvg && avg - peerMedianAvg >= PEER_GAP_MS;
    const baseHit =
      baseline?.medianAvg !== null &&
      baseline?.medianAvg !== undefined &&
      avg >= BASELINE_FACTOR * (baseline.medianAvg as number) &&
      avg - (baseline.medianAvg as number) >= BASELINE_GAP_MS;
    if (peerHit || baseHit) {
      highLatencyIps.add(r.ip);
      const evidence = [
        `Average latency ${avg.toFixed(1)} ms over ${s.length} successful queries (median ${round1(r.median)}).`,
      ];
      if (peerHit) evidence.push(`Peers tested under identical conditions have a median average of ${peerMedianAvg!.toFixed(1)} ms — this provider is ~${(avg / peerMedianAvg!).toFixed(1)}× higher.`);
      if (baseHit) evidence.push(`Its own historical baseline is ${baseline!.medianAvg!.toFixed(1)} ms across ${baseline!.runs} prior run(s) — currently ~${(avg / baseline!.medianAvg!).toFixed(1)}× higher.`);
      findings.push(
        withConfidence(
          {
            id: `high-latency-${r.ip}`,
            severity: avg >= 3 * (peerMedianAvg ?? avg) || r.successRate < 90 ? 'high' : 'medium',
            category: 'high-latency',
            title: `${r.name} shows unusually high latency`,
            summary: `${r.name} responds far slower than ${baseHit ? 'its own history' : ''}${baseHit && peerHit ? ' and ' : ''}${peerHit ? 'the other providers tested alongside it' : ''}. The gap is large enough to rule out ordinary jitter.`,
            evidence,
            possibleCauses: [
              'Longer or congested network path from the test host to this provider.',
              'The provider endpoint under heavier load than usual.',
              'DNS filtering/forwarding in the middle adding extra hops.',
            ],
            recommendedActions: [
              'Re-run the benchmark to confirm the gap persists.',
              'Test a different domain to rule out name-specific caching effects.',
              'Prefer the fastest provider from this run for latency-sensitive browsing.',
            ],
            limitations: [VARIABILITY_NOTE, CACHE_NOTE, 'Compared under the same run conditions; results can still shift over time.'],
            providerIp: r.ip,
            providerName: r.name,
            metrics: metricsFor(r, baseline, peerMedianAvg),
          },
          buildConfidence({
            n: s.length,
            baselineAgrees: baseHit,
            effect01: peerMedianAvg ? Math.min(1, (avg - peerMedianAvg) / (peerMedianAvg + 50)) : 0.5,
          }),
        ),
      );
    }

    /* ---- C. instability: CV and P95 need enough samples ---- */
    if (s.length >= MIN_SAMPLES_STABILITY) {
      const cv = cvOf(s);
      const p95 = p95Of(s);
      const med = r.median as number;
      if ((cv !== null && cv > CV_THRESHOLD) || (p95 !== null && p95 > P95_FACTOR * med)) {
        const evidence = [`${s.length} successful samples: min ${round1(r.minimum)}, median ${round1(med)}, max ${round1(r.maximum)}.`];
        if (cv !== null && cv > CV_THRESHOLD) evidence.push(`Coefficient of variation is ${cv.toFixed(2)} (above the ${CV_THRESHOLD} instability threshold) — responses are spread out, not clustered.`);
        if (p95 !== null && p95 > P95_FACTOR * med) evidence.push(`P95 latency is ${p95.toFixed(1)} ms, more than ${P95_FACTOR}× the median (${med.toFixed(1)} ms) — occasional queries are much slower.`);
        findings.push(
          withConfidence(
            {
              id: `instability-${r.ip}`,
              severity: 'medium',
              category: 'instability',
              title: `${r.name} performs inconsistently`,
              summary: `${r.name} answers, but response times swing widely. Average speed alone is misleading here — some queries are much slower than typical.`,
              evidence,
              possibleCauses: [
                'Variable queuing/load at the resolver.',
                'Route flapping or alternating paths with different latencies.',
                'A mix of cached (fast) and uncached (slow) answers across queries.',
              ],
              recommendedActions: [
                'Run 10–20 queries per server for a tighter stability read.',
                'Check whether slowness clusters at the start (cold cache) or is scattered.',
                'If consistency matters more than best-case speed, prefer a provider with lower spread.',
              ],
              limitations: [VARIABILITY_NOTE, CACHE_NOTE, 'P95/CV are descriptive of this run, not guarantees about future behaviour.'],
              providerIp: r.ip,
              providerName: r.name,
              metrics: metricsFor(r, baseline, peerMedianAvg),
            },
            buildConfidence({ n: s.length, baselineAgrees: false, effect01: cv !== null ? Math.min(1, cv / 1.2) : 0.4 }),
          ),
        );
      }
    }

    /* ---- D. provider-specific outlier vs best peer ---- */
    if (
      !highLatencyIps.has(r.ip) &&
      bestPeerAvg !== null &&
      avg >= OUTLIER_FACTOR * bestPeerAvg &&
      avg - bestPeerAvg >= OUTLIER_GAP_MS
    ) {
      findings.push(
        withConfidence(
          {
            id: `outlier-${r.ip}`,
            severity: 'low',
            category: 'provider-outlier',
            title: `${r.name} lags behind the fastest provider`,
            summary: `${r.name} is not alarming in absolute terms, but it is clearly slower than the best provider in this run (${avg.toFixed(1)} ms vs ${bestPeerAvg.toFixed(1)} ms average).`,
            evidence: [
              `${r.name} average ${avg.toFixed(1)} ms; fastest peer average ${bestPeerAvg.toFixed(1)} ms — a gap of ${(avg - bestPeerAvg).toFixed(1)} ms.`,
              `Both measured with ${testsPerServer} queries against ${domain} under identical conditions.`,
            ],
            possibleCauses: [
              'The fastest provider may be topologically closer to this network.',
              'Normal performance differences between anycast deployments.',
            ],
            recommendedActions: [
              'If you want the lowest latency, prefer the fastest provider from this run.',
              'Re-run at a different time of day before treating this as permanent.',
            ],
            limitations: ['A relative gap is not a fault — this provider may still be perfectly usable.', VARIABILITY_NOTE],
            providerIp: r.ip,
            providerName: r.name,
            metrics: metricsFor(r, baseline, peerMedianAvg),
          },
          buildConfidence({ n: s.length, baselineAgrees: false, effect01: Math.min(1, (avg - bestPeerAvg) / (bestPeerAvg + 50)) }),
        ),
      );
    }
  }

  /* ---- E. network-wide: several providers degraded together ---- */
  const degraded = results.filter(
    (r) =>
      r.successRate < NETWORK_WIDE_SUCCESS ||
      (r.average !== null && r.average > NETWORK_WIDE_ABS_MS) ||
      highLatencyIps.has(r.ip),
  );
  const allSlowVsBaseline =
    baselines.length > 0 &&
    results.every((r) => {
      const b = baselineByIp.get(r.ip);
      return r.average !== null && b?.medianAvg != null && r.average >= BASELINE_FACTOR * (b.medianAvg as number);
    });
  if ((degraded.length >= 2 && degraded.length === results.length && results.length >= 2) || (allSlowVsBaseline && results.length >= 2)) {
    const viaBaseline = allSlowVsBaseline;
    // `degraded` can be empty when every provider regressed vs its OWN baseline
    // (allSlowVsBaseline) yet none crossed the coarse absolute bar. Fall back to
    // per-provider baseline evidence so the finding never renders an empty list.
    const evidence =
      degraded.length > 0
        ? degraded.map(
            (r) => `${r.name}: avg ${round1(r.average)}, success ${r.successRate.toFixed(1)}% (${r.successfulTests}/${r.totalTests}).`,
          )
        : results.map((r) => {
            const b = baselineByIp.get(r.ip);
            return `${r.name}: avg ${round1(r.average)} vs own baseline ${round1(b?.medianAvg ?? null)} (${r.successfulTests}/${r.totalTests} ok).`;
          });
    findings.push(
      withConfidence(
        {
          id: 'network-wide',
          severity: 'medium',
          category: 'network-wide',
          title: 'Possible shared network issue',
          summary: viaBaseline
            ? `All ${results.length} providers are much slower than their own historical baselines. When every provider degrades together, the common factor is usually the local path — not the providers.`
            : `All ${results.length} tested providers show degradation at the same time. A single bad provider cannot explain every provider failing at once.`,
          evidence,
          possibleCauses: [
            'Local network congestion (shared by all outbound queries).',
            'Upstream connectivity problems affecting the test host.',
            'A middlebox, VPN, or proxy slowing or interfering with DNS.',
            'The test host itself under heavy load.',
          ],
          recommendedActions: [
            'Re-run the benchmark — transient congestion often clears.',
            'Check whether general browsing is also slow (that supports a network-wide cause).',
            'If possible, test from a different network to compare.',
            'Do not switch providers yet: if the network is the cause, switching will not help.',
          ],
          limitations: [
            'This is a hypothesis supported by simultaneity, not proof of any specific cause.',
            'No claim is made about ISP responsibility — further testing (e.g. traceroute, testing another network) is needed.',
            ...(viaBaseline ? [] : [`Uses a coarse absolute fallback (${NETWORK_WIDE_ABS_MS} ms / ${NETWORK_WIDE_SUCCESS}% success) because peer comparison is meaningless when all peers degrade.`]),
          ],
        },
        // Cap confidence when the coarse absolute fallback carried the finding.
        Math.min(
          buildConfidence({ n: successfulQueries, baselineAgrees: viaBaseline, effect01: 0.6 }),
          viaBaseline ? 80 : 60,
        ),
      ),
    );
  }

  /* ---- F. insufficient data ---- */
  if (thinProviders.length > 0) {
    findings.push(
      withConfidence(
        {
          id: 'insufficient-data-thin',
          severity: 'low',
          category: 'insufficient-data',
          title: 'Too few successful samples for a firm verdict',
          summary: `Some providers answered too few queries to judge reliably: ${thinProviders.join('; ')}. Latency statistics from 1–2 samples are noise, not signal.`,
          evidence: [
            `Providers below the ${MIN_SUCCESS_FOR_LATENCY}-success minimum: ${thinProviders.join('; ')}.`,
            `${successfulQueries} successful queries overall across ${totalQueries} attempts.`,
          ],
          possibleCauses: ['High failure rates leaving too few successes.', 'A very small test run.'],
          recommendedActions: [
            'Re-run with 10–20 queries per server.',
            'If failures persist, investigate timeouts first (see timeout findings).',
          ],
          limitations: ['Averages from tiny samples can mislead — they are excluded from latency findings.'],
        },
        70,
      ),
    );
  }
  const noBaseline = baselines.length === 0;
  if (noBaseline && results.length < 2) {
    findings.push(
      withConfidence(
        {
          id: 'insufficient-data-nobaseline',
          severity: 'low',
          category: 'insufficient-data',
          title: 'No baseline available for comparison',
          summary: 'Only one provider was tested and there is no historical baseline, so relative judgments cannot be made.',
          evidence: [`${results.length} provider tested; ${baselines.length} historical baseline(s) available.`],
          possibleCauses: [],
          recommendedActions: ['Test at least two providers, or run once more to establish a baseline for next time.'],
          limitations: ['Absolute latency numbers alone cannot say whether a result is good or bad for this network.'],
        },
        75,
      ),
    );
  }

  /* ---- G. healthy ---- */
  const issueFindings = findings.filter((f) => f.category !== 'insufficient-data' && f.severity !== 'info');
  if (issueFindings.length === 0 && thinProviders.length === 0) {
    const avgs = results.map((r) => `${r.name} ${r.average !== null ? r.average.toFixed(1) : 'n/a'} ms`).join(', ');
    findings.push(
      withConfidence(
        {
          id: 'healthy',
          severity: 'info',
          category: 'healthy',
          title: 'No DNS issues detected',
          summary: `All ${results.length} provider(s) responded reliably with consistent latency (${avgs}). Nothing in this run suggests a DNS problem.`,
          evidence: [
            `${successfulQueries}/${totalQueries} queries succeeded across ${results.length} provider(s).`,
            `Per-provider averages: ${avgs}.`,
            ...(results.length >= MIN_SAMPLES_STABILITY || results.every((r) => successesOf(r).length >= MIN_SAMPLES_STABILITY)
              ? ['Latency spread is within normal bounds (no instability rule fired).']
              : ['Sample sizes are modest, but nothing abnormal was observed.']),
          ],
          possibleCauses: [],
          recommendedActions: ['No action needed. Re-run occasionally or if browsing feels slow.'],
          limitations: [VARIABILITY_NOTE, 'A healthy single run does not guarantee future performance.'],
        },
        buildConfidence({ n: successfulQueries, baselineAgrees: !noBaseline, effect01: 0.3 }),
      ),
    );
  }

  /* ---- sort: severity desc, confidence desc; dedupe safety ---- */
  const rank: Record<Severity, number> = { high: 4, medium: 3, low: 2, info: 1 };
  findings.sort((a, b) => rank[b.severity] - rank[a.severity] || b.confidence - a.confidence);

  const issueCount = findings.filter((f) => f.severity === 'high' || f.severity === 'medium').length;
  const status: OverallStatus = issueCount > 0 ? 'attention' : findings.some((f) => f.category === 'insufficient-data') ? 'inconclusive' : 'healthy';

  const summary =
    status === 'healthy'
      ? `All ${results.length} provider(s) look healthy across ${totalQueries} queries for ${domain}.`
      : status === 'attention'
        ? `${issueCount} finding(s) need attention across ${results.length} provider(s) tested on ${domain}.`
        : `Evidence is insufficient for a firm verdict on ${domain} — see what to re-test below.`;

  return { status, summary, domain, testedProviders: results.length, totalQueries, successfulQueries, findings };
}

function uniqueErrors(r: ServerResult): string {
  const errs = [...new Set((r.errors ?? []).filter((e): e is string => typeof e === 'string' && e.length > 0))];
  return errs.length > 0 ? errs.join(', ') : 'unknown';
}

/**
 * Build per-provider baselines from stored history.
 * Only entries for the SAME domain are comparable (different names resolve
 * differently), and only the fastest-average per run is not enough — we keep
 * each provider's own history.
 */
export function buildBaselines(
  history: { domain: string; results: { ip: string; average: number | null; successRate: number }[] }[],
  domain: string,
): Baseline[] {
  const byIp = new Map<string, { avgs: number[]; rates: number[] }>();
  for (const h of history) {
    if (h.domain.trim().toLowerCase() !== domain.trim().toLowerCase()) continue;
    for (const r of h.results ?? []) {
      if (!r || typeof r.ip !== 'string') continue;
      let e = byIp.get(r.ip);
      if (!e) {
        e = { avgs: [], rates: [] };
        byIp.set(r.ip, e);
      }
      if (typeof r.average === 'number' && !Number.isNaN(r.average)) e.avgs.push(r.average);
      if (typeof r.successRate === 'number') e.rates.push(r.successRate);
    }
  }
  return [...byIp.entries()].map(([ip, e]) => ({
    ip,
    runs: Math.max(e.avgs.length, e.rates.length),
    medianAvg: medianOf(e.avgs),
    medianSuccessRate: e.rates.length > 0 ? e.rates.reduce((a, b) => a + b, 0) / e.rates.length : 100,
  }));
}
