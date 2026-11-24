import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ServerResult } from '../types';
import { fastestOf, fmt } from './format';

const BAR_COLORS = ['#34d399', '#22d3ee', '#a78bfa', '#fbbf24', '#f472b6', '#60a5fa'];

function shortName(name: string): string {
  return name.replace(' DNS', '').replace(' Public', '');
}

export default function ChartsSection({ results }: { results: ServerResult[] }) {
  const fastest = fastestOf(results);

  const avgData = useMemo(
    () =>
      results.map((r) => ({
        name: shortName(r.name),
        ip: r.ip,
        // null (not 0!) for fully-failed servers: a 0 bar would misleadingly look like "instant".
        avg: r.average === null ? null : Number(r.average.toFixed(2)),
        success: Number(r.successRate.toFixed(1)),
      })),
    [results],
  );

  const distSeries = useMemo(() => {
    const maxLen = Math.max(...results.map((r) => r.latencies.length));
    return Array.from({ length: maxLen }, (_, i) => {
      const row: Record<string, number | null> = { test: i + 1 };
      results.forEach((r) => {
        row[shortName(r.name)] = r.latencies[i] === null || r.latencies[i] === undefined ? null : Number((r.latencies[i] as number).toFixed(2));
      });
      return row;
    });
  }, [results]);

  const [hidden, setHidden] = useState<Set<string>>(new Set());

  return (
    <section aria-labelledby="charts-title" className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <h2 id="charts-title" className="text-xl font-bold text-white">Latency charts</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-sm font-semibold text-white">Average DNS response time</h3>
          <p className="text-[11px] text-slate-500">Lower is better · ms</p>
          <div className="mt-2 h-64" role="img" aria-label="Bar chart of average DNS latency per provider">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#fff' }}
                  formatter={(value) => (value === null || value === undefined ? ['all queries failed', 'Average'] : [`${value} ms`, 'Average'])}
                />
                <Bar dataKey="avg" name="Average" radius={[6, 6, 0, 0]}>
                  {avgData.map((d, i) => (
                    <Cell
                      key={d.ip}
                      fill={d.avg === null ? '#f87171' : fastest && d.ip === fastest.ip ? '#34d399' : BAR_COLORS[i % BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-sm font-semibold text-white">Success rate</h3>
          <p className="text-[11px] text-slate-500">Share of queries answered within timeout · %</p>
          <div className="mt-2 h-64" role="img" aria-label="Bar chart of success rate per provider">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: '%', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#fff' }}
                  formatter={(value) => [`${value}%`, 'Success rate']}
                />
                <Bar dataKey="success" name="Success rate" radius={[6, 6, 0, 0]}>
                  {avgData.map((d) => (
                    <Cell key={d.ip} fill={d.success >= 95 ? '#34d399' : d.success >= 50 ? '#fbbf24' : '#f87171'} opacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Per-query latency distribution</h3>
            <p className="text-[11px] text-slate-500">Each point is one measured query · gaps = failed query · click legend to toggle</p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Toggle providers in chart">
            {results.map((r, i) => {
              const key = shortName(r.name);
              const off = hidden.has(key);
              return (
                <button
                  key={r.ip}
                  type="button"
                  onClick={() => setHidden((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; })}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${off ? 'border-slate-700 text-slate-500' : 'border-slate-600 text-slate-200'}`}
                  aria-pressed={!off}
                >
                  <span aria-hidden="true" className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
                  {key}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-2 h-64" role="img" aria-label="Line chart of per-query latency">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={distSeries} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="test" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'query #', position: 'insideBottomRight', fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#fff' }} formatter={(v) => (v === null ? ['failed', ''] : [`${v} ms`, ''])} />
              <Legend />
              {results.map((r, i) =>
                hidden.has(shortName(r.name)) ? null : (
                  <Line key={r.ip} type="monotone" dataKey={shortName(r.name)} stroke={BAR_COLORS[i % BAR_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                ),
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Example detail: {results[0] ? `${results[0].name} — avg ${fmt(results[0].average)}, median ${fmt(results[0].median)}` : ''}</p>
      </div>
    </section>
  );
}
