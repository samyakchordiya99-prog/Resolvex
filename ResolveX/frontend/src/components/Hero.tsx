export default function Hero({ onStart }: { onStart: () => void }) {
  const steps = ['Your Device', 'DNS Query', 'DNS Servers', 'Response Time', 'Comparison'];
  return (
    <section className="bg-grid relative overflow-hidden" aria-labelledby="hero-title">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
              <span aria-hidden="true">●</span> Live DNS measurement · Real resolver queries
            </p>
            <h1 id="hero-title" className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              DNS Speed Comparison Tool
            </h1>
            <p className="mt-3 text-lg font-medium text-cyan-300">Test. Compare. Find the fastest DNS for your network.</p>
            <p className="mt-4 max-w-xl text-slate-300">
              Measure DNS response time, reliability, and performance across popular DNS providers — directly on your current
              network. Problem: you don&apos;t know which DNS is fastest for you. Solution: this tool queries each provider
              and compares real latency.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onStart}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:brightness-110 active:scale-[0.98]"
              >
                Start DNS Test ↓
              </button>
              <a
                href="#learn"
                className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500"
              >
                What is DNS?
              </a>
            </div>
            <p className="mt-4 text-xs text-slate-500">Measures DNS lookup performance — not download/bandwidth speed.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl" aria-label="How the tool works">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">How it works</p>
            <ol className="space-y-0">
              {steps.map((s, i) => (
                <li key={s} className="flex flex-col items-stretch">
                  <span className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-200">
                    <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-xs font-bold text-cyan-300">
                      {i + 1}
                    </span>
                    {s}
                  </span>
                  {i < steps.length - 1 && (
                    <span aria-hidden="true" className="mx-auto py-0.5 font-mono text-cyan-500">
                      ↓
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
