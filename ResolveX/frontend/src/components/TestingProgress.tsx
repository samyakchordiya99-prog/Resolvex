import type { DnsServer } from '../types';

interface Props {
  servers: DnsServer[];
  selectedIps: string[];
  testsPerServer: number;
  elapsedSec: number;
}

/** Simulated live progress while the backend measures (real timing happens server-side). */
function progressFor(elapsedSec: number, totalEstimateSec: number): number {
  if (totalEstimateSec <= 0) return 5;
  const p = (elapsedSec / totalEstimateSec) * 100;
  return Math.min(97, Math.max(4, p));
}

export default function TestingProgress({ servers, selectedIps, testsPerServer, elapsedSec }: Props) {
  const total = Math.max(1, selectedIps.length * testsPerServer);
  // Rough estimate: ~80ms avg per query + overhead; never claim exact
  const estTotalSec = Math.max(6, selectedIps.length * testsPerServer * 0.12 + 2);
  const overall = progressFor(elapsedSec, estTotalSec);
  const done = Math.min(total, Math.floor((overall / 100) * total));

  return (
    <section aria-labelledby="testing-title" aria-live="polite" className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <div className="rounded-2xl border border-cyan-400/20 bg-slate-900/80 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="testing-title" className="text-lg font-bold text-white">
            <span aria-hidden="true" className="mr-2 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" />
            DNS SPEED TEST — measuring…
          </h2>
          <span className="font-mono text-xs text-slate-400">{elapsedSec.toFixed(0)}s elapsed</span>
        </div>
        <p className="mt-1 text-sm text-slate-400">Sending real DNS queries from the backend to each selected resolver…</p>

        <div className="mt-4 space-y-3">
          {selectedIps.map((ip, idx) => {
            const srv = servers.find((s) => s.ip === ip);
            // Stagger bars slightly for a lively but honest "in progress" feel
            const p = Math.min(97, Math.max(4, overall - idx * 3 + ((idx * 7) % 9)));
            return (
              <div key={ip}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-slate-200">{srv?.shortName ?? ip}</span>
                  <span className="font-mono text-slate-400">{p.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100} aria-label={`${srv?.shortName} test progress`}>
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500" style={{ width: `${p}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 font-mono text-xs text-slate-400">
          Tests completed: ~{done} / {total} · UI stays responsive — results appear when the backend finishes.
        </p>
      </div>
    </section>
  );
}
