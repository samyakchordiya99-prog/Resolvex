import Educational from '../components/Educational';

export default function LearnView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">📚</span>
          <h2 className="text-xl font-bold text-white tracking-tight">DNS Academy & Architecture</h2>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Understanding DNS resolution, recursive caches, Anycast networking, and why resolver response time matters.
        </p>
      </div>

      <Educational />
    </div>
  );
}

