const express = require('express');
const db = require('../db');
const { seedForUser } = require('../seed');
const {
  hashPassword,
  comparePassword,
  signToken,
  publicUser,
  requireAuth,
} = require('../lib/auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register — pendaftaran mandiri (role selalu 'user').
router.post('/register', (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!name) return res.status(400).json({ error: 'Nama wajib diisi.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Email tidak valid.' });
  if (password.length < 6) return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Email sudah terdaftar.' });

  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email, hashPassword(password), 'user');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  seedForUser(user.id); // beri 14 kegiatan default

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !comparePassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email atau kata sandi salah.' });
  }
  if (!user.active) return res.status(403).json({ error: 'Akun dinonaktifkan. Hubungi admin.' });

  res.json({ token: signToken(user), user: publicUser(user) });
});

// GET /api/auth/me — profil pengguna saat ini.
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
