import { useState } from 'react';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm animate-rise">
        {/* Emblem */}
        <div className="mb-6 text-center">
          <div
            className="mx-auto grid h-16 w-16 place-items-center rounded-2xl"
            style={{
              background: 'linear-gradient(150deg,#0f4f36,#06231b)',
              border: '1px solid var(--gold-soft)',
              boxShadow: '0 12px 30px -16px rgba(11,48,35,0.9)',
            }}
          >
            <svg viewBox="0 0 48 48" className="h-10 w-10">
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#e3c06a" />
                  <stop offset="1" stopColor="#a07628" />
                </linearGradient>
              </defs>
              <path d="M30 8a16 16 0 1 0 0 32 13 13 0 1 1 0-32z" fill="url(#lg)" />
              <g transform="translate(33 14)" fill="url(#lg)">
                <path d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z" />
              </g>
            </svg>
          </div>
          <h1 className="mt-3 font-kufi text-2xl font-bold gold-text">Muhasabah Harian</h1>
          <p className="font-display text-sm italic text-stone-500 dark:text-stone-400">
            {mode === 'login' ? 'Masuk untuk melanjutkan amal' : 'Buat akun, mulai perjalananmu'}
          </p>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          <div className="divider-ornament">۞</div>

          {mode === 'register' && (
            <div>
              <label className="label">Nama</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Nama lengkap"
                required
              />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="email@contoh.com"
              required
            />
          </div>
          <div>
            <label className="label">Kata sandi</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder={mode === 'register' ? 'Minimal 6 karakter' : '••••••••'}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          <button type="submit" className="btn-gold w-full" disabled={busy}>
            {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}
          </button>

          <p className="text-center text-sm text-stone-500 dark:text-stone-400">
            {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
            <button
              type="button"
              className="font-semibold text-emerald-700 hover:underline dark:text-gold-300"
              onClick={() => {
                setMode((m) => (m === 'login' ? 'register' : 'login'));
                setError('');
              }}
            >
              {mode === 'login' ? 'Daftar di sini' : 'Masuk di sini'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
