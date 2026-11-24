import DetectiveSection from '../components/DetectiveSection';
import { DEMO_RESULTS } from '../data/servers';
import type { HistoryEntry, ServerResult } from '../types';

interface Props {
  results: ServerResult[] | null;
  history: HistoryEntry[];
  domain: string;
  testsPerServer: number;
  timeoutMs: number;
  onNavigateToBenchmark: () => void;
}

export default function DetectiveView({
  results,
  history,
  domain,
  testsPerServer,
  timeoutMs,
  onNavigateToBenchmark,
}: Props) {
  const activeResults = results && results.length > 0 ? results : DEMO_RESULTS;
  const isDemo = !results || results.length === 0;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <h2 className="text-xl font-bold text-white tracking-tight">AI DNS Detective Engine</h2>
            {isDemo && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                SAMPLE DIAGNOSIS
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Automated heuristic intelligence evaluating packet timeouts, latency degradation, and regression vs baselines.
          </p>
        </div>

        {isDemo && (
          <button
            type="button"
            onClick={onNavigateToBenchmark}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20 hover:brightness-110"
          >
            <span>⚡</span>
            <span>Run Benchmark to Diagnose Live</span>
          </button>
        )}
      </div>

      {/* Detective Component */}
      <DetectiveSection
        results={activeResults}
        history={history}
        domain={domain}
        testsPerServer={testsPerServer}
        timeoutMs={timeoutMs}
      />
    </div>
  );
}

