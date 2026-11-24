import type { HistoryEntry } from '../types';

interface Props {
  history: HistoryEntry[];
  onClear: () => void;
  onRestoreEntry: (entry: HistoryEntry) => void;
  onNavigateToBenchmark: () => void;
}

export default function HistoryView({
  history,
  onClear,
  onRestoreEntry,
  onNavigateToBenchmark,
}: Props) {
  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⏱️</span>
            <h2 className="text-xl font-bold text-white tracking-tight">Benchmark History Archive</h2>
            <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
              {history.length} SAVED RUNS
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Persistent browser-cached benchmark executions. Restore any past result to replay in the DNS Race.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition"
            >
              Clear All Records
            </button>
          )}
          <button
            type="button"
            onClick={onNavigateToBenchmark}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:brightness-110"
          >
            <span>⚡</span>
            <span>New Benchmark</span>
          </button>
        </div>
      </div>

      {/* History Table or Empty State */}
      {history.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-12 text-center">
          <span className="text-3xl">📭</span>
          <h3 className="mt-3 text-base font-semibold text-white">No Benchmark Records Yet</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            Once you execute a DNS comparison test, your benchmarks, fastest servers, and latency distributions will be stored here automatically.
          </p>
          <button
            type="button"
            onClick={onNavigateToBenchmark}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20 hover:brightness-110"
          >
            <span>Run Your First Benchmark</span>
            <span>→</span>
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                  <th scope="col" className="px-5 py-3.5">Execution Date</th>
                  <th scope="col" className="px-4 py-3.5">Target Host</th>
                  <th scope="col" className="px-4 py-3.5">Scope</th>
                  <th scope="col" className="px-4 py-3.5">Fastest Provider</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Avg Latency</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3 text-xs text-slate-300">
                      {new Date(h.date).toLocaleDateString()} {new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-cyan-300">
                      {h.domain}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {h.serverCount} servers × {h.testsPerServer} tests
                    </td>
                    <td className="px-4 py-3 text-xs text-white">
                      <span className="font-semibold">{h.fastestName}</span>{' '}
                      <span className="font-mono text-slate-400">({h.fastestIp})</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-bold text-emerald-300">
                      {h.fastestAvg === null ? '—' : `${h.fastestAvg.toFixed(1)} ms`}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onRestoreEntry(h)}
                        className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
                      >
                        Restore & Race 🏎️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

