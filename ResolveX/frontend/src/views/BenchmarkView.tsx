import ConfigCard from '../components/ConfigCard';
import Hero from '../components/Hero';
import ResultsDashboard from '../components/ResultsDashboard';
import ServerSelection from '../components/ServerSelection';
import TestingProgress from '../components/TestingProgress';
import type { DnsServer, ServerResult } from '../types';

interface Props {
  servers: DnsServer[];
  selected: Set<string>;
  onToggle: (ip: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  domain: string;
  setDomain: (d: string) => void;
  tests: number;
  setTests: (t: number) => void;
  timeout: number;
  setTimeout: (t: number) => void;
  onStartTest: () => void;
  busy: boolean;
  clientError: string | null;
  backendOk: boolean | null;
  elapsed: number;
  phase: string;
  error: string | null;
  results: ServerResult[] | null;
  testedDomain: string;
  onNavigateToRace: () => void;
  onNavigateToCharts: () => void;
}

export default function BenchmarkView({
  servers,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
  domain,
  setDomain,
  tests,
  setTests,
  timeout,
  setTimeout,
  onStartTest,
  busy,
  clientError,
  backendOk,
  elapsed,
  phase,
  error,
  results,
  testedDomain,
  onNavigateToRace,
  onNavigateToCharts,
}: Props) {
  const selectedServers = servers.filter((s) => selected.has(s.ip));

  return (
    <div className="space-y-8">
      {/* Hero Intro */}
      <Hero onStart={() => document.getElementById('servers')?.scrollIntoView({ behavior: 'smooth' })} />

      {/* Problem / Solution Cards */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6" aria-label="Problem and solution">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-red-300">The Problem</h2>
            <p className="mt-1 text-sm text-slate-300">
              Users don&apos;t know which DNS server is fastest on their current network — it depends heavily on your ISP, physical location, routing, and peering.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-emerald-300">The ResolveX Solution</h2>
            <p className="mt-1 text-sm text-slate-300">
              This tool sends real DNS socket queries to each provider from your network, measures real nanosecond roundtrip latency, and ranks them by speed and uptime.
            </p>
          </div>
        </div>
      </div>

      {/* Server Selection */}
      <ServerSelection
        servers={servers}
        selected={selected}
        onToggle={toggleServerIp => onToggle(toggleServerIp)}
        onSelectAll={onSelectAll}
        onClearAll={onClearAll}
        disabled={busy}
      />

      {/* Test Configuration */}
      <ConfigCard
        domain={domain}
        setDomain={setDomain}
        tests={tests}
        setTests={setTests}
        timeout={timeout}
        setTimeout={setTimeout}
        onStart={onStartTest}
        busy={busy}
        canStart={selected.size > 0}
        validationError={clientError}
      />

      {/* Backend Offline Warning if any */}
      {backendOk === false && (
        <div role="alert" className="mx-auto max-w-6xl rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-4 text-sm text-amber-200">
          <div className="flex items-center gap-2 font-semibold">
            <span>⚠️</span>
            <span>Backend Server Offline</span>
          </div>
          <p className="mt-1 text-xs text-amber-200/90">
            Make sure the backend is running (<code className="font-mono">npm start</code> on port 5000). Browsers cannot send raw UDP DNS packets directly due to web sandbox security.
          </p>
        </div>
      )}

      {/* Live Testing Progress */}
      {busy && (
        <TestingProgress
          servers={servers}
          selectedIps={selectedServers.map((s) => s.ip)}
          testsPerServer={tests}
          elapsedSec={elapsed}
        />
      )}

      {/* Error Banner */}
      {phase === 'error' && error && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6" role="alert">
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-200 shadow-lg">
            <p className="font-semibold text-red-300">Test Encountered an Error</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Results Dashboard Summary & Quick Links */}
      {phase === 'done' && results && (
        <div className="space-y-6">
          <ResultsDashboard results={results} domain={testedDomain} />

          {/* Action cards to other views */}
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={onNavigateToRace}
                className="group flex items-center justify-between rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-5 text-left transition hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏎️</span>
                    <span className="font-bold text-white">DNS Race Replay</span>
                    <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    Watch the animated packet transmission race across providers.
                  </p>
                </div>
                <span className="text-amber-400 transition-transform group-hover:translate-x-1">→</span>
              </button>

              <button
                type="button"
                onClick={onNavigateToCharts}
                className="group flex items-center justify-between rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-5 text-left transition hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/10"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    <span className="font-bold text-white">Visual Analytics</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    Compare latency distribution line charts, bar charts, and jitter.
                  </p>
                </div>
                <span className="text-cyan-400 transition-transform group-hover:translate-x-1">→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

