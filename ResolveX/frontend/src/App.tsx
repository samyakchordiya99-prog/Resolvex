import { useCallback, useEffect, useRef, useState } from 'react';
import DnsRaceReplay from './components/DnsRaceReplay';
import Footer from './components/Footer';
import Sidebar, { type NavPage } from './components/Sidebar';
import TopBar from './components/TopBar';
import { fastestOf } from './components/format';
import { DEFAULT_SERVERS } from './data/servers';
import { useBackendHealth } from './hooks/useBackendHealth';
import { fetchServers, runDnsTest } from './services/api';
import { clearHistory, loadHistory, saveHistoryEntry } from './services/history';
import type { DnsServer, HistoryEntry, ServerResult, TestPhase } from './types';
import BenchmarkView from './views/BenchmarkView';
import ChartsView from './views/ChartsView';
import DetailsView from './views/DetailsView';
import DetectiveView from './views/DetectiveView';
import HistoryView from './views/HistoryView';
import LearnView from './views/LearnView';

const DOMAIN_RE = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*\.[A-Za-z]{2,}$/;

function validate(domain: string, selectedCount: number, tests: number, timeout: number): string | null {
  const d = domain.trim().toLowerCase();
  if (d.length < 3 || d.length > 253 || !DOMAIN_RE.test(d)) return 'Enter a valid domain, e.g. google.com';
  if (selectedCount === 0) return 'Select at least one DNS server.';
  if (!Number.isInteger(tests) || tests < 1 || tests > 30) return 'Number of tests must be between 1 and 30.';
  if (!Number.isInteger(timeout) || timeout < 500 || timeout > 10000) return 'Timeout must be between 500 and 10000 ms.';
  return null;
}

function getInitialPage(): NavPage {
  const hash = window.location.hash.replace(/^#/, '') as NavPage;
  const valid: NavPage[] = ['benchmark', 'race', 'charts', 'details', 'detective', 'history', 'learn'];
  return valid.includes(hash) ? hash : 'benchmark';
}

export default function App() {
  const backendOk = useBackendHealth();

  const [activePage, setActivePage] = useState<NavPage>(getInitialPage);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [servers, setServers] = useState<DnsServer[]>([...DEFAULT_SERVERS]);
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_SERVERS.map((s) => s.ip)));
  const [domain, setDomain] = useState('google.com');
  const [tests, setTests] = useState(10);
  const [timeout, setTimeout] = useState(3000);

  const [phase, setPhase] = useState<TestPhase>('idle');
  const [results, setResults] = useState<ServerResult[] | null>(null);
  const [testedDomain, setTestedDomain] = useState('google.com');
  const [testedTests, setTestedTests] = useState(10);
  const [testedTimeout, setTestedTimeout] = useState(3000);
  const [error, setError] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  // Sync active page with URL hash
  useEffect(() => {
    window.location.hash = activePage;
  }, [activePage]);

  // Listen for browser back/forward buttons
  useEffect(() => {
    const onHashChange = () => {
      const p = getInitialPage();
      setActivePage(p);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Fetch server list from backend on mount
  useEffect(() => {
    fetchServers()
      .then((list) => {
        if (list.length > 0) {
          setServers(list);
          setSelected((prev) => {
            if (prev.size > 0) return prev;
            return new Set(list.map((s) => s.ip));
          });
        }
      })
      .catch(() => {
        /* offline — keep built-in defaults */
      });
  }, []);

  const toggleServer = useCallback((ip: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ip)) next.delete(ip);
      else next.add(ip);
      return next;
    });
  }, []);

  const startTest = useCallback(async () => {
    const v = validate(domain, selected.size, tests, timeout);
    setClientError(v);
    if (v) {
      if (activePage !== 'benchmark') setActivePage('benchmark');
      document.getElementById('configure')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase('testing');
    setError(null);
    setResults(null);
    setElapsed(0);
    const t0 = Date.now();
    timerRef.current = window.setInterval(() => setElapsed((Date.now() - t0) / 1000), 250);

    try {
      const payload = {
        domain: domain.trim().toLowerCase(),
        servers: servers.filter((s) => selected.has(s.ip)).map((s) => ({ name: s.shortName || s.name, ip: s.ip })),
        tests,
        timeout,
      };
      const data = await runDnsTest(payload, controller.signal);
      setResults(data.results);
      setTestedDomain(data.domain);
      setTestedTests(data.testsPerServer);
      setTestedTimeout(data.timeoutMs);
      setPhase('done');

      const fastest = fastestOf(data.results);
      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: new Date().toISOString(),
        domain: data.domain,
        testsPerServer: data.testsPerServer,
        serverCount: data.results.length,
        fastestName: fastest ? fastest.name : 'None (all failed)',
        fastestIp: fastest ? fastest.ip : '—',
        fastestAvg: fastest ? fastest.average : null,
        results: data.results,
      };
      setHistory(saveHistoryEntry(entry));
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError((e as Error).message || 'Test failed. Please try again.');
      setPhase('error');
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [activePage, domain, selected, servers, tests, timeout]);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleRestoreHistory = (entry: HistoryEntry) => {
    setResults(entry.results);
    setTestedDomain(entry.domain);
    setTestedTests(entry.testsPerServer);
    setPhase('done');
    setActivePage('race');
  };

  return (
    <div className="flex min-h-screen bg-[#070b16] text-slate-200">
      {/* 1. Professional Fixed Left Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        backendOk={backendOk}
        results={results}
        domain={testedDomain || domain}
        isTesting={phase === 'testing'}
        onQuickBenchmark={startTest}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Dashboard Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activePage={activePage}
          setActivePage={setActivePage}
          domain={testedDomain || domain}
          isTesting={phase === 'testing'}
          onStartTest={startTest}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          backendOk={backendOk}
          hasResults={results !== null && results.length > 0}
        />

        {/* 2. Independent Feature Pages / Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activePage === 'benchmark' && (
            <BenchmarkView
              servers={servers}
              selected={selected}
              onToggle={toggleServer}
              onSelectAll={() => setSelected(new Set(servers.map((s) => s.ip)))}
              onClearAll={() => setSelected(new Set())}
              domain={domain}
              setDomain={setDomain}
              tests={tests}
              setTests={setTests}
              timeout={timeout}
              setTimeout={setTimeout}
              onStartTest={startTest}
              busy={phase === 'testing'}
              clientError={clientError}
              backendOk={backendOk}
              elapsed={elapsed}
              phase={phase}
              error={error}
              results={results}
              testedDomain={testedDomain}
              onNavigateToRace={() => setActivePage('race')}
              onNavigateToCharts={() => setActivePage('charts')}
            />
          )}

          {/* 3. New DNS Race Replay Feature */}
          {activePage === 'race' && (
            <DnsRaceReplay
              results={results}
              domain={testedDomain || domain}
              onRunLiveTest={() => {
                setActivePage('benchmark');
                startTest();
              }}
            />
          )}

          {activePage === 'charts' && (
            <ChartsView
              results={results}
              domain={testedDomain || domain}
              onNavigateToBenchmark={() => setActivePage('benchmark')}
            />
          )}

          {activePage === 'details' && (
            <DetailsView
              results={results}
              domain={testedDomain || domain}
              onNavigateToBenchmark={() => setActivePage('benchmark')}
            />
          )}

          {activePage === 'detective' && (
            <DetectiveView
              results={results}
              history={history}
              domain={testedDomain || domain}
              testsPerServer={testedTests}
              timeoutMs={testedTimeout}
              onNavigateToBenchmark={() => setActivePage('benchmark')}
            />
          )}

          {activePage === 'history' && (
            <HistoryView
              history={history}
              onClear={() => {
                clearHistory();
                setHistory([]);
              }}
              onRestoreEntry={handleRestoreHistory}
              onNavigateToBenchmark={() => setActivePage('benchmark')}
            />
          )}

          {activePage === 'learn' && <LearnView />}
        </main>

        <Footer />
      </div>
    </div>
  );
}
