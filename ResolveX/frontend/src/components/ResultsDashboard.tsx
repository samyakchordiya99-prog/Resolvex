import type { ServerResult } from '../types';
import { fastestOf, fmt, statusFor } from './format';

export default function ResultsDashboard({ results, domain }: { results: ServerResult[]; domain: string }) {
  const fastest = fastestOf(results);
  const fastestIp = fastest?.ip ?? null;

  return (
    <section id="results" aria-labelledby="results-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-10 sm:px-6">
      <h2 id="results-title" className="text-2xl font-bold text-white">3 · Results dashboard</h2>
      <p className="mt-1 text-sm text-slate-400">
        Measured on your current network for <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-300">{domain}</code> · sorted by average latency.
      </p>

      {fastest ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 via-slate-900 to-cyan-500/10 p-6 sm:p-7" role="status" aria-label="Fastest DNS server">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">🏆 Fastest DNS (measured)</p>
              <p className="mt-1 text-2xl font-bold text-white sm:text-3xl">{fastest.name}</p>
              <p className="font-mono text-sm text-slate-300">{fastest.ip}</p>
              <p className="mt-2 text-xs text-slate-400">
                {fastest.successfulTests}/{fastest.totalTests} successful · {fastest.successRate.toFixed(0)}% success rate
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-slate-400">Average latency</p>
              <p className="font-mono text-4xl font-bold text-emerald-300 sm:text-5xl">{fastest.average?.toFixed(1)}<span className="text-lg"> ms</span></p>
              <p className="mt-1 font-mono text-xs text-slate-400">min {fmt(fastest.minimum)} · max {fmt(fastest.maximum)}</p>
            </div>
          </div>
        </div>
      ) : (
        <p role="alert" className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          All queries failed. Check your network connection and that the backend can reach external DNS servers (port 53 UDP/TCP outbound).
        </p>
      )}

      {/* Comparison table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-white">Comparison table</h3>
        </div>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <th scope="col" className="px-5 py-3">DNS Provider</th>
                <th scope="col" className="px-4 py-3">IP Address</th>
                <th scope="col" className="px-4 py-3 text-right">Avg</th>
                <th scope="col" className="px-4 py-3 text-right">Min</th>
                <th scope="col" className="px-4 py-3 text-right">Max</th>
                <th scope="col" className="px-4 py-3 text-right">Success</th>
                <th scope="col" className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const st = statusFor(r, fastestIp);
                return (
                  <tr key={r.ip} className={`border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 ${st.label === 'Fastest' ? 'bg-emerald-500/5' : ''}`}>
                    <td className="px-5 py-3 font-medium text-white">
                      {st.label === 'Fastest' && <span aria-hidden="true" className="mr-1.5">🏆</span>}{r.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-cyan-300">{r.ip}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">{r.average === null ? '—' : `${r.average.toFixed(1)} ms`}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">{fmt(r.minimum)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">{fmt(r.maximum)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">{r.successRate.toFixed(0)}%</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-xs italic text-slate-500">Results can vary based on network conditions, ISP routing, location, and temporary server load.</p>
    </section>
  );
}
