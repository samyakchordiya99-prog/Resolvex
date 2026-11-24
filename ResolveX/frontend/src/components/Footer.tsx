export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-800 bg-slate-950/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-md">
            <p className="text-sm font-semibold text-white">DNS Speed Comparison Tool</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              A college networking project: measure real DNS resolution latency across popular providers and find the fastest
              resolver for your current network. Results are environment-dependent and vary with routing, location, and load.
            </p>
          </div>
          <nav aria-label="Footer" className="flex gap-5 text-xs text-slate-400">
            <a href="#servers" className="hover:text-white">Servers</a>
            <a href="#configure" className="hover:text-white">Configure</a>
            <a href="#results" className="hover:text-white">Results</a>
            <a href="#detective" className="hover:text-white">Detective</a>
            <a href="#learn" className="hover:text-white">Learn</a>
          </nav>
        </div>
        <p className="mt-6 border-t border-slate-800/80 pt-4 text-[11px] text-slate-500">
          Methodology: same domain, same test count, same timeout for every server; averages exclude failed queries; servers tested concurrently for fairness.
        </p>
      </div>
    </footer>
  );
}
