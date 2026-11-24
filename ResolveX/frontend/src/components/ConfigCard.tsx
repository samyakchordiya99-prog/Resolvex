import { DEFAULT_DOMAINS, TEST_COUNT_OPTIONS } from '../data/servers';

interface Props {
  domain: string;
  setDomain: (v: string) => void;
  tests: number;
  setTests: (v: number) => void;
  timeout: number;
  setTimeout: (v: number) => void;
  onStart: () => void;
  busy: boolean;
  canStart: boolean;
  validationError: string | null;
}

export default function ConfigCard({ domain, setDomain, tests, setTests, timeout, setTimeout, onStart, busy, canStart, validationError }: Props) {
  return (
    <section id="configure" aria-labelledby="configure-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-2 sm:px-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
        <h2 id="configure-title" className="text-2xl font-bold text-white">2 · Test configuration</h2>
        <p className="mt-1 text-sm text-slate-400">Same domain, same test count, and same timeout are used for every server for a fair comparison.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="domain-input" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Domain to resolve
            </label>
            <input
              id="domain-input"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="google.com"
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 disabled:opacity-60"
            />
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Suggested domains">
              {DEFAULT_DOMAINS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDomain(d)}
                  disabled={busy}
                  className={`rounded-full border px-2.5 py-1 font-mono text-[11px] transition disabled:opacity-50 ${
                    domain.trim().toLowerCase() === d ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-200' : 'border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="tests-select" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Queries per server
            </label>
            <select
              id="tests-select"
              value={tests}
              onChange={(e) => setTests(Number(e.target.value))}
              disabled={busy}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 disabled:opacity-60"
            >
              {TEST_COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} tests
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">More queries = more stable average, but slower.</p>
          </div>

          <div>
            <label htmlFor="timeout-input" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Timeout per query (ms)
            </label>
            <input
              id="timeout-input"
              type="number"
              min={500}
              max={10000}
              step={500}
              value={timeout}
              onChange={(e) => setTimeout(Number(e.target.value))}
              disabled={busy}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-white focus:border-cyan-400 disabled:opacity-60"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Recommended: 2000–5000 ms.</p>
          </div>
        </div>

        {validationError && (
          <p role="alert" className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {validationError}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            disabled={busy || !canStart}
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-8 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {busy ? 'Testing… please wait' : '▶ Start Test'}
          </button>
          {!canStart && !busy && <span className="text-xs text-amber-300">Select at least one DNS server to start.</span>}
        </div>
      </div>
    </section>
  );
}
