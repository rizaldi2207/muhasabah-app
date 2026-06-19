function tone(score) {
  if (score >= 80) return { stroke: '#136442', text: 'text-emerald-600' };
  if (score >= 50) return { stroke: '#c08a2e', text: 'text-amber-500' };
  return { stroke: '#b04a2c', text: 'text-red-500' };
}

function Ring({ score }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  const t = tone(score);
  return (
    <div className="relative grid h-28 w-28 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <defs>
          <linearGradient id="ringGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e3c06a" />
            <stop offset="1" stopColor={t.stroke} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--gold-soft)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="url(#ringGold)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`font-display text-3xl font-bold leading-none ${t.text}`}>{score}</span>
        <span className="text-[10px] uppercase tracking-widest text-stone-400">dari 100</span>
      </div>
    </div>
  );
}

export default function ScoreCard({ score = 0, label = 'Skor Hari Ini', sub, right }) {
  return (
    <div className="card mihrab flex items-center gap-5">
      <Ring score={score} />
      <div className="min-w-0">
        <p className="ornament-star font-display text-sm font-bold tracking-wide text-stone-600 dark:text-stone-300">
          {label}
        </p>
        {sub && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{sub}</p>}
        {right && <div className="mt-3">{right}</div>}
      </div>
    </div>
  );
}
