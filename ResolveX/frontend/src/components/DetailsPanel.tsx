import { useState } from 'react';
import type { ServerResult } from '../types';
import { fmt } from './format';

// NOTE: parent passes key={runId} so state resets cleanly on every new test run.
export default function DetailsPanel({ results }: { results: ServerResult[] }) {
  const [activeIp, setActiveIp] = useState<string>(results[0]?.ip ?? '');

  const active: ServerResult | undefined = results.find((r) => r.ip === activeIp) ?? results[0];
  if (!active) return null;

  return (
    <section aria-labelledby="details-title" className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <h2 id="details-title" className="text-xl font-bold text-white">Detailed DNS results</h2>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Choose a DNS provider for details">
        {results.map((r) => (
          <button
            key={r.ip}
            type="button"
            role="tab"
            aria-selected={r.ip === active.ip}
            onClick={() => setActiveIp(r.ip)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              r.ip === active.ip ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {r.name.replace(' DNS', '')}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]" role="tabpanel" aria-label={`${active.name} details`}>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-lg font-bold text-white">{active.name}</p>
          <p className="font-mono text-sm text-cyan-300">{active.ip}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {[
              ['Average', fmt(active.average)],
              ['Median', fmt(active.median)],
              ['Minimum', fmt(active.minimum)],
              ['Maximum', fmt(active.maximum)],
              ['Successful', `${active.successfulTests}`],
              ['Failed', `${active.failedTests}`],
              ['Success rate', `${active.successRate.toFixed(1)}%`],
              ['Total tests', `${active.totalTests}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5">
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">{k}</dt>
                <dd className="mt-0.5 font-mono text-sm text-white">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-sm font-semibold text-white">Individual test results</h3>
          <ol className="scroll-thin mt-3 grid max-h-72 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
            {active.latencies.map((lat, i) => (
              <li
                key={i}
                className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 font-mono text-xs ${
                  lat === null ? 'border-red-500/30 bg-red-500/5 text-red-300' : 'border-slate-800 bg-slate-950/60 text-slate-200'
                }`}
              >
                <span className="text-slate-500">#{i + 1}</span>
                <span>{lat === null ? `✕ ${active.errors?.[i] ?? 'fail'}` : `${lat.toFixed(1)} ms`}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
