const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const db = require('./db');
const { seedForUser } = require('./seed');
const { hashPassword, requireAuth } = require('./lib/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Buat admin awal bila belum ada pengguna sama sekali.
function ensureInitialAdmin() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (count > 0) return;
  const name = process.env.ADMIN_NAME || 'Administrator';
  const email = (process.env.ADMIN_EMAIL || 'admin@muhasabah.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email, hashPassword(password), 'admin');
  seedForUser(info.lastInsertRowid);
  console.log(`Admin awal dibuat: ${email} (ganti kata sandinya setelah login).`);
}
ensureInitialAdmin();

// Healthcheck (dipakai Docker healthcheck).
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: db.DB_PATH, time: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/stats', require('./routes/stats'));

// Ekspor data milik pengguna saat ini (JSON) untuk cadangan.
app.get('/api/export', requireAuth, (req, res) => {
  const activities = db
    .prepare('SELECT * FROM activities WHERE user_id = ? ORDER BY sort_order, id')
    .all(req.user.id);
  const logs = db
    .prepare('SELECT * FROM logs WHERE user_id = ? ORDER BY date, activity_id')
    .all(req.user.id);
  res.json({ exportedAt: new Date().toISOString(), activities, logs });
});

// Sajikan frontend hasil build jika tersedia (mode produksi single-container).
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handler sederhana.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan server.' });
});

app.listen(PORT, () => {
  console.log(`API berjalan di http://localhost:${PORT}  (DB: ${db.DB_PATH})`);
});
