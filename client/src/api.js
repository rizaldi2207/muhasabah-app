// --- Manajemen token ---
const TOKEN_KEY = 'mh_token';
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

// Dipanggil oleh AuthProvider saat sesi tidak valid (401) untuk memaksa logout.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// Wrapper fetch sederhana untuk semua panggilan ke /api (menyisipkan token).
async function request(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401 && onUnauthorized) onUnauthorized();
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Sisipkan ?userId untuk pemantauan admin (read-only).
function withUser(path, userId) {
  if (!userId) return path;
  return path + (path.includes('?') ? '&' : '?') + 'userId=' + userId;
}

export const api = {
  health: () => request('/api/health'),

  // auth
  register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/api/auth/me'),

  // users (admin)
  listUsers: () => request('/api/users'),
  createUser: (data) => request('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetPassword: (id, password) =>
    request(`/api/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),

  // activities (userId opsional: admin memantau user lain)
  listActivities: (userId) => request(withUser('/api/activities', userId)),
  createActivity: (data) => request('/api/activities', { method: 'POST', body: JSON.stringify(data) }),
  updateActivity: (id, data) =>
    request(`/api/activities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteActivity: (id) => request(`/api/activities/${id}`, { method: 'DELETE' }),

  // logs
  getDay: (date, userId) => request(withUser(`/api/logs?date=${date}`, userId)),
  saveLog: (data) => request('/api/logs', { method: 'PUT', body: JSON.stringify(data) }),

  // stats (userId opsional untuk pemantauan admin)
  daily: (date, userId) => request(withUser(`/api/stats/daily?date=${date}`, userId)),
  monthly: (year, month, userId) =>
    request(withUser(`/api/stats/monthly?year=${year}&month=${month}`, userId)),
  yearly: (year, userId) => request(withUser(`/api/stats/yearly?year=${year}`, userId)),
  compare: (type, userId) => request(withUser(`/api/stats/compare?type=${type}`, userId)),
};

// util tanggal lokal -> "YYYY-MM-DD"
export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
