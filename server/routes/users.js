const express = require('express');
const db = require('../db');
const { seedForUser } = require('../seed');
const { hashPassword, publicUser, requireAuth, requireAdmin } = require('../lib/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Semua route di sini khusus admin.
router.use(requireAuth, requireAdmin);

// GET /api/users — daftar pengguna + ringkasan jumlah kegiatan.
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.active, u.created_at,
              (SELECT COUNT(*) FROM activities a WHERE a.user_id = u.id) AS activity_count
       FROM users u ORDER BY u.created_at DESC`
    )
    .all();
  res.json(rows);
});

// POST /api/users — admin membuat akun (boleh langsung set role).
router.post('/', (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const role = req.body.role === 'admin' ? 'admin' : 'user';

  if (!name) return res.status(400).json({ error: 'Nama wajib diisi.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Email tidak valid.' });
  if (password.length < 6) return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'Email sudah terdaftar.' });
  }

  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email, hashPassword(password), role);
  seedForUser(info.lastInsertRowid);
  res.status(201).json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)));
});

// PUT /api/users/:id — ubah nama / role / status aktif.
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

  const name = req.body.name !== undefined ? String(req.body.name).trim() || user.name : user.name;
  const role = req.body.role === 'admin' || req.body.role === 'user' ? req.body.role : user.role;
  const active = req.body.active === undefined ? user.active : req.body.active ? 1 : 0;

  // Jangan biarkan admin terakhir menurunkan/menonaktifkan dirinya sendiri.
  const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='admin' AND active=1").get().c;
  const demoting = user.role === 'admin' && (role !== 'admin' || active === 0);
  if (demoting && adminCount <= 1) {
    return res.status(400).json({ error: 'Tidak boleh menghapus admin aktif terakhir.' });
  }

  db.prepare('UPDATE users SET name=?, role=?, active=? WHERE id=?').run(name, role, active, id);
  res.json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)));
});

// PUT /api/users/:id/password — reset kata sandi.
router.put('/:id/password', (req, res) => {
  const id = Number(req.params.id);
  const password = req.body.password || '';
  if (password.length < 6) return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
  const info = db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(password), id);
  if (info.changes === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  res.json({ ok: true });
});

// DELETE /api/users/:id — hapus pengguna beserta datanya (cascade).
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri.' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

  const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='admin' AND active=1").get().c;
  if (user.role === 'admin' && adminCount <= 1) {
    return res.status(400).json({ error: 'Tidak boleh menghapus admin aktif terakhir.' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
