import type { HistoryEntry } from '../types';

const KEY = 'dns-speed-history-v1';
const MAX_ENTRIES = 20;

/** Runtime shape check — a corrupt/old localStorage entry must never crash the render. */
function isValidEntry(e: unknown): e is HistoryEntry {
  if (!e || typeof e !== 'object') return false;
  const o = e as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.date === 'string' &&
    typeof o.domain === 'string' &&
    typeof o.fastestName === 'string' &&
    typeof o.fastestIp === 'string' &&
    (typeof o.fastestAvg === 'number' || o.fastestAvg === null) &&
    Array.isArray(o.results)
  );
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry);
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry: HistoryEntry): HistoryEntry[] {
  const current = loadHistory();
  const next = [entry, ...current].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full/blocked — ignore */
  }
  return next;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
