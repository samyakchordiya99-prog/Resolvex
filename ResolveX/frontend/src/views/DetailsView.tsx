import DetailsPanel from '../components/DetailsPanel';
import { DEMO_RESULTS } from '../data/servers';
import type { ServerResult } from '../types';

interface Props {
  results: ServerResult[] | null;
  domain: string;
  onNavigateToBenchmark: () => void;
}

export default function DetailsView({ results, domain, onNavigateToBenchmark }: Props) {
  const activeResults = results && results.length > 0 ? results : DEMO_RESULTS;
  const isDemo = !results || results.length === 0;

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeResults, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `resolvex-dns-benchmark-${domain}-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportCSV = () => {
    const headers = ['Provider', 'IP', 'Average (ms)', 'Minimum (ms)', 'Maximum (ms)', 'Median (ms)', 'Success Rate (%)', 'Successful Tests', 'Failed Tests'];
    const rows = activeResults.map((r) => [
      r.name,
      r.ip,
      r.average?.toFixed(2) ?? 'FAILED',
      r.minimum?.toFixed(2) ?? '—',
      r.maximum?.toFixed(2) ?? '—',
      r.median?.toFixed(2) ?? '—',
      r.successRate.toFixed(1),
      r.successfulTests,
      r.failedTests,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `resolvex-dns-benchmark-${domain}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      {/* View Header with Export Buttons */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔍</span>
            <h2 className="text-xl font-bold text-white tracking-tight">Query Inspector & Logs</h2>
            {isDemo && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                SAMPLE DATA
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Per-query latency metrics, raw millisecond samples, error details, and statistics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-750 hover:text-white transition"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={exportJSON}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-750 hover:text-white transition"
          >
            <span>💾</span>
            <span>Export JSON</span>
          </button>
          {isDemo && (
            <button
              type="button"
              onClick={onNavigateToBenchmark}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:brightness-110"
            >
              <span>⚡</span>
              <span>Run Live Test</span>
            </button>
          )}
        </div>
      </div>

      {/* Details Panel */}
      <DetailsPanel results={activeResults} />
    </div>
  );
}

