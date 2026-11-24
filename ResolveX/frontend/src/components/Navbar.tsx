import { useState } from 'react';

export default function Navbar({ backendOk }: { backendOk: boolean | null }) {
  const [open, setOpen] = useState(false);
  const links = [
    { href: '#servers', label: 'Servers' },
    { href: '#configure', label: 'Configure' },
    { href: '#results', label: 'Results' },
    { href: '#history', label: 'History' },
    { href: '#detective', label: 'Detective' },
    { href: '#learn', label: 'Learn' },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#070b16]/90 backdrop-blur">
      <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-bold text-slate-950">
            ◈
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-white">DNS Speed Comparison</span>
            <span className="block text-[11px] tracking-wide text-slate-400">Find the fastest DNS for your network</span>
          </span>
        </a>
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
              {l.label}
            </a>
          ))}
          <span
            role="status"
            title={backendOk === null ? 'Checking backend…' : backendOk ? 'Backend connected' : 'Backend unreachable'}
            className={`ml-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
              backendOk ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : backendOk === false ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}
          >
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${backendOk ? 'bg-emerald-400' : backendOk === false ? 'bg-red-400' : 'bg-slate-500'}`} />
            {backendOk ? 'API online' : backendOk === false ? 'API offline' : 'Checking…'}
          </span>
        </div>
        <button
          type="button"
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 md:hidden"
          aria-expanded={open}
          aria-label="Toggle navigation menu"
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
      </nav>
      {open && (
        <div className="border-t border-slate-800 px-4 py-2 md:hidden">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800">
              {l.label}
            </a>
          ))}
          <p role="status" className="px-3 py-2 text-xs text-slate-400">
            Backend:{' '}
            <span className={backendOk ? 'text-emerald-300' : backendOk === false ? 'text-red-300' : 'text-slate-400'}>
              {backendOk ? 'API online' : backendOk === false ? 'API offline' : 'Checking…'}
            </span>
          </p>
        </div>
      )}
    </header>
  );
}
