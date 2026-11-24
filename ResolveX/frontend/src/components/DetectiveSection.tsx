import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { buildBaselines, diagnose } from '../detective/engine';
import type { Finding, OverallStatus, Severity } from '../detective/engine';
import { enhanceFinding, getAiStatus } from '../services/ai';
import type { HistoryEntry, ServerResult } from '../types';

// Recharts stays out of the main bundle: loaded only when a baseline chart is shown.
const BaselineChart = lazy(() => import('./BaselineChart'));

interface Props {
  results: ServerResult[] | null;
  history: HistoryEntry[];
  domain: string;
  testsPerServer: number;
  timeoutMs: number;
}

const STATUS_STYLE: Record<OverallStatus, { label: string; cls: string; dot: string }> = {
  healthy: { label: 'Healthy', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400' },
  attention: { label: 'Needs Attention', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300', dot: 'bg-amber-400' },
  inconclusive: { label: 'Inconclusive', cls: 'border-slate-500/40 bg-slate-500/10 text-slate-300', dot: 'bg-slate-400' },
};

const SEV_STYLE: Record<Severity, string> = {
  info: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
  low: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  high: 'border-red-500/40 bg-red-500/10 text-red-300',
};

const SEV_LABEL: Record<Severity, string> = { info: 'Info', low: 'Low', medium: 'Medium', high: 'High' };

/** Detection rationale per category — the rule that fired, in plain language. */
const RATIONALE: Record<Finding['category'], string> = {
  'high-latency':
    'Fired when a provider with ≥3 successful queries averages ≥2× the peer median (gap ≥25 ms) or ≥1.5× its own historical baseline (gap ≥15 ms).',
  timeouts:
    'Fired on ≥2 failures (<95% success → medium/low; <70% → high). Exactly one failure is informational only — never a verdict.',
  instability:
    'Fired with ≥5 samples when spread is wide: coefficient of variation >0.6 or P95 >2.5× the median.',
  'provider-outlier':
    'Fired when a provider is ≥2× the fastest peer (gap ≥20 ms) but below the high-latency bar. Relative gap only — not a fault.',
  'network-wide':
    'Fired when ALL tested providers degrade together (absolute fallback: >150 ms avg or <90% success) or all regress vs their baselines. Suggests a shared cause; never blames the ISP.',
  'insufficient-data': 'Fired when samples are too thin (<3 successes) or no comparison baseline exists.',
  healthy: 'Fired when no issue rule triggers and every provider has enough successful samples.',
};

function shortName(name: string): string {
  return name.replace(' DNS', '').replace(' Public', '');
}

type AiState = { phase: 'idle' } | { phase: 'loading' } | { phase: 'done'; text: string } | { phase: 'error'; message: string };

function FindingCard({
  finding,
  aiAvailable,
  context,
}: {
  finding: Finding;
  aiAvailable: boolean;
  context: { domain: string; testsPerServer: number; timeoutMs: number };
}) {
  const [open, setOpen] = useState(finding.severity === 'high' || finding.severity === 'medium');
  const [ai, setAi] = useState<AiState>({ phase: 'idle' });
  const m = finding.metrics;

  const runEnhance = async () => {
    setAi({ phase: 'loading' });
    try {
      const text = await enhanceFinding(finding, context);
      setAi({ phase: 'done', text });
    } catch (e) {
      setAi({ phase: 'error', message: (e as Error).message });
    }
  };

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5" aria-labelledby={`${finding.id}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex flex-wrap items-center gap-2">
            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${SEV_STYLE[finding.severity]}`}>
              {SEV_LABEL[finding.severity]} severity
            </span>
            <span className="text-[11px] uppercase tracking-wider text-slate-500">{finding.category.replace(/-/g, ' ')}</span>
          </p>
          <h3 id={`${finding.id}-title`} className="mt-2 text-base font-bold text-white">
            {finding.title}
          </h3>
        </div>
        <div className="text-right" title={`Confidence ${finding.confidence}/100`}>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Confidence: {finding.confidenceLabel}</p>
          <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-800" role="img" aria-label={`Confidence ${finding.confidence} out of 100 (${finding.confidenceLabel})`}>
            <div
              className={`h-full rounded-full ${finding.confidence >= 70 ? 'bg-emerald-400' : finding.confidence >= 45 ? 'bg-amber-400' : 'bg-slate-400'}`}
              style={{ width: `${finding.confidence}%` }}
            />
          </div>
        </div>
      </div>

      <p className="mt-2.5 text-sm leading-relaxed text-slate-200">{finding.summary}</p>

      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan-300">📏 Measured evidence</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-slate-300">
          {finding.evidence.map((e, i) => (
            <li key={i} className="font-mono text-[12px]">{e}</li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`${finding.id}-details`}
        className="mt-3 rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-cyan-400/50 hover:text-white"
      >
        {open ? '▾ Hide investigation' : '▸ Detailed investigation'}
      </button>

      {open && (
        <div id={`${finding.id}-details`} className="mt-3 space-y-3">
          {m && (
            <div className="scroll-thin overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[520px] text-left font-mono text-xs">
                <caption className="px-3.5 pt-3 text-left font-sans text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Measurements behind this finding
                </caption>
                <tbody className="text-slate-300">
                  {[
                    ['Average', m.average !== null ? `${m.average.toFixed(1)} ms` : 'n/a'],
                    ['Median', m.median !== null ? `${m.median.toFixed(1)} ms` : 'n/a'],
                    ['Min / Max', `${m.minimum !== null ? m.minimum.toFixed(1) : 'n/a'} / ${m.maximum !== null ? m.maximum.toFixed(1) : 'n/a'} ms`],
                    ['P95', m.p95 !== null ? `${m.p95.toFixed(1)} ms` : 'n/a (needs ≥5 samples)'],
                    ['Variation (CV)', m.cv !== null ? m.cv.toFixed(2) : 'n/a'],
                    ['Success', `${m.successes} ok / ${m.failures} failed (${m.successRate.toFixed(1)}%)`],
                    ['Historical baseline', m.baselineAvg !== null ? `${m.baselineAvg.toFixed(1)} ms` : 'none available'],
                    ['Peer median avg', m.peerMedianAvg !== null ? `${m.peerMedianAvg.toFixed(1)} ms` : 'n/a'],
                  ].map(([k, v]) => (
                    <tr key={k} className="border-t border-slate-800/60">
                      <th scope="row" className="px-3.5 py-1.5 font-sans font-medium text-slate-400">{k}</th>
                      <td className="px-3.5 py-1.5 text-white">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">🔍 Detection rationale</p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-300">{RATIONALE[finding.category]}</p>
          </div>

          {finding.possibleCauses.length > 0 && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">💡 Possible causes — hypotheses, not facts</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-slate-300">
                {finding.possibleCauses.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {finding.recommendedActions.length > 0 && (
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">✅ What to check next</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-slate-300">
                {finding.recommendedActions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">⚠️ Limitations</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-slate-400">
              {finding.limitations.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-violet-400/25 bg-violet-400/5 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-300">✨ AI explanation (optional)</p>
              {aiAvailable && ai.phase === 'idle' && (
                <button
                  type="button"
                  onClick={runEnhance}
                  className="rounded-lg border border-violet-400/40 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-400/10"
                >
                  Explain with AI
                </button>
              )}
            </div>
            {!aiAvailable && (
              <p className="mt-1.5 text-[13px] text-slate-400">
                No AI provider is configured on the backend — the deterministic analysis above is the complete result. (Operators: set
                <code className="font-mono text-slate-300"> AI_API_URL</code> + <code className="font-mono text-slate-300">AI_API_KEY</code> to enable this.)
              </p>
            )}
            {ai.phase === 'loading' && (
              <p className="mt-1.5 text-[13px] text-slate-300" role="status">Asking the AI service…</p>
            )}
            {ai.phase === 'done' && <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-slate-200">{ai.text}</p>}
            {ai.phase === 'error' && (
              <p className="mt-1.5 text-[13px] text-amber-200" role="alert">{ai.message}</p>
            )}
            {ai.phase !== 'idle' && aiAvailable && (
              <button type="button" onClick={() => setAi({ phase: 'idle' })} className="mt-2 text-xs text-slate-400 underline hover:text-slate-200">
                Dismiss AI explanation
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export default function DetectiveSection({ results, history, domain, testsPerServer, timeoutMs }: Props) {
  const [aiAvailable, setAiAvailable] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  // External-system sync (backend AI status); refreshTick allows manual re-check.
  useEffect(() => {
    let alive = true;
    getAiStatus().then((s) => {
      if (alive) setAiAvailable(s.available);
    });
    return () => {
      alive = false;
    };
  }, [refreshTick]);

  // Historical baseline = PREVIOUS runs only. The just-finished run is already
  // in `history`, so exclude the entry that is the current `results` (same array
  // reference) — otherwise the run would be compared against itself.
  const priorHistory = useMemo(
    () => (results ? history.filter((h) => h.results !== results) : history),
    [history, results],
  );
  const baselines = useMemo(() => buildBaselines(priorHistory, domain), [priorHistory, domain]);
  const diagnosis = useMemo(
    () =>
      results === null
        ? null
        : diagnose({ results, domain, testsPerServer, timeoutMs, baselines }),
    [results, domain, testsPerServer, timeoutMs, baselines],
  );

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { high: 0, medium: 0, low: 0, info: 0 };
    diagnosis?.findings.forEach((f) => {
      c[f.severity] += 1;
    });
    return c;
  }, [diagnosis]);

  const baselineChartData = useMemo(() => {
    if (!results) return [];
    return results
      .map((r) => {
        const b = baselines.find((x) => x.ip === r.ip);
        if (!b || b.medianAvg === null || r.average === null) return null;
        return { name: shortName(r.name), current: Number(r.average.toFixed(1)), baseline: Number(b.medianAvg.toFixed(1)) };
      })
      .filter((x): x is { name: string; current: number; baseline: number } => x !== null);
  }, [results, baselines]);

  const status = diagnosis?.status;
  const st = status ? STATUS_STYLE[status] : null;

  return (
    <section id="detective" aria-labelledby="detective-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-10 sm:px-6">
      <h2 id="detective-title" className="text-2xl font-bold text-white">4 · AI DNS Detective</h2>
      <p className="mt-1 text-sm text-slate-400">
        Evidence-based diagnosis of your benchmark — what was found, what proves it, and what to check next. Deterministic by default; AI rephrasing is optional.
      </p>

      {diagnosis === null || results === null ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center" role="status">
          <p aria-hidden="true" className="text-3xl">🔍</p>
          <p className="mt-2 text-sm font-semibold text-white">No benchmark to analyse yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            Run a DNS test above and the Detective will inspect the real measurements — latency, failures, stability, and history.
          </p>
          <a
            href="#configure"
            className="mt-4 inline-block rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110"
          >
            Configure a test
          </a>
        </div>
      ) : (
        <>
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6" role="status" aria-label="Diagnostic overview">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className={`h-3 w-3 rounded-full ${st!.dot}`} />
                <p className="text-lg font-bold text-white">
                  Overall:{' '}
                  <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${st!.cls}`}>{st!.label}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLastRefresh(new Date().toLocaleTimeString());
                  setRefreshTick((t) => t + 1);
                }}
                className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-cyan-400/50 hover:text-white"
                title="Re-render the analysis from the latest results and history, and re-check AI availability"
              >
                ↻ Refresh analysis{lastRefresh ? ` · ${lastRefresh}` : ''}
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-300">{diagnosis.summary}</p>
            <p className="mt-1 font-mono text-xs text-slate-500">
              {diagnosis.testedProviders} providers · {diagnosis.successfulQueries}/{diagnosis.totalQueries} queries succeeded · domain {diagnosis.domain}
            </p>
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Findings by severity">
              {(Object.keys(counts) as Severity[]).map((s) => (
                <span key={s} className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${SEV_STYLE[s]}`}>
                  {SEV_LABEL[s]}: {counts[s]}
                </span>
              ))}
            </div>
          </div>

          {baselineChartData.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="text-sm font-semibold text-white">Current vs historical baseline</h3>
              <p className="text-[11px] text-slate-500">Same domain, previous runs · ms — bars far above baseline support regression findings</p>
              <Suspense fallback={<p className="mt-2 text-xs text-slate-500" role="status">Loading chart…</p>}>
                <BaselineChart data={baselineChartData} />
              </Suspense>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {diagnosis.findings.map((f) => (
              <FindingCard key={f.id} finding={f} aiAvailable={aiAvailable} context={{ domain, testsPerServer, timeoutMs }} />
            ))}
          </div>

          <p className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs leading-relaxed text-slate-500">
            How this works: deterministic rules compare each provider against peers from the same run and its own history —
            <strong className="text-slate-300"> evidence</strong> is measured, <strong className="text-slate-300">causes</strong> are hypotheses,
            <strong className="text-slate-300"> confidence</strong> reflects sample size and effect size (never 100 — DNS is noisy).
            No machine learning is used.
          </p>
        </>
      )}
    </section>
  );
}
