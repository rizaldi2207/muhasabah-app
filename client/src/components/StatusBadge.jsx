const COLORS = {
  green: {
    pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200',
    grad: 'linear-gradient(135deg,#1b7c52,#0b3023)',
    ink: '#e9f3ec',
  },
  amber: {
    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    grad: 'linear-gradient(135deg,#c08a2e,#5d3f18)',
    ink: '#faf0d8',
  },
  red: {
    pill: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    grad: 'linear-gradient(135deg,#b04a2c,#562016)',
    ink: '#f8e8e2',
  },
  slate: {
    pill: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    grad: 'linear-gradient(135deg,#3c4636,#13231d)',
    ink: '#efe5d2',
  },
};

const ICON = { beruntung: '🌟', merugi: '⚖️', celaka: '⚠️', start: '🌱' };

export default function StatusBadge({ status, size = 'md' }) {
  if (!status) return null;
  const c = COLORS[status.color] || COLORS.slate;

  if (size === 'lg') {
    return (
      <div
        className="mihrab relative overflow-hidden rounded-2xl p-6 text-center"
        style={{ background: c.grad, color: c.ink, border: '1px solid var(--gold-soft)' }}
      >
        {/* ornamen sudut bintang */}
        <span className="pointer-events-none absolute left-3 top-2 text-lg opacity-40" style={{ color: 'var(--gold-bright)' }}>۞</span>
        <span className="pointer-events-none absolute right-3 top-2 text-lg opacity-40" style={{ color: 'var(--gold-bright)' }}>۞</span>
        <div className="text-3xl">{ICON[status.key] || '•'}</div>
        <div className="mt-1 font-display text-2xl font-bold tracking-wide text-shadow-gold">{status.label}</div>
        <p className="mx-auto mt-2 max-w-md text-sm opacity-90">{status.message}</p>
        <div className="divider-ornament mx-auto mt-4 max-w-[200px]">۞</div>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${c.pill}`}
      style={{ borderColor: 'var(--gold-soft)' }}>
      <span>{ICON[status.key] || '•'}</span>
      {status.label}
    </span>
  );
}
