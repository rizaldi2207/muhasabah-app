import { useEffect, useMemo, useState } from 'react';
import { api, todayStr, NAMA_BULAN } from '../api.js';
import { TrendLine, ScoreBars } from '../components/Charts.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const TABS = [
  { key: 'harian', label: 'Harian' },
  { key: 'bulanan', label: 'Bulanan' },
  { key: 'tahunan', label: 'Tahunan' },
];

function StatTile({ label, value, suffix = '' }) {
  return (
    <div className="card text-center">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-emerald-600">
        {value == null ? '—' : value}
        {value != null && suffix}
      </p>
    </div>
  );
}

// ---- Tab Harian: tren 30 hari terakhir ----
function HarianTab() {
  const [series, setSeries] = useState([]);
  const [today, setToday] = useState(null);

  useEffect(() => {
    (async () => {
      const t = todayStr();
      setToday(await api.daily(t));
      // Ambil 30 hari terakhir via endpoint bulanan (gabung bulan ini & lalu bila perlu).
      const now = new Date();
      const points = [];
      for (let i = 29; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        points.push({ date: todayStr(d) });
      }
      // panggil daily untuk tiap titik bisa berat; pakai monthly lalu petakan.
      const months = {};
      for (const p of points) {
        const [y, m] = p.date.split('-');
        months[`${y}-${m}`] = { year: Number(y), month: Number(m) };
      }
      const results = await Promise.all(
        Object.values(months).map((mm) => api.monthly(mm.year, mm.month))
      );
      const scoreByDate = {};
      results.forEach((r) => r.series.forEach((s) => { scoreByDate[s.date] = s.score; }));
      setSeries(points.map((p) => ({
        label: p.date.slice(8),
        date: p.date,
        score: scoreByDate[p.date] ?? 0,
      })));
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Skor hari ini" value={today?.score} />
        <StatTile label="Skor kemarin" value={today?.prevScore} />
        <div className="sm:col-span-1">{today && <StatusBadge status={today.status} />}</div>
      </div>
      <div className="card">
        <h3 className="ornament-star mb-3 font-display text-base font-bold tracking-wide">Tren 30 hari terakhir</h3>
        <TrendLine data={series} xKey="label" yKey="score" />
      </div>
    </div>
  );
}

// ---- Tab Bulanan ----
function BulananTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);

  useEffect(() => {
    api.monthly(year, month).then(setData);
  }, [year, month]);

  const chartData = useMemo(
    () => (data ? data.series.map((s) => ({ label: s.date.slice(8), score: s.score })) : []),
    [data]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input max-w-[150px]" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {NAMA_BULAN.map((nama, i) => (
            <option key={i} value={i + 1}>{nama}</option>
          ))}
        </select>
        <select className="input max-w-[110px]" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Rata-rata bulan ini" value={data?.average} />
        <StatTile label="Rata-rata bulan lalu" value={data?.prevAverage} />
        <div>{data && <StatusBadge status={data.status} />}</div>
      </div>

      <div className="card">
        <h3 className="ornament-star mb-3 font-display text-base font-bold tracking-wide">Skor harian — {NAMA_BULAN[month - 1]} {year}</h3>
        <TrendLine data={chartData} xKey="label" yKey="score" />
      </div>

      <div className="card">
        <h3 className="ornament-star mb-3 font-display text-base font-bold tracking-wide">Konsistensi per kegiatan</h3>
        <div className="space-y-2">
          {data?.consistency.map((c) => (
            <div key={c.activity_id} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-sm">{c.name}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${c.percent}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right text-xs text-stone-500">
                {c.percent}% ({c.done}/{c.applicable})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Tab Tahunan ----
function TahunanTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [compare, setCompare] = useState([]);

  useEffect(() => {
    api.yearly(year).then(setData);
  }, [year]);
  useEffect(() => {
    api.compare('year').then((r) => setCompare(r.data));
  }, []);

  const monthBars = useMemo(
    () => (data ? data.months.map((m) => ({ label: NAMA_BULAN[m.month - 1].slice(0, 3), average: m.average })) : []),
    [data]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select className="input max-w-[110px]" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label={`Rata-rata ${year}`} value={data?.average} />
        <StatTile label={`Rata-rata ${year - 1}`} value={data?.prevAverage} />
        <div>{data && <StatusBadge status={data.status} />}</div>
      </div>

      <div className="card">
        <h3 className="ornament-star mb-3 font-display text-base font-bold tracking-wide">Rata-rata skor per bulan — {year}</h3>
        <ScoreBars data={monthBars} xKey="label" yKey="average" refValue={data?.average} />
      </div>

      <div className="card">
        <h3 className="ornament-star mb-3 font-display text-base font-bold tracking-wide">Perbandingan antar tahun</h3>
        <ScoreBars data={compare} xKey="label" yKey="average" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState('harian');
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-900">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 font-display text-sm font-bold tracking-wide transition ${
              tab === t.key
                ? 'bg-white text-emerald-700 shadow-soft dark:bg-emerald-900/60 dark:text-gold-300'
                : 'text-stone-500'
            }`}
            style={tab === t.key ? { border: '1px solid var(--gold-soft)' } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'harian' && <HarianTab />}
      {tab === 'bulanan' && <BulananTab />}
      {tab === 'tahunan' && <TahunanTab />}
    </div>
  );
}
