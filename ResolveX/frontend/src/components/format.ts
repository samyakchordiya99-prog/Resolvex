import type { ServerResult } from '../types';

export function fmt(v: number | null, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v.toFixed(digits)} ms`;
}

export function statusFor(r: ServerResult, fastestIp: string | null): { label: string; cls: string } {
  if (r.successRate < 50 || r.average === null) return { label: 'Poor', cls: 'border-red-500/40 bg-red-500/10 text-red-300' };
  if (fastestIp !== null && r.ip === fastestIp) return { label: 'Fastest', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' };
  if (r.successRate >= 95) return { label: 'Good', cls: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' };
  return { label: 'Unstable', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300' };
}

export function fastestOf(results: ServerResult[]): ServerResult | null {
  const ok = results.filter((r) => r.average !== null);
  if (ok.length === 0) return null;
  return ok.reduce((a, b) => (a.average! <= b.average! ? a : b));
}
