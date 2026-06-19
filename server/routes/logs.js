const express = require('express');
const db = require('../db');
const { isApplicable } = require('../lib/score');
const { requireAuth, effectiveUserId } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/logs?date=YYYY-MM-DD
// Daftar kegiatan yang berlaku pada tanggal tsb digabung status log-nya.
router.get('/', (req, res) => {
  const date = req.query.date;
  if (!date || !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'Parameter "date" (YYYY-MM-DD) wajib.' });
  }
  const userId = effectiveUserId(req);
  const activities = db
    .prepare('SELECT * FROM activities WHERE user_id = ? ORDER BY sort_order, id')
    .all(userId)
    .filter((a) => isApplicable(a, date));
  const logs = db.prepare('SELECT * FROM logs WHERE user_id = ? AND date = ?').all(userId, date);
  const logByActivity = new Map(logs.map((l) => [l.activity_id, l]));

  const items = activities.map((a) => {
    const log = logByActivity.get(a.id) || null;
    return {
      activity_id: a.id,
      name: a.name,
      category: a.category,
      target_time: a.target_time,
      type: a.type,
      weight: a.weight,
      done: log ? log.done : 0,
      done_time: log ? log.done_time : null,
      note: log ? log.note : null,
    };
  });
  res.json({ date, items });
});

// PUT /api/logs  -> upsert satu log harian
router.put('/', (req, res) => {
  const { activity_id, date } = req.body;
  if (!activity_id || !date || !DATE_RE.test(date)) {
    return res.status(400).json({ error: '"activity_id" dan "date" (YYYY-MM-DD) wajib.' });
  }
  // Pengguna hanya boleh menulis log untuk kegiatan miliknya sendiri.
  const activity = db
    .prepare('SELECT id FROM activities WHERE id = ? AND user_id = ?')
    .get(Number(activity_id), req.user.id);
  if (!activity) return res.status(404).json({ error: 'Kegiatan tidak ditemukan.' });

  const done = req.body.done ? 1 : 0;
  let done_time = req.body.done_time || null;
  if (done_time && !/^\d{2}:\d{2}$/.test(done_time)) done_time = null;
  if (!done) done_time = null; // jam dilakukan hanya bermakna jika sudah dilakukan
  const note = (req.body.note || '').toString().slice(0, 1000) || null;

  db.prepare(
    `INSERT INTO logs (user_id, activity_id, date, done, done_time, note, updated_at)
     VALUES (@user_id, @activity_id, @date, @done, @done_time, @note, datetime('now'))
     ON CONFLICT(activity_id, date) DO UPDATE SET
       done=excluded.done, done_time=excluded.done_time,
       note=excluded.note, updated_at=datetime('now')`
  ).run({ user_id: req.user.id, activity_id: Number(activity_id), date, done, done_time, note });

  res.json(db.prepare('SELECT * FROM logs WHERE activity_id = ? AND date = ?').get(Number(activity_id), date));
});

module.exports = router;
