import { Suspense, lazy } from 'react';
import { DEMO_RESULTS } from '../data/servers';
import type { ServerResult } from '../types';

const ChartsSection = lazy(() => import('../components/ChartsSection'));

interface Props {
  results: ServerResult[] | null;
  domain: string;
  onNavigateToBenchmark: () => void;
}

export default function ChartsView({ results, domain, onNavigateToBenchmark }: Props) {
  const activeResults = results && results.length > 0 ? results : DEMO_RESULTS;
  const isDemo = !results || results.length === 0;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h2 className="text-xl font-bold text-white tracking-tight">Latency & Reliability Analytics</h2>
            {isDemo && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                SAMPLE DATA
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Comparative performance charts for <code className="font-mono text-cyan-300">{domain}</code>.
          </p>
        </div>

        {isDemo && (
          <button
            type="button"
            onClick={onNavigateToBenchmark}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20 hover:brightness-110"
          >
            <span>⚡</span>
            <span>Run Real Benchmark</span>
          </button>
        )}
      </div>

      {/* Main Charts */}
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-sm text-slate-400">
            Loading charts engine…
          </div>
        }
      >
        <ChartsSection results={activeResults} />
      </Suspense>
    </div>
  );
}

