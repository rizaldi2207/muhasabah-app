import { useEffect, useMemo, useState } from 'react';
import { api, todayStr, NAMA_HARI, NAMA_BULAN } from '../api.js';
import ScoreCard from '../components/ScoreCard.jsx';
import {
  notificationSupported,
  requestNotificationPermission,
  startReminderScheduler,
  testNotification,
} from '../lib/notify.js';

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Tentukan status visual sebuah item di sisi klien (untuk hari ini).
function rowStatus(item) {
  if (item.done) {
    if (!item.target_time || !item.done_time) return 'done-ontime';
    return item.done_time <= addGrace(item.target_time) ? 'done-ontime' : 'done-late';
  }
  if (item.target_time) {
    const [h, m] = item.target_time.split(':').map(Number);
    const target = h * 60 + m + 15;
    const d = new Date();
    if (d.getHours() * 60 + d.getMinutes() > target) return 'missed';
  }
  return 'pending';
}
function addGrace(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  let total = h * 60 + m + 15;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

const DOT = {
  'done-ontime': 'bg-emerald-500',
  'done-late': 'bg-amber-500',
  missed: 'bg-red-500',
  pending: 'bg-stone-300 dark:bg-stone-600',
};

function ActivityRow({ item, date, onChange }) {
  const [note, setNote] = useState(item.note || '');
  const [noteOpen, setNoteOpen] = useState(false);
  const status = rowStatus(item);

  async function toggleDone() {
    const done = item.done ? 0 : 1;
    const done_time = done ? item.done_time || nowHHMM() : null;
    const saved = await api.saveLog({ activity_id: item.activity_id, date, done, done_time, note });
    onChange({ ...item, done, done_time: saved.done_time });
  }
  async function changeTime(e) {
    const done_time = e.target.value || null;
    const saved = await api.saveLog({
      activity_id: item.activity_id, date, done: 1, done_time, note,
    });
    onChange({ ...item, done: 1, done_time: saved.done_time });
  }
  async function saveNote() {
    await api.saveLog({
      activity_id: item.activity_id, date, done: item.done, done_time: item.done_time, note,
    });
    onChange({ ...item, note });
    setNoteOpen(false);
  }

  return (
    <div className="flex items-start gap-3 border-b border-stone-100 py-3 last:border-0 dark:border-stone-800">
      <button
        onClick={toggleDone}
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition ${
          item.done
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-stone-300 hover:border-emerald-500 dark:border-stone-600'
        }`}
        title="Tandai sudah dilakukan"
      >
        {item.done ? '✓' : ''}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[status]}`} />
          <span className={`font-medium ${item.done ? 'text-stone-500 line-through dark:text-stone-500' : ''}`}>
            {item.name}
          </span>
          {item.target_time && (
            <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
              🎯 {item.target_time}
            </span>
          )}
        </div>

        {item.done && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
              Jam dilakukan:
              <input
                type="time"
                value={item.done_time || ''}
                onChange={changeTime}
                className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-800"
              />
            </label>
            {status === 'done-late' && <span className="text-xs text-amber-600">terlambat</span>}
            {status === 'done-ontime' && <span className="text-xs text-emerald-600">tepat waktu</span>}
          </div>
        )}

        {noteOpen ? (
          <div className="mt-2 flex gap-2">
            <input
              className="input"
              value={note}
              placeholder="Catatan…"
              onChange={(e) => setNote(e.target.value)}
            />
            <button className="btn-primary" onClick={saveNote}>Simpan</button>
          </div>
        ) : (
          <button
            className="mt-1 text-xs text-stone-400 hover:text-emerald-600"
            onClick={() => setNoteOpen(true)}
          >
            {item.note ? `📝 ${item.note}` : '+ catatan'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Today() {
  const date = todayStr();
  const [items, setItems] = useState([]);
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifState, setNotifState] = useState(
    notificationSupported() ? Notification.permission : 'unsupported'
  );

  async function loadAll() {
    const [day, stat] = await Promise.all([api.getDay(date), api.daily(date)]);
    setItems(day.items);
    setDaily(stat);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saat item berubah, perbarui state lokal lalu refresh skor.
  function onItemChange(updated) {
    setItems((prev) => prev.map((it) => (it.activity_id === updated.activity_id ? updated : it)));
    api.daily(date).then(setDaily);
  }

  const grouped = useMemo(() => {
    const g = {};
    for (const it of items) {
      (g[it.category] = g[it.category] || []).push(it);
    }
    return g;
  }, [items]);

  async function enableReminders() {
    const res = await requestNotificationPermission();
    setNotifState(res);
    if (res === 'granted') {
      startReminderScheduler();
      testNotification();
    }
  }

  const d = new Date();
  const headerDate = `${NAMA_HARI[d.getDay()]}, ${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;

  if (loading) return <p className="text-stone-500">Memuat…</p>;

  const done = items.filter((i) => i.done).length;

  return (
    <div className="space-y-5">
      <div className="animate-rise text-center sm:text-left">
        <p className="font-arabic text-2xl text-gold-600 dark:text-gold-300" dir="rtl" lang="ar">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <p className="mt-1 font-display text-sm italic text-stone-500 dark:text-stone-400">{headerDate}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreCard
          score={daily?.score ?? 0}
          sub={`${done}/${items.length} kegiatan • ${daily?.ontime ?? 0} tepat waktu`}
        />
        <div className="card flex flex-col justify-between">
          <div>
            <p className="ornament-star font-display text-sm font-bold tracking-wide text-stone-600 dark:text-stone-300">Pengingat</p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
              {notifState === 'granted'
                ? 'Pengingat aktif. Notifikasi muncul saat aplikasi terbuka.'
                : notifState === 'unsupported'
                ? 'Browser ini tidak mendukung notifikasi.'
                : 'Aktifkan untuk diingatkan pada jam tiap kegiatan.'}
            </p>
          </div>
          {notifState !== 'granted' && notifState !== 'unsupported' && (
            <button className="btn-gold mt-3 self-start" onClick={enableReminders}>
              🔔 Aktifkan Pengingat
            </button>
          )}
        </div>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="card text-center text-stone-500">
          Belum ada kegiatan. Tambahkan di menu <strong>Kelola</strong>.
        </div>
      )}

      {Object.entries(grouped).map(([cat, list]) => (
        <div key={cat} className="card animate-rise">
          <h2 className="ornament-star mb-1 font-display text-base font-bold tracking-wide text-emerald-700 dark:text-emerald-300">
            {cat}
          </h2>
          {list.map((it) => (
            <ActivityRow key={it.activity_id} item={it} date={date} onChange={onItemChange} />
          ))}
        </div>
      ))}
    </div>
  );
}
