import { useEffect, useMemo, useState } from 'react';
import { api, todayStr, NAMA_BULAN } from '../api.js';
import { useAuth } from '../auth.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ScoreCard from '../components/ScoreCard.jsx';
import { TrendLine } from '../components/Charts.jsx';

const EMPTY = { name: '', email: '', password: '', role: 'user' };

function UserForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <form
      className="card space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        try {
          await onSubmit(form);
        } catch (err) {
          setError(err.message);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Nama</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} required />
        </div>
        <div>
          <label className="label">Kata sandi</label>
          <input type="text" className="input" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min. 6 karakter" required />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={(e) => set('role', e.target.value)}>
            <option value="user">Pengguna</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary">Buat Akun</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Batal</button>
      </div>
    </form>
  );
}

// Pemantauan progres pengguna (read-only) memakai userId.
function MonitorPanel({ user, onClose }) {
  const now = new Date();
  const [daily, setDaily] = useState(null);
  const [series, setSeries] = useState([]);

  useEffect(() => {
    const t = todayStr();
    api.daily(t, user.id).then(setDaily);
    api.monthly(now.getFullYear(), now.getMonth() + 1, user.id).then((r) =>
      setSeries(r.series.map((s) => ({ label: s.date.slice(8), score: s.score })))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  return (
    <div className="card space-y-4 ring-1 ring-gold-300/40">
      <div className="flex items-center justify-between">
        <h3 className="ornament-star font-display text-base font-bold tracking-wide">
          Progres {user.name}
        </h3>
        <button className="btn-ghost !px-3 !py-1 text-xs" onClick={onClose}>Tutup</button>
      </div>
      {daily && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ScoreCard score={daily.score} label="Skor Hari Ini" sub={`${daily.completed}/${daily.total} kegiatan`} />
          <div className="flex items-center">{<StatusBadge status={daily.status} size="lg" />}</div>
        </div>
      )}
      <div>
        <p className="mb-2 text-xs text-stone-500">Tren {NAMA_BULAN[now.getMonth()]} {now.getFullYear()}</p>
        <TrendLine data={series} xKey="label" yKey="score" height={200} />
      </div>
    </div>
  );
}

export default function Admin() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [monitor, setMonitor] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setUsers(await api.listUsers());
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function createUser(form) {
    await api.createUser(form);
    setCreating(false);
    load();
  }
  async function toggleRole(u) {
    await api.updateUser(u.id, { role: u.role === 'admin' ? 'user' : 'admin' });
    load();
  }
  async function toggleActive(u) {
    await api.updateUser(u.id, { active: u.active ? 0 : 1 });
    load();
  }
  async function resetPw(u) {
    const pw = prompt(`Kata sandi baru untuk ${u.name} (min. 6 karakter):`);
    if (!pw) return;
    try {
      await api.resetPassword(u.id, pw);
      alert('Kata sandi berhasil diubah.');
    } catch (e) {
      alert(e.message);
    }
  }
  async function remove(u) {
    if (!confirm(`Hapus ${u.name} beserta seluruh datanya?`)) return;
    try {
      await api.deleteUser(u.id);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const inactive = users.filter((u) => !u.active).length;
    return { total, admins, users: total - admins, inactive };
  }, [users]);

  if (loading) return <p className="text-stone-500">Memuat…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold tracking-wide">🛡️ Panel Admin</h2>
        {!creating && <button className="btn-primary" onClick={() => setCreating(true)}>+ Tambah Pengguna</button>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Total', stats.total],
          ['Pengguna', stats.users],
          ['Admin', stats.admins],
          ['Nonaktif', stats.inactive],
        ].map(([k, v]) => (
          <div key={k} className="card text-center">
            <p className="text-xs text-stone-500">{k}</p>
            <p className="font-display text-2xl font-bold text-emerald-600">{v}</p>
          </div>
        ))}
      </div>

      {creating && <UserForm onSubmit={createUser} onCancel={() => setCreating(false)} />}

      {monitor && <MonitorPanel user={monitor} onClose={() => setMonitor(null)} />}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-stone-400" style={{ borderColor: 'var(--gold-soft)' }}>
              <th className="py-2 pr-3 font-display">Nama</th>
              <th className="px-3 py-2 font-display">Email</th>
              <th className="px-3 py-2 font-display">Role</th>
              <th className="px-3 py-2 font-display">Status</th>
              <th className="px-3 py-2 text-right font-display">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0" style={{ borderColor: 'var(--gold-soft)' }}>
                <td className="py-2.5 pr-3 font-medium">
                  {u.name}
                  {u.id === me.id && <span className="ml-1 text-xs text-stone-400">(Anda)</span>}
                </td>
                <td className="px-3 py-2.5 text-stone-500">{u.email}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.role === 'admin' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200' : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300'}`}>
                    {u.role === 'admin' ? 'Admin' : 'Pengguna'}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={u.active ? 'text-emerald-600' : 'text-red-500'}>
                    {u.active ? '● Aktif' : '○ Nonaktif'}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap justify-end gap-1.5 text-xs">
                    <button className="text-gold-600 hover:underline dark:text-gold-300" onClick={() => setMonitor(u)}>Pantau</button>
                    <button className="text-stone-500 hover:underline" onClick={() => toggleRole(u)}>{u.role === 'admin' ? '→user' : '→admin'}</button>
                    <button className="text-stone-500 hover:underline" onClick={() => toggleActive(u)}>{u.active ? 'nonaktif' : 'aktif'}</button>
                    <button className="text-stone-500 hover:underline" onClick={() => resetPw(u)}>reset pw</button>
                    {u.id !== me.id && <button className="text-red-500 hover:underline" onClick={() => remove(u)}>hapus</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
