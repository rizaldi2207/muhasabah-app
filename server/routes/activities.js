const express = require('express');
const db = require('../db');
const { requireAuth, effectiveUserId } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

const VALID_TYPES = ['daily', 'weekly'];

function normalize(body) {
  const name = (body.name || '').trim();
  const category = (body.category || 'Lainnya').trim() || 'Lainnya';
  let target_time = body.target_time || null;
  if (target_time && !/^\d{2}:\d{2}$/.test(target_time)) target_time = null;
  const type = VALID_TYPES.includes(body.type) ? body.type : 'daily';
  let days_of_week = null;
  if (type === 'weekly' && Array.isArray(body.days_of_week) && body.days_of_week.length) {
    days_of_week = body.days_of_week
      .map((d) => Number(d))
      .filter((d) => d >= 0 && d <= 6)
      .join(',');
  } else if (type === 'weekly' && typeof body.days_of_week === 'string' && body.days_of_week) {
    days_of_week = body.days_of_week;
  }
  const weight = Math.max(1, Math.min(10, parseInt(body.weight, 10) || 1));
  const active = body.active === 0 || body.active === false ? 0 : 1;
  return { name, category, target_time, type, days_of_week, weight, active };
}

// GET semua kegiatan milik pengguna (admin boleh lihat user lain via ?userId=)
router.get('/', (req, res) => {
  const userId = effectiveUserId(req);
  const rows = db.prepare('SELECT * FROM activities WHERE user_id = ? ORDER BY sort_order, id').all(userId);
  res.json(rows);
});

// POST kegiatan baru
router.post('/', (req, res) => {
  const data = normalize(req.body);
  if (!data.name) return res.status(400).json({ error: 'Nama kegiatan wajib diisi.' });

  const user_id = req.user.id;
  const max = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM activities WHERE user_id = ?')
    .get(user_id).m;
  const info = db
    .prepare(
      `INSERT INTO activities (user_id, name, category, target_time, type, days_of_week, weight, sort_order, active)
       VALUES (@user_id, @name, @category, @target_time, @type, @days_of_week, @weight, @sort_order, @active)`
    )
    .run({ ...data, user_id, sort_order: max + 1 });
  const row = db.prepare('SELECT * FROM activities WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

// PUT update kegiatan
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM activities WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Kegiatan tidak ditemukan.' });

  const data = normalize({ ...existing, ...req.body });
  if (!data.name) return res.status(400).json({ error: 'Nama kegiatan wajib diisi.' });

  const sort_order =
    req.body.sort_order !== undefined ? Number(req.body.sort_order) : existing.sort_order;

  db.prepare(
    `UPDATE activities SET name=@name, category=@category, target_time=@target_time,
       type=@type, days_of_week=@days_of_week, weight=@weight, active=@active, sort_order=@sort_order
     WHERE id=@id AND user_id=@user_id`
  ).run({ ...data, sort_order, id, user_id: req.user.id });

  res.json(db.prepare('SELECT * FROM activities WHERE id = ?').get(id));
});

// DELETE kegiatan (log terkait ikut terhapus via ON DELETE CASCADE)
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM activities WHERE id = ? AND user_id = ?').run(id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Kegiatan tidak ditemukan.' });
  res.json({ ok: true });
});

module.exports = router;
