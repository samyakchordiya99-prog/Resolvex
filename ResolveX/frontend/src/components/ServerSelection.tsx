import type { DnsServer } from '../types';

interface Props {
  servers: DnsServer[];
  selected: Set<string>;
  onToggle: (ip: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  disabled?: boolean;
}

const ACCENT: Record<string, string> = {
  '1.1.1.1': 'from-orange-400/20 to-amber-500/5 border-orange-400/30',
  '8.8.8.8': 'from-blue-400/20 to-sky-500/5 border-blue-400/30',
  '9.9.9.9': 'from-violet-400/20 to-purple-500/5 border-violet-400/30',
  '94.140.14.14': 'from-emerald-400/20 to-teal-500/5 border-emerald-400/30',
};

export default function ServerSelection({ servers, selected, onToggle, onSelectAll, onClearAll, disabled }: Props) {
  return (
    <section id="servers" aria-labelledby="servers-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="servers-title" className="text-2xl font-bold text-white">1 · Select DNS servers</h2>
          <p className="mt-1 text-sm text-slate-400">Choose which providers to benchmark on your network.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onSelectAll} disabled={disabled} className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-cyan-400/50 hover:text-white disabled:opacity-50">
            Select All
          </button>
          <button type="button" onClick={onClearAll} disabled={disabled} className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-cyan-400/50 hover:text-white disabled:opacity-50">
            Clear All
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="DNS providers">
        {servers.map((s) => {
          const checked = selected.has(s.ip);
          return (
            <label
              key={s.ip}
              className={`relative cursor-pointer rounded-2xl border bg-gradient-to-b p-4 transition focus-within:outline focus-within:outline-2 focus-within:outline-cyan-400 ${
                checked ? (ACCENT[s.ip] ?? 'from-cyan-400/20 border-cyan-400/40') + ' border shadow-lg' : 'border-slate-800 bg-slate-900 opacity-80 hover:opacity-100'
              } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => onToggle(s.ip)}
                aria-label={`Select ${s.name} (${s.ip})`}
                disabled={disabled}
              />
              <span className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 items-center justify-center rounded-md border text-[11px] font-bold ${
                      checked ? 'border-cyan-300 bg-cyan-400 text-slate-950' : 'border-slate-600 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span className="text-sm font-semibold text-white">{s.shortName}</span>
                </span>
                <span
                  role="status"
                  aria-label={checked ? `${s.shortName} selected` : `${s.shortName} not selected`}
                  className={`h-2.5 w-2.5 rounded-full ${checked ? 'bg-emerald-400' : 'bg-slate-600'}`}
                />
              </span>
              <span className="mt-2 block font-mono text-sm text-cyan-300">{s.ip}</span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-400">{s.description}</span>
              <span className="mt-1 block text-[11px] text-slate-500">{s.name}</span>
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500" role="status">
        {selected.size} of {servers.length} selected
      </p>
    </section>
  );
}
