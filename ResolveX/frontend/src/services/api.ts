import { API_BASE } from '../data/servers';
import type { DnsServer, TestRequest, TestResponse } from '../types';

function base(): string {
  // Empty string => same-origin (Vite proxies /api to backend in dev)
  return API_BASE.replace(/\/$/, '');
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data.error === 'string') return data.error;
  } catch {
    /* fall through */
  }
  if (res.status === 0 || res.status >= 500) return 'Backend unavailable. Make sure the backend server is running.';
  return `Request failed with status ${res.status}.`;
}

export async function fetchServers(): Promise<DnsServer[]> {
  const res = await fetch(`${base()}/api/servers`);
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.servers as DnsServer[];
}

export async function runDnsTest(payload: TestRequest, signal?: AbortSignal): Promise<TestResponse> {
  let res: Response;
  try {
    res = await fetch(`${base()}/api/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new Error('Cannot reach the backend. Start it with `npm start` in /backend (port 5000).');
  }
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as TestResponse;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${base()}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
