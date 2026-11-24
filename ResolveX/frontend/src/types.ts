export interface DnsServer {
  id: string;
  name: string;
  shortName: string;
  ip: string;
  description: string;
}

export interface ServerResult {
  name: string;
  ip: string;
  average: number | null;
  minimum: number | null;
  maximum: number | null;
  median: number | null;
  successRate: number;
  successfulTests: number;
  failedTests: number;
  totalTests: number;
  /** Per-test latency in ms; null = failed/timeout for that attempt */
  latencies: (number | null)[];
  errors?: (string | null)[];
}

export interface TestResponse {
  domain: string;
  testsPerServer: number;
  timeoutMs: number;
  startedAt: string;
  results: ServerResult[];
}

export interface TestRequest {
  domain: string;
  servers: { name: string; ip: string }[];
  tests: number;
  timeout: number;
}

export interface HistoryEntry {
  id: string;
  date: string;
  domain: string;
  testsPerServer: number;
  serverCount: number;
  fastestName: string;
  fastestIp: string;
  fastestAvg: number | null;
  results: ServerResult[];
}

export type TestPhase = 'idle' | 'testing' | 'done' | 'error';
