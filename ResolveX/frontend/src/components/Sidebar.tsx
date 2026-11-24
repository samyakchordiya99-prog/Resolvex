import type { ServerResult } from '../types';
import { fastestOf } from './format';

export type NavPage = 'benchmark' | 'race' | 'charts' | 'details' | 'detective' | 'history' | 'learn';

interface Props {
  activePage: NavPage;
  setActivePage: (p: NavPage) => void;
  backendOk: boolean | null;
  results: ServerResult[] | null;
  domain: string;
  isTesting: boolean;
  onQuickBenchmark: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({
  activePage,
  setActivePage,
  backendOk,
  results,
  domain,
  isTesting,
  onQuickBenchmark,
  mobileOpen,
  setMobileOpen,
}: Props) {
  const fastest = results ? fastestOf(results) : null;

  const navItems: { id: NavPage; label: string; icon: string; badge?: string; badgeColor?: string }[] = [
    { id: 'benchmark', label: 'Benchmark Suite', icon: '⚡' },
    { id: 'race', label: 'DNS Race Replay', icon: '🏎️', badge: 'NEW', badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold' },
    { id: 'charts', label: 'Visual Analytics', icon: '📊' },
    { id: 'details', label: 'Query Inspector', icon: '🔍' },
    { id: 'detective', label: 'AI Detective', icon: '🧠' },
    { id: 'history', label: 'Test History', icon: '⏱️' },
    { id: 'learn', label: 'DNS Academy', icon: '📚' },
  ];

  const handleSelect = (id: NavPage) => {
    setActivePage(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800/80 bg-[#070b16] transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        aria-label="Main sidebar navigation"
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-slate-800/80 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 shadow-lg shadow-cyan-500/20">
              <span className="font-mono text-xl font-bold text-slate-950">◈</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-base">ResolveX</span>
                <span className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Network Intelligence</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Quick Launch Benchmark CTA */}
        <div className="p-4 border-b border-slate-800/60">
          <button
            type="button"
            disabled={isTesting}
            onClick={() => {
              if (activePage !== 'benchmark') setActivePage('benchmark');
              onQuickBenchmark();
            }}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            <span className="text-base">{isTesting ? '⏳' : '⚡'}</span>
            <span>{isTesting ? 'Running Benchmark…' : 'Run Live Benchmark'}</span>
            <span className="absolute right-3 text-slate-950/60 transition-transform group-hover:translate-x-0.5">→</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-4" aria-label="Feature Views">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          {navItems.map((item) => {
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-base transition-transform group-hover:scale-110 ${active ? 'scale-105' : 'opacity-80'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`rounded-full px-2 py-0.5 text-[9px] tracking-wide uppercase ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
                {item.id === 'race' && !item.badge && (
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Active Benchmark Summary Card in Sidebar */}
        <div className="border-t border-slate-800/80 p-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Target Domain</span>
              <span className="font-mono text-cyan-300">{domain}</span>
            </div>
            {fastest ? (
              <div className="mt-2.5 border-t border-slate-800/80 pt-2 text-xs">
                <div className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                  <span>🏆 Leader:</span>
                  <span className="font-semibold text-white truncate max-w-[120px]">{fastest.name}</span>
                </div>
                <div className="mt-0.5 flex justify-between font-mono text-[11px] text-slate-400">
                  <span>{fastest.ip}</span>
                  <span className="font-bold text-emerald-300">{fastest.average?.toFixed(1)} ms</span>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-slate-400">
                Ready for live measurement
              </div>
            )}
          </div>
        </div>

        {/* Backend API Connection Status Footer */}
        <div className="flex items-center justify-between border-t border-slate-800/80 px-5 py-3.5 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                backendOk === true
                  ? 'bg-emerald-400 ring-4 ring-emerald-400/20'
                  : backendOk === false
                  ? 'bg-red-400 ring-4 ring-red-400/20'
                  : 'bg-amber-400 ring-4 ring-amber-400/20 animate-pulse'
              }`}
            />
            <span className={backendOk ? 'text-emerald-300 font-medium' : backendOk === false ? 'text-red-300 font-medium' : 'text-slate-400'}>
              {backendOk === true ? 'Backend Online' : backendOk === false ? 'Backend Offline' : 'Connecting…'}
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">:5000</span>
        </div>
      </aside>
    </>
  );
}

