import type { ServerResult } from '../types';

export const DEFAULT_SERVERS = [
  {
    id: 'cloudflare',
    name: 'Cloudflare DNS',
    shortName: 'Cloudflare',
    ip: '1.1.1.1',
    description: 'Fast public DNS resolver with a privacy focus.',
  },
  {
    id: 'google',
    name: 'Google Public DNS',
    shortName: 'Google',
    ip: '8.8.8.8',
    description: 'Widely used public resolver with global anycast.',
  },
  {
    id: 'quad9',
    name: 'Quad9',
    shortName: 'Quad9',
    ip: '9.9.9.9',
    description: 'Security-focused resolver blocking malicious domains.',
  },
  {
    id: 'adguard',
    name: 'AdGuard DNS',
    shortName: 'AdGuard',
    ip: '94.140.14.14',
    description: 'Privacy-friendly resolver with filtering options.',
  },
] as const;

export const DEFAULT_DOMAINS = ['google.com', 'cloudflare.com', 'github.com', 'netflix.com'];

export const TEST_COUNT_OPTIONS = [5, 10, 20];

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '';

export const DEMO_RESULTS: ServerResult[] = [
  {
    name: 'Cloudflare DNS',
    ip: '1.1.1.1',
    average: 13.8,
    minimum: 11.2,
    maximum: 18.4,
    median: 13.1,
    successRate: 100,
    successfulTests: 10,
    failedTests: 0,
    totalTests: 10,
    latencies: [12.1, 14.5, 11.2, 13.4, 15.1, 12.8, 18.4, 13.0, 14.2, 13.3],
  },
  {
    name: 'Google Public DNS',
    ip: '8.8.8.8',
    average: 19.4,
    minimum: 16.5,
    maximum: 26.2,
    median: 18.9,
    successRate: 100,
    successfulTests: 10,
    failedTests: 0,
    totalTests: 10,
    latencies: [17.8, 19.2, 16.5, 21.0, 18.4, 26.2, 18.9, 17.5, 19.1, 19.4],
  },
  {
    name: 'Quad9',
    ip: '9.9.9.9',
    average: 27.6,
    minimum: 22.1,
    maximum: 35.8,
    median: 26.4,
    successRate: 100,
    successfulTests: 10,
    failedTests: 0,
    totalTests: 10,
    latencies: [24.2, 28.1, 22.1, 31.4, 25.6, 26.4, 27.8, 35.8, 26.9, 27.7],
  },
  {
    name: 'AdGuard DNS',
    ip: '94.140.14.14',
    average: 36.2,
    minimum: 29.5,
    maximum: 48.0,
    median: 34.8,
    successRate: 100,
    successfulTests: 10,
    failedTests: 0,
    totalTests: 10,
    latencies: [32.4, 38.0, 29.5, 48.0, 35.1, 33.9, 36.5, 34.8, 37.2, 36.6],
  },
];
