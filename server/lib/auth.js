const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'ubah-rahasia-ini-di-produksi';
const TOKEN_TTL = '30d';

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}
function comparePassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Bentuk data pengguna yang aman dikirim ke klien (tanpa hash).
function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, created_at: u.created_at };
}

// Middleware: wajib login. Memuat req.user dari DB & memastikan akun aktif.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Belum login.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Akun tidak ditemukan.' });
    if (!user.active) return res.status(403).json({ error: 'Akun dinonaktifkan.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Sesi tidak valid atau kedaluwarsa.' });
  }
}

// Middleware: wajib admin (dipasang setelah requireAuth).
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Khusus admin.' });
  }
  next();
}

// Tentukan userId efektif: admin boleh melihat data pengguna lain via ?userId=.
function effectiveUserId(req) {
  const q = req.query.userId;
  if (q && req.user.role === 'admin') return Number(q);
  return req.user.id;
}

module.exports = {
  hashPassword,
  comparePassword,
  signToken,
  publicUser,
  requireAuth,
  requireAdmin,
  effectiveUserId,
  JWT_SECRET,
};
