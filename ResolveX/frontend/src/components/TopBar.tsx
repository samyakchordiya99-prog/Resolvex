import type { NavPage } from './Sidebar';

interface Props {
  activePage: NavPage;
  setActivePage: (p: NavPage) => void;
  domain: string;
  isTesting: boolean;
  onStartTest: () => void;
  onOpenMobileSidebar: () => void;
  backendOk: boolean | null;
  hasResults: boolean;
}

const PAGE_META: Record<NavPage, { title: string; subtitle: string }> = {
  benchmark: {
    title: 'DNS Benchmark Suite',
    subtitle: 'Measure live resolver latency and query reliability on your current network',
  },
  race: {
    title: 'DNS Race Replay',
    subtitle: 'Real-time animated visualization of query packet transmission and latency deltas',
  },
  charts: {
    title: 'Visual Analytics & Spread',
    subtitle: 'Comparative latency distributions, success rates, and jitter analysis',
  },
  details: {
    title: 'Query Inspector & Logs',
    subtitle: 'Per-attempt drilldown, response times, statistical metrics, and export',
  },
  detective: {
    title: 'AI DNS Detective',
    subtitle: 'Automated diagnostic reasoning engine and baseline regression detection',
  },
  history: {
    title: 'Benchmark History',
    subtitle: 'Persistent local benchmark records, comparisons, and historical trends',
  },
  learn: {
    title: 'DNS Knowledge Base',
    subtitle: 'Deep-dive architectural guide to DNS resolvers, anycast, and latency',
  },
};

export default function TopBar({
  activePage,
  setActivePage,
  domain,
  isTesting,
  onStartTest,
  onOpenMobileSidebar,
  backendOk,
  hasResults,
}: Props) {
  const meta = PAGE_META[activePage];

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800/80 bg-[#070b16]/90 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        {/* Mobile Hamburger Menu */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white lg:hidden"
          aria-label="Open navigation sidebar"
        >
          <span className="text-lg">☰</span>
        </button>

        {/* Page Title & Breadcrumbs */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white tracking-tight sm:text-xl">
              {meta.title}
            </h1>
            <span className="hidden sm:inline-flex items-center rounded-md border border-slate-800 bg-slate-900/80 px-2 py-0.5 font-mono text-xs text-cyan-300">
              {domain}
            </span>
          </div>
          <p className="hidden text-xs text-slate-400 sm:block">
            {meta.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {activePage !== 'race' && hasResults && (
          <button
            type="button"
            onClick={() => setActivePage('race')}
            className="hidden sm:flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-all"
          >
            <span>🏎️</span>
            <span>View Race Replay</span>
          </button>
        )}

        <button
          type="button"
          onClick={onStartTest}
          disabled={isTesting}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 hover:brightness-110 active:scale-95 disabled:opacity-60 transition-all"
        >
          <span>{isTesting ? '⏳' : '⚡'}</span>
          <span className="font-bold">{isTesting ? 'Testing…' : 'Start Benchmark'}</span>
        </button>

        {/* API connection indicator badge */}
        <div
          title={backendOk ? 'Backend API operational' : 'Backend offline'}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
            backendOk
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : backendOk === false
              ? 'border-red-500/30 bg-red-500/10 text-red-400'
              : 'border-slate-800 bg-slate-900 text-slate-400'
          }`}
        >
          <span className="text-sm">{backendOk ? '●' : '○'}</span>
        </div>
      </div>
    </header>
  );
}

