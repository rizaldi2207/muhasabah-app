import { useEffect, useState } from 'react';
import { api, NAMA_HARI } from '../api.js';

const KATEGORI = ['Ibadah Wajib', 'Ibadah Sunnah', 'Rutinitas', 'Lainnya'];

const EMPTY = {
  name: '',
  category: 'Ibadah Sunnah',
  target_time: '',
  type: 'daily',
  days_of_week: [],
  weight: 1,
  active: 1,
};

function ActivityForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function toggleDay(d) {
    const days = form.days_of_week.includes(d)
      ? form.days_of_week.filter((x) => x !== d)
      : [...form.days_of_week, d];
    set('days_of_week', days);
  }

  return (
    <form
      className="card space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Nama kegiatan</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Kategori</label>
          <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {KATEGORI.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Jam target</label>
          <input type="time" className="input" value={form.target_time || ''} onChange={(e) => set('target_time', e.target.value)} />
        </div>
        <div>
          <label className="label">Bobot (1–10)</label>
          <input type="number" min="1" max="10" className="input" value={form.weight} onChange={(e) => set('weight', Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Tipe</label>
          <select className="input" value={form.type} onChange={(e) => set('type', e.target.value)}>
            <option value="daily">Setiap hari</option>
            <option value="weekly">Hari tertentu</option>
          </select>
        </div>
      </div>

      {form.type === 'weekly' && (
        <div>
          <label className="label">Pilih hari</label>
          <div className="flex flex-wrap gap-1.5">
            {NAMA_HARI.map((nama, i) => (
              <button
                type="button"
                key={i}
                onClick={() => toggleDay(i)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  form.days_of_week.includes(i)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                }`}
              >
                {nama.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!form.active} onChange={(e) => set('active', e.target.checked ? 1 : 0)} />
        Aktif
      </label>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary">Simpan</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Batal</button>
      </div>
    </form>
  );
}

export default function Activities() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null); // id, 'new', atau null
  const [loading, setLoading] = useState(true);

  async function load() {
    setList(await api.listActivities());
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(form) {
    const payload = {
      ...form,
      target_time: form.target_time || null,
      days_of_week: form.type === 'weekly' ? form.days_of_week : null,
    };
    if (editing === 'new') {
      await api.createActivity(payload);
    } else {
      await api.updateActivity(editing, payload);
    }
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Hapus kegiatan ini? Semua riwayatnya ikut terhapus.')) return;
    await api.deleteActivity(id);
    load();
  }

  async function toggleActive(a) {
    await api.updateActivity(a.id, { ...a, active: a.active ? 0 : 1 });
    load();
  }

  function editInitial(a) {
    return {
      ...a,
      target_time: a.target_time || '',
      days_of_week: a.days_of_week ? a.days_of_week.split(',').map(Number) : [],
    };
  }

  if (loading) return <p className="text-stone-500">Memuat…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold tracking-wide">Kelola Kegiatan</h2>
        {editing === null && (
          <button className="btn-primary" onClick={() => setEditing('new')}>+ Tambah</button>
        )}
      </div>

      {editing === 'new' && (
        <ActivityForm initial={EMPTY} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />
      )}

      <div className="card divide-y divide-stone-100 dark:divide-stone-800">
        {list.length === 0 && <p className="py-4 text-center text-stone-500">Belum ada kegiatan.</p>}
        {list.map((a) =>
          editing === a.id ? (
            <div key={a.id} className="py-2">
              <ActivityForm initial={editInitial(a)} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />
            </div>
          ) : (
            <div key={a.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${a.active ? '' : 'text-stone-400 line-through'}`}>{a.name}</span>
                  <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-500 dark:bg-stone-800">{a.category}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-stone-400">
                  {a.target_time && <span>🎯 {a.target_time}</span>}
                  <span>bobot {a.weight}</span>
                  <span>{a.type === 'weekly' ? 'mingguan' : 'harian'}</span>
                </div>
              </div>
              <button className="text-xs text-stone-400 hover:text-emerald-600" onClick={() => toggleActive(a)}>
                {a.active ? 'nonaktifkan' : 'aktifkan'}
              </button>
              <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setEditing(a.id)}>Edit</button>
              <button className="text-xs text-red-500 hover:underline" onClick={() => remove(a.id)}>Hapus</button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
