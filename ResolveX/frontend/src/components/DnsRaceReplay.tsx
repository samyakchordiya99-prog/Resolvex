import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_RESULTS } from '../data/servers';
import type { ServerResult } from '../types';

interface Props {
  results: ServerResult[] | null;
  domain: string;
  onRunLiveTest?: () => void;
}

const TRACK_COLORS = [
  { border: 'border-cyan-500/40', bg: 'bg-cyan-500/10', glow: 'shadow-cyan-500/30', accent: '#06b6d4', text: 'text-cyan-300', light: 'bg-cyan-400' },
  { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/30', accent: '#10b981', text: 'text-emerald-300', light: 'bg-emerald-400' },
  { border: 'border-purple-500/40', bg: 'bg-purple-500/10', glow: 'shadow-purple-500/30', accent: '#a855f7', text: 'text-purple-300', light: 'bg-purple-400' },
  { border: 'border-amber-500/40', bg: 'bg-amber-500/10', glow: 'shadow-amber-500/30', accent: '#f59e0b', text: 'text-amber-300', light: 'bg-amber-400' },
  { border: 'border-blue-500/40', bg: 'bg-blue-500/10', glow: 'shadow-blue-500/30', accent: '#3b82f6', text: 'text-blue-300', light: 'bg-blue-400' },
  { border: 'border-rose-500/40', bg: 'bg-rose-500/10', glow: 'shadow-rose-500/30', accent: '#f43f5e', text: 'text-rose-300', light: 'bg-rose-400' },
];

export default function DnsRaceReplay({ results: liveResults, domain, onRunLiveTest }: Props) {
  // Use live results if available, otherwise default to interactive demo results
  const [useDemo, setUseDemo] = useState(!liveResults || liveResults.length === 0);
  const activeResults = useMemo(() => {
    if (useDemo || !liveResults || liveResults.length === 0) return DEMO_RESULTS;
    return liveResults;
  }, [useDemo, liveResults]);

  // Query selection: 'avg' or query attempt index (0, 1, 2...)
  const [selectedAttempt, setSelectedAttempt] = useState<'avg' | number>('avg');

  // Max queries available across results
  const maxAttempts = useMemo(() => {
    return Math.max(...activeResults.map((r) => r.latencies.length), 1);
  }, [activeResults]);

  // Extract latencies for the currently selected attempt
  const raceData = useMemo(() => {
    return activeResults.map((server, idx) => {
      let latency: number | null;
      if (selectedAttempt === 'avg') {
        latency = server.average;
      } else {
        const val = server.latencies[selectedAttempt];
        latency = typeof val === 'number' ? val : null;
      }

      return {
        ...server,
        latency,
        theme: TRACK_COLORS[idx % TRACK_COLORS.length],
      };
    });
  }, [activeResults, selectedAttempt]);

  // Max latency to calibrate track time
  const maxLatency = useMemo(() => {
    const valid = raceData.map((d) => d.latency).filter((l): l is number => typeof l === 'number' && l > 0);
    if (valid.length === 0) return 100;
    return Math.max(...valid, 40);
  }, [raceData]);

  // Animation states
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  // progress goes from 0 to 100 representing virtual race time (0 to maxLatency ms)
  const [currentMs, setCurrentMs] = useState(0);

  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Scaled duration in real seconds (e.g., scale maxLatency to 3.5 seconds for dramatic race viewing)
  const baseDurationSec = 3.2;

  const resetRace = useCallback(() => {
    setIsPlaying(false);
    setCurrentMs(0);
    lastTimeRef.current = null;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  }, []);

  const startRace = useCallback(() => {
    if (currentMs >= maxLatency) {
      setCurrentMs(0);
    }
    setIsPlaying(true);
  }, [currentMs, maxLatency]);

  // Animation frame loop
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current !== null) {
        const delta = time - lastTimeRef.current;
        // virtual ms added = delta * (maxLatency / (baseDurationSec * 1000)) * speed
        const msPerSec = maxLatency / baseDurationSec;
        const addedMs = (delta / 1000) * msPerSec * speed;

        setCurrentMs((prev) => {
          const next = prev + addedMs;
          if (next >= maxLatency) {
            setIsPlaying(false);
            return maxLatency;
          }
          return next;
        });
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, maxLatency, speed]);

  // Calculate live rankings based on who crossed finish line first
  const rankings = useMemo(() => {
    return [...raceData]
      .sort((a, b) => {
        if (a.latency === null) return 1;
        if (b.latency === null) return -1;
        return a.latency - b.latency;
      })
      .map((item, idx) => {
        const hasFinished = item.latency !== null && currentMs >= item.latency;
        return {
          ...item,
          place: idx + 1,
          hasFinished,
        };
      });
  }, [raceData, currentMs]);

  const winner = rankings[0]?.latency !== null ? rankings[0] : null;
  const runnerUp = rankings[1]?.latency !== null ? rankings[1] : null;
  const leadDelta = winner && runnerUp ? (runnerUp.latency! - winner.latency!).toFixed(1) : null;

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-[#0a0f1d] to-slate-900/90 p-5 shadow-xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-lg">🏎️</span>
              <h2 className="text-xl font-bold text-white tracking-tight">DNS Race Replay Arena</h2>
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                LIVE SIMULATION
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Watch real DNS query packets race across the network wire to resolvers and back to your client.
            </p>
          </div>

          {/* Mode toggle (Live Data vs Demo) */}
          <div className="flex items-center gap-3">
            {liveResults && liveResults.length > 0 ? (
              <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() => { setUseDemo(false); resetRace(); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    !useDemo ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Live Benchmark Data
                </button>
                <button
                  type="button"
                  onClick={() => { setUseDemo(true); resetRace(); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    useDemo ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Demo Mode
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
                  Showing Demo Data
                </span>
                {onRunLiveTest && (
                  <button
                    type="button"
                    onClick={onRunLiveTest}
                    className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:brightness-110"
                  >
                    Run Live Test
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Playback Controls & Scrubber */}
        <div className="mt-6 border-t border-slate-800/80 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Play, Pause, Reset Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={isPlaying ? () => setIsPlaying(false) : startRace}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:brightness-110 active:scale-95"
              >
                <span>{isPlaying ? '⏸️' : '▶️'}</span>
                <span>{isPlaying ? 'Pause Race' : currentMs >= maxLatency ? 'Replay Race' : 'Start Race'}</span>
              </button>

              <button
                type="button"
                onClick={resetRace}
                className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white transition"
                title="Reset to start"
              >
                🔄 Reset
              </button>

              {/* Speed Multipliers */}
              <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1">
                {[0.5, 1, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-semibold transition ${
                      speed === s ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Query Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1.5 text-xs">
              <span className="px-2 text-[11px] font-semibold uppercase text-slate-400">Dataset:</span>
              <button
                type="button"
                onClick={() => { setSelectedAttempt('avg'); resetRace(); }}
                className={`rounded-lg px-3 py-1 font-semibold transition ${
                  selectedAttempt === 'avg' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                Average Sprint
              </button>
              {Array.from({ length: Math.min(maxAttempts, 5) }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setSelectedAttempt(i); resetRace(); }}
                  className={`rounded-lg px-2.5 py-1 font-mono transition ${
                    selectedAttempt === i ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  #{i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Timeline Scrubber */}
          <div className="mt-5 space-y-1.5">
            <div className="flex items-center justify-between font-mono text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Elapsed Timeline: <strong className="text-white">{currentMs.toFixed(1)} ms</strong></span>
              </span>
              <span>Max Window: {maxLatency.toFixed(1)} ms</span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-75"
                style={{ width: `${Math.min((currentMs / maxLatency) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Race Tracks Arena */}
      <div className="rounded-2xl border border-slate-800 bg-[#070b16] p-5 shadow-2xl sm:p-6">
        {/* Track Headers */}
        <div className="mb-4 flex items-center justify-between border-b border-slate-800/80 pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <div className="flex items-center gap-2">
            <span>🏁 Network Starting Grid</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-cyan-300">
              Host: {domain}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hidden sm:inline">Resolver Processing</span>
            <span>Finish Line</span>
          </div>
        </div>

        {/* Lanes List */}
        <div className="space-y-4">
          {raceData.map((server, idx) => {
            const hasLatency = server.latency !== null && server.latency > 0;
            // Progress percentage along the lane: (currentMs / latency) * 100, capped at 100%
            const progress = hasLatency ? Math.min((currentMs / server.latency!) * 100, 100) : 0;
            const finished = hasLatency && currentMs >= server.latency!;
            const rankingInfo = rankings.find((r) => r.ip === server.ip);
            const place = rankingInfo?.place || idx + 1;

            return (
              <div
                key={server.ip}
                className={`relative overflow-hidden rounded-2xl border bg-slate-950/70 p-4 transition-all ${
                  finished ? `${server.theme.border} bg-slate-900/60 shadow-lg ${server.theme.glow}` : 'border-slate-800/80'
                }`}
              >
                {/* Provider Meta Bar */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${
                        place === 1 && finished
                          ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/40 ring-2 ring-amber-300'
                          : place === 2 && finished
                          ? 'bg-slate-300 text-slate-950'
                          : place === 3 && finished
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {finished ? (place === 1 ? '1' : place === 2 ? '2' : place === 3 ? '3' : place) : idx + 1}
                    </span>
                    <div>
                      <span className="font-semibold text-white text-sm">{server.name}</span>
                      <span className="ml-2 font-mono text-xs text-slate-400">{server.ip}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    {finished ? (
                      <span className={`font-bold ${server.theme.text} flex items-center gap-1.5`}>
                        <span>✓ Finished</span>
                        <span>{server.latency?.toFixed(1)} ms</span>
                      </span>
                    ) : hasLatency ? (
                      <span className="text-slate-400">Target: {server.latency?.toFixed(1)} ms</span>
                    ) : (
                      <span className="text-red-400">Packet Dropped</span>
                    )}
                  </div>
                </div>

                {/* Visual Racing Track Lane */}
                <div className="relative h-10 w-full rounded-xl border border-slate-800/80 bg-slate-900/90 overflow-hidden flex items-center px-2">
                  {/* Background Track Grid Lines */}
                  <div className="pointer-events-none absolute inset-0 flex justify-between px-8 opacity-10">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="h-full w-px bg-white" />
                    ))}
                  </div>

                  {/* Midpoint: Resolver node marker */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-cyan-500/20 flex flex-col justify-between items-center"
                    style={{ left: '50%' }}
                  >
                    <span className="text-[8px] font-mono text-cyan-400/60 uppercase">Resolver</span>
                  </div>

                  {/* Finish Line Ribbon */}
                  <div className="absolute right-0 top-0 bottom-0 w-5 border-l border-amber-400/40 bg-[repeating-linear-gradient(45deg,#000,#000_4px,#fbbf24_4px,#fbbf24_8px)] opacity-70" />

                  {/* Track Progress Glow Fill */}
                  <div
                    className="absolute left-0 top-0 bottom-0 transition-all duration-75 opacity-25"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: server.theme.accent,
                    }}
                  />

                  {/* Animated Racing Packet */}
                  {hasLatency ? (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 transition-all duration-75 flex items-center z-10"
                      style={{
                        left: `calc(${progress}% - ${progress > 90 ? '24px' : '0px'})`,
                      }}
                    >
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-xl shadow-lg transition-transform ${
                          finished ? 'scale-110 shadow-emerald-400/50' : 'animate-pulse'
                        }`}
                        style={{
                          backgroundColor: server.theme.accent,
                          boxShadow: `0 0 12px ${server.theme.accent}`,
                        }}
                      >
                        <span className="text-xs text-slate-950 font-bold">
                          {finished ? '🏁' : '⚡'}
                        </span>
                      </div>
                      {/* Trailing Tail */}
                      {!finished && progress > 5 && (
                        <div
                          className="h-1 w-6 rounded-l -ml-1 opacity-70"
                          style={{
                            background: `linear-gradient(to left, ${server.theme.accent}, transparent)`,
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="absolute left-1/3 top-1/2 -translate-y-1/2 font-mono text-xs text-red-400">
                      ⚠️ Request timed out
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Winner Podium & Telemetry Comparison */}
      {winner && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Winner Card */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 p-5 shadow-xl md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
                  <span>🥇</span>
                  <span>DNS GRAND PRIX WINNER</span>
                </span>
                <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{winner.name}</h3>
                <p className="font-mono text-sm text-slate-300">{winner.ip}</p>
              </div>

              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Benchmark Time</p>
                <p className="font-mono text-4xl font-black text-amber-300 sm:text-5xl">
                  {winner.latency?.toFixed(1)} <span className="text-lg">ms</span>
                </p>
                {leadDelta && (
                  <p className="mt-1 text-xs font-medium text-emerald-400">
                    ⚡ {leadDelta} ms faster than 2nd place
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 border-t border-slate-800/80 pt-4 flex flex-wrap gap-4 text-xs text-slate-400">
              <div>
                <span className="text-slate-400">Resolution Status:</span>{' '}
                <span className="text-emerald-400 font-semibold">100% Reliable</span>
              </div>
              <div>
                <span className="text-slate-400">Target Host:</span>{' '}
                <span className="font-mono text-cyan-300">{domain}</span>
              </div>
              <div>
                <span className="text-slate-400">Query Mode:</span>{' '}
                <span className="text-slate-200">
                  {selectedAttempt === 'avg' ? 'Aggregated Average' : `Attempt #${selectedAttempt + 1}`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Standings Leaderboard */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Live Standings Board
            </h4>
            <div className="space-y-2.5">
              {rankings.map((r, i) => (
                <div
                  key={r.ip}
                  className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md font-bold text-[10px] ${
                        i === 0
                          ? 'bg-amber-400 text-slate-950'
                          : i === 1
                          ? 'bg-slate-300 text-slate-950'
                          : i === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="font-medium text-slate-200 truncate max-w-[110px]">{r.name}</span>
                  </div>
                  <span className="font-mono font-bold text-cyan-300">
                    {r.latency !== null ? `${r.latency.toFixed(1)} ms` : 'FAILED'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
