import type { HistoryEntry } from '../types';

export default function HistoryPanel({ history, onClear }: { history: HistoryEntry[]; onClear: () => void }) {
  return (
    <section id="history" aria-labelledby="history-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="history-title" className="text-xl font-bold text-white">Test history</h2>
          <p className="mt-1 text-sm text-slate-400">Stored locally in your browser — no login required.</p>
        </div>
        {history.length > 0 && (
          <button type="button" onClick={onClear} className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-red-400/60 hover:text-red-300">
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-5 text-sm text-slate-400">
          No tests yet. Run your first comparison above — it will appear here with date, domain, and fastest server.
        </p>
      ) : (
        <div className="scroll-thin mt-4 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full min-w-[640px] bg-slate-900/60 text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <th scope="col" className="px-4 py-3">Date / time</th>
                <th scope="col" className="px-4 py-3">Domain</th>
                <th scope="col" className="px-4 py-3">Servers</th>
                <th scope="col" className="px-4 py-3">Fastest (measured)</th>
                <th scope="col" className="px-4 py-3 text-right">Avg latency</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 text-xs text-slate-300">{new Date(h.date).toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-cyan-300">{h.domain}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-300">{h.serverCount} × {h.testsPerServer}</td>
                  <td className="px-4 py-2.5 text-xs text-white">{h.fastestName} <span className="font-mono text-slate-400">({h.fastestIp})</span></td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-emerald-300">{h.fastestAvg === null ? '—' : `${h.fastestAvg.toFixed(1)} ms`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
