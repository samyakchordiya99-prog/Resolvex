import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface BaselinePoint {
  name: string;
  current: number;
  baseline: number;
}

/** Current-run average vs historical baseline per provider (same domain). */
export default function BaselineChart({ data }: { data: BaselinePoint[] }) {
  return (
    <div className="mt-2 h-56" role="img" aria-label="Bar chart comparing current average latency to historical baseline">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#fff' }} formatter={(v) => [`${v} ms`, '']} />
          <Legend />
          <Bar dataKey="current" name="This run" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.current > 1.5 * d.baseline ? '#fbbf24' : '#22d3ee'} />
            ))}
          </Bar>
          <Bar dataKey="baseline" name="Baseline" fill="#64748b" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
