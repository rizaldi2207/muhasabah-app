import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import Today from './pages/Today.jsx';
import Activities from './pages/Activities.jsx';
import Recap from './pages/Recap.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Admin from './pages/Admin.jsx';
import Login from './pages/Login.jsx';
import { startReminderScheduler } from './lib/notify.js';
import { useAuth } from './auth.jsx';

const NAV = [
  { to: '/', label: 'Hari Ini', icon: '☀️', end: true },
  { to: '/rekap', label: 'Rekap', icon: '📿' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/kelola', label: 'Kelola', icon: '⚙️' },
];
const ADMIN_NAV = { to: '/admin', label: 'Admin', icon: '🛡️' };

function Emblem() {
  return (
    <span
      className="relative grid h-11 w-11 place-items-center rounded-2xl"
      style={{
        background: 'linear-gradient(150deg,#0f4f36,#06231b)',
        border: '1px solid var(--gold-soft)',
        boxShadow: '0 8px 22px -14px rgba(11,48,35,0.8)',
      }}
    >
      <svg viewBox="0 0 48 48" className="h-7 w-7">
        <defs>
          <linearGradient id="emg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e3c06a" />
            <stop offset="1" stopColor="#a07628" />
          </linearGradient>
        </defs>
        {/* bulan sabit */}
        <path
          d="M30 8a16 16 0 1 0 0 32 13 13 0 1 1 0-32z"
          fill="url(#emg)"
        />
        {/* bintang delapan */}
        <g transform="translate(33 14)" fill="url(#emg)">
          <path d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z" />
        </g>
      </svg>
    </span>
  );
}

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, setDark];
}

export default function App() {
  const [dark, setDark] = useDarkMode();
  const { user, loading, logout, isAdmin } = useAuth();

  useEffect(() => {
    // Aktifkan scheduler bila izin notifikasi sudah diberikan sebelumnya.
    if (user && 'Notification' in window && Notification.permission === 'granted') {
      startReminderScheduler();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="font-display italic text-stone-500">Memuat…</p>
      </div>
    );
  }

  // Belum login → tampilkan halaman masuk/daftar (tetap bisa ganti tema).
  if (!user) {
    return (
      <>
        <button
          onClick={() => setDark((d) => !d)}
          className="btn-ghost fixed right-4 top-4 z-30 h-9 w-9 !px-0 text-base"
          title="Ganti tema siang / malam"
        >
          {dark ? '☾' : '☀'}
        </button>
        <Login />
      </>
    );
  }

  const nav = isAdmin ? [...NAV, ADMIN_NAV] : NAV;

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-20 border-b bg-[#f6efe0]/80 backdrop-blur-md dark:bg-[#06231b]/80"
        style={{ borderColor: 'var(--gold-soft)' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Emblem />
            <div className="leading-tight">
              <h1 className="font-kufi text-lg font-bold gold-text">Muhasabah Harian</h1>
              <p className="font-display text-xs italic text-stone-500 dark:text-stone-400">
                Lebih baik dari hari kemarin
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 md:flex">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'text-white shadow-soft'
                        : 'text-stone-600 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-emerald-900/40'
                    }`
                  }
                  style={({ isActive }) =>
                    isActive
                      ? { background: 'linear-gradient(135deg,#136442,#0b3023)', border: '1px solid var(--gold-soft)' }
                      : undefined
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
            <button
              onClick={() => setDark((d) => !d)}
              className="btn-ghost h-9 w-9 !px-0 text-base"
              title="Ganti tema siang / malam"
            >
              {dark ? '☾' : '☀'}
            </button>

            <div className="flex items-center gap-2 border-l pl-2" style={{ borderColor: 'var(--gold-soft)' }}>
              <span className="hidden text-right sm:block">
                <span className="block text-sm font-semibold leading-tight">{user.name}</span>
                <span className="block text-[10px] uppercase tracking-wider text-gold-600 dark:text-gold-300">
                  {isAdmin ? 'Admin' : 'Pengguna'}
                </span>
              </span>
              <button onClick={logout} className="btn-ghost !px-3 !py-1.5 text-xs" title="Keluar">
                Keluar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/rekap" element={<Recap />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/kelola" element={<Activities />} />
          <Route path="/admin" element={isAdmin ? <Admin /> : <Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Navigasi bawah untuk mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-[#f6efe0]/95 backdrop-blur md:hidden dark:bg-[#06231b]/95"
        style={{ borderColor: 'var(--gold-soft)' }}>
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 font-display text-xs font-bold ${
                isActive ? 'text-gold-600 dark:text-gold-300' : 'text-stone-500 dark:text-stone-400'
              }`
            }
          >
            <span className="text-lg">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
