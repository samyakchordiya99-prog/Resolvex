# ResolveX — DNS Speed Comparison & Network Intelligence Tool

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-success?style=for-the-badge&logo=vercel)](https://resolvex-9dz4-lime.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://resolvex-9dz4-lime.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> 🚀 **Live Demo:** **[https://resolvex-9dz4-lime.vercel.app](https://resolvex-9dz4-lime.vercel.app)**

**Test. Compare. Find the fastest DNS for your network.**

Users generally don't know which DNS server performs fastest on their current network — it depends on ISP, location,
routing, and server load. This tool sends **real DNS queries** to multiple providers, measures response time, and ranks
them by latency and reliability.

> Measures **DNS lookup/response performance only**. It does not claim to increase internet or download speed — DNS
> performance is different from bandwidth.

---

## Features

- 🏎️ **DNS Race Replay**: Real-time animated visualization of query packet transmission across parallel neon tracks with podium placements and millisecond deltas.
- ⚡ **Real Backend DNS Measurement**: Measures real nanosecond socket queries via Node.js `dns.Resolver` pointed directly at provider anycast IPs (not HTTP pings).
- 📊 **Visual Analytics**: Interactive Recharts graphs showing average latency comparisons, success rates, and multi-query jitter lines.
- 🔍 **Query Inspector**: Granular tabular drill-down of every query attempt with min/max/median statistics and **1-click Export to CSV & JSON**.
- 🧠 **AI DNS Detective**: Automated heuristic reasoning engine identifying network anomalies, provider timeouts, and historical baseline regressions.
- ⏱️ **Test History**: Persistent local benchmark archive with a **"Restore & Race"** feature to replay past test runs.
- 📚 **DNS Academy**: Educational guide covering recursive resolvers, anycast routing, latency vs bandwidth, and DoH/DoT.
- 🌐 **Modern Fixed Sidebar Navigation**: Polished, responsive dark-mode dashboard interface.

## Technologies Used

- **Frontend:** React, TypeScript, Tailwind CSS (v4), Recharts, Vite, Vitest (tests)
- **Backend:** Node.js, Express, `dns` (built-in `dns.Resolver` — the Node equivalent of a DNS testing library), `cors`, `dotenv` (tests via built-in `node:test`, zero extra deps)

## Architecture

```text
Frontend (React)
   ↓  POST /api/test { domain, servers, tests, timeout }
Backend API (Express)
   ↓
DNS Testing Service (dns.Resolver per provider IP, hrtime timing, concurrent)
   ↓
DNS Providers (1.1.1.1, 8.8.8.8, 9.9.9.9, 94.140.14.14 …)
   ↓
Results (avg/min/max/median, success rate, per-query latencies)
   ↓
Frontend Dashboard (table + charts + details + history)
```

**Methodology (fairness):** same domain, same test count, same timeout for every server; all servers tested
**concurrently** so none waits longer; failed queries are excluded from averages (never counted as 0 ms).

## Project Structure

```text
.
├── frontend/            # React + TS + Vite + Tailwind + Recharts
│   ├── src/
│   │   ├── components/  # Navbar, Hero, ServerSelection, ConfigCard, TestingProgress,
│   │   │               # ResultsDashboard, ChartsSection, DetailsPanel, HistoryPanel,
│   │   │               # Educational, Footer
│   │   ├── data/        # default servers, domains, API base
│   │   ├── services/    # api.ts (backend client), history.ts (localStorage)
│   │   ├── App.tsx
│   │   └── types.ts
│   └── .env.example     # VITE_API_URL (empty = same-origin / Vite proxy)
├── backend/             # Node.js + Express
│   ├── src/
│   │   ├── routes/api.js     # GET /api/health, GET /api/servers, POST /api/test
│   │   ├── dns/tester.js     # timedResolve / testSingleServer / testAllServers
│   │   ├── dns/servers.js    # provider catalogue (add more here)
│   │   └── utils/validate.js # domain / IP / body validation
│   └── .env.example
├── package.json         # root helper scripts
└── README.md
```

To add a DNS provider, append an entry to `backend/src/dns/servers.js` (and optionally
`frontend/src/data/servers.ts` for offline fallback).

## Installation

Requirements: **Node.js 18+** and npm.

```bash
# from the project root
npm run install:all
# …or individually:
npm --prefix backend install
npm --prefix frontend install
```

## Running the project

You need **both** servers (the backend performs the real DNS measurements — browsers cannot send raw DNS queries).

Terminal 1 — backend (http://localhost:5000):

```bash
cd backend
npm start
```

Terminal 2 — frontend (http://localhost:5173):

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**, select providers, click **Start Test**, and watch real results appear.

Production frontend build:

```bash
npm --prefix frontend run build   # outputs frontend/dist/
npm --prefix frontend run preview # serve the build locally
```

Backend config (`backend/.env`, see `.env.example`): `PORT`, `FRONTEND_ORIGIN`, `DEFAULT_TIMEOUT_MS`, `MAX_TESTS_PER_SERVER`.
Frontend config (`frontend/.env`, see `.env.example`): `VITE_API_URL` — set to the backend URL when not using the dev proxy.

## API Documentation

Base URL: `http://localhost:5000`

### `GET /api/health`

```json
{ "status": "ok", "time": "2026-09-17T04:39:34.141Z" }
```

### `GET /api/servers`

```json
{
  "servers": [
    { "id": "cloudflare", "name": "Cloudflare DNS", "shortName": "Cloudflare", "ip": "1.1.1.1", "description": "..." }
  ]
}
```

### `POST /api/test`

Request:

```json
{
  "domain": "google.com",
  "servers": [
    { "name": "Cloudflare", "ip": "1.1.1.1" },
    { "name": "Google", "ip": "8.8.8.8" }
  ],
  "tests": 10,
  "timeout": 3000
}
```

| Field     | Rules                                              |
| --------- | -------------------------------------------------- |
| `domain`  | valid hostname, e.g. `google.com` (required)       |
| `servers` | 1–10 entries with `name` + valid IPv4 `ip`         |
| `tests`   | integer 1–30 (default 10)                          |
| `timeout` | integer 500–10000 ms (default 3000)                |

Response (sorted by average latency, `null` averages last):

```json
{
  "domain": "google.com",
  "testsPerServer": 10,
  "timeoutMs": 3000,
  "startedAt": "2026-09-17T04:39:36.162Z",
  "results": [
    {
      "name": "Cloudflare",
      "ip": "1.1.1.1",
      "average": 18.4,
      "minimum": 15.2,
      "maximum": 24.8,
      "median": 18.1,
      "successRate": 100,
      "successfulTests": 10,
      "failedTests": 0,
      "totalTests": 10,
      "latencies": [18.2, 17.5, 20.1, 16.8],
      "errors": [null, null, null, null]
    }
  ]
}
```

- `average = sum(successful response times) / successful responses`
- `successRate = successful / total × 100`
- `latencies[i] === null` means that query failed/timed out (`errors[i]` holds the reason).
- Errors return `400 { "error": "..." }` for bad input, `500` for internal failures.

### `GET /api/ai-status`

Tells the frontend whether an AI provider is configured (never exposes keys or URLs):

```json
{ "available": false, "model": null }
```

### `POST /api/explain` (optional — requires AI configuration)

Rephrases one Detective finding into friendlier prose. The deterministic finding is never modified.

Request:

```json
{
  "finding": {
    "id": "timeouts-9.9.9.9",
    "title": "...",
    "summary": "...",
    "severity": "medium",
    "category": "timeouts",
    "evidence": ["..."],
    "possibleCauses": ["..."],
    "recommendedActions": ["..."],
    "limitations": ["..."],
    "confidence": 65
  },
  "context": { "domain": "google.com", "testsPerServer": 10, "timeoutMs": 3000 }
}
```

Response: `200 { "explanation": "..." }`.
Without configuration: `503 { "error": "...", "code": "AI_NOT_CONFIGURED" }`.
Upstream failure: `502 { "error": "...", "code": "AI_UPSTREAM_ERROR" }` (no internals leaked).

Configure via backend env (see `backend/.env.example`): `AI_API_URL` (OpenAI-compatible chat-completions endpoint),
`AI_API_KEY`, `AI_MODEL` (default `gpt-4o-mini`), `AI_TIMEOUT_MS` (default `15000`). Only point these at trusted
endpoints — the URL/key are operator-controlled and never accept user input.

## AI DNS Detective

After (or without) a benchmark, section **4 · AI DNS Detective** analyses the real measurements and explains what they mean.
It is **deterministic — no machine learning is used**. An optional AI layer can rephrase findings if configured (see above);
it never changes results and the app works fully without it.

### How the engine works (`frontend/src/detective/engine.ts`)

- Compares each provider against **peers from the same run** (same domain, test count, timeout — the provider itself is
  excluded from its own peer set so one slow provider can't mask itself) and against its **own historical baseline**
  (previous runs for the same domain from local history).
- Latency verdicts need ≥3 successful queries; stability verdicts (CV, P95) need ≥5.
- Key rules: high latency = avg ≥2× peer median (gap ≥25 ms) or ≥1.5× own baseline (gap ≥15 ms); timeouts escalate
  medium at <95% success and high at <70% (exactly one failure is informational only); instability = CV >0.6 or
  P95 >2.5× median; network-wide fires only when ALL providers degrade together; thin data yields explicit
  `insufficient-data` findings; a clean run yields a positive `healthy` summary instead of invented problems.

### Severity vs confidence

- **Severity** = how urgently you should act: `info` (context only) → `low` → `medium` → `high`.
- **Confidence** (0–100, never 100) = how strongly the data supports the finding: starts at 50, +10 for ≥10 samples,
  +10 when history agrees, +0–15 by effect size, −15 for thin samples. Overall status is `Healthy`, `Needs Attention`
  (any medium/high finding), or `Inconclusive` (only insufficient-data findings).
- **Evidence** is measured fact (real numbers from your run). **Possible causes** are explicitly labelled hypotheses —
  the engine never claims outages, ISP faults, attacks, or security incidents.

## Running tests

No live internet needed — all tests use mocked measurements and local servers.

```bash
cd frontend
npm test        # Vitest: 13 diagnostic-engine tests (healthy, slow provider, timeouts,
                # single-failure, network-wide, no baseline, small samples, invalid data, ...)

cd backend
npm test        # node:test: stats math, request validation, AI endpoint
                # (unconfigured 503, input validation, fake-upstream success, upstream-down 502)
```

Also useful: `npm run lint` (frontend, oxlint — must report zero warnings) and `npm run build` (frontend production build).

## Limitations

- DNS latency varies by network — results are environment-dependent (ISP routing, location, temporary load).
- DNS speed ≠ internet bandwidth/download speed.
- Browsers cannot send raw DNS/UDP queries, so measurements run on the backend — test from a backend near you for representative results.
- Outbound UDP/TCP port 53 must be reachable from the backend host; restrictive firewalls will show timeouts.
- Cached answers (by the resolver or OS) can make repeated queries faster; the tool paces queries to reduce bias but some caching effects are inherent to DNS.
- Detective findings are a snapshot of one run: re-run before acting, especially on `medium`/`High`-confidence calls. The engine
  is rule-based, not ML — it cannot detect causes outside its rules, and its absolute fallback threshold (150 ms / 90% success,
  network-wide check only) is deliberately coarse and confidence-capped.
