import { useEffect, useState } from 'react';
import { api, todayStr } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';

const HADITS =
  '“Barang siapa yang hari ini lebih baik dari hari kemarin, maka ia tergolong orang yang ' +
  'beruntung. Barang siapa yang hari ini sama dengan hari kemarin, maka ia merugi. ' +
  'Barang siapa yang hari ini lebih buruk, maka ia celaka.”';

const ITEM_BADGE = {
  'done-ontime': { t: 'Tepat waktu', c: 'text-emerald-600' },
  'done-late': { t: 'Terlambat', c: 'text-amber-600' },
  missed: { t: 'Terlewat', c: 'text-red-600' },
  pending: { t: 'Belum', c: 'text-stone-400' },
};

export default function Recap() {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState(null);

  useEffect(() => {
    api.daily(date).then(setData);
  }, [date]);

  if (!data) return <p className="text-stone-500">Memuat…</p>;

  const delta = data.prevScore == null ? null : data.score - data.prevScore;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold tracking-wide">Rekap &amp; Muhasabah</h2>
        <input
          type="date"
          className="input max-w-[180px]"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <figure className="card mihrab relative overflow-hidden text-center">
        <span className="pointer-events-none absolute -left-2 -top-2 text-5xl opacity-10" style={{ color: 'var(--gold)' }}>۞</span>
        <span className="pointer-events-none absolute -bottom-3 -right-2 text-5xl opacity-10" style={{ color: 'var(--gold)' }}>۞</span>
        <div className="divider-ornament mb-3">۞</div>
        <blockquote className="mx-auto max-w-2xl font-display text-base italic leading-relaxed text-emerald-900 dark:text-emerald-100">
          {HADITS}
        </blockquote>
        <figcaption className="mt-2 text-xs uppercase tracking-widest text-gold-600 dark:text-gold-300">
          — HR. Al-Hakim
        </figcaption>
      </figure>

      <StatusBadge status={data.status} size="lg" />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <p className="text-xs text-stone-500">Skor hari ini</p>
          <p className="text-3xl font-bold text-emerald-600">{data.score}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-stone-500">Skor kemarin</p>
          <p className="text-3xl font-bold text-stone-400">{data.prevScore ?? '—'}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-stone-500">Selisih</p>
          <p className={`text-3xl font-bold ${delta == null ? 'text-stone-400' : delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-amber-600'}`}>
            {delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta}`}
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className="ornament-star mb-2 font-display text-base font-bold tracking-wide">Rincian kegiatan</h3>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {data.items.map((it) => {
            const badge = ITEM_BADGE[it.status] || ITEM_BADGE.pending;
            return (
              <div key={it.activity_id} className="flex items-center justify-between py-2 text-sm">
                <span className={it.done ? '' : 'text-stone-500'}>{it.name}</span>
                <span className="flex items-center gap-2">
                  {it.done_time && <span className="text-xs text-stone-400">{it.done_time}</span>}
                  <span className={`text-xs font-medium ${badge.c}`}>{badge.t}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
