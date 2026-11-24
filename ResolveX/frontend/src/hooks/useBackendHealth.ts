import { useEffect, useState } from 'react';
import { checkHealth } from '../services/api';

/** Polls GET /api/health; null = not yet known. */
export function useBackendHealth(pollMs = 15000) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    checkHealth().then((v) => {
      if (alive) setOk(v);
    });
    const id = setInterval(() => {
      checkHealth().then((v) => {
        if (alive) setOk(v);
      });
    }, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pollMs]);
  return ok;
}
